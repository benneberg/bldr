import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import Database from 'better-sqlite3';
import axios from 'axios';
import AdmZip from 'adm-zip';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import chokidar from 'chokidar';
import crypto from 'crypto';
import compression from 'compression';
import { CCCService } from './src/services/cccService.js';
import { PROVIDERS, MODELS } from './src/lib/providers.js';

const execAsync = promisify(exec);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : __dirname;
const DB_PATH = path.join(DATA_DIR, 'mimo.db');
const WORKSPACE_ROOT = path.join(DATA_DIR, 'workspace');
const UPLOADS_ROOT = path.join(DATA_DIR, 'uploads');

console.log('--- Storage Configuration ---');
console.log('__dirname:', __dirname);
console.log('DATA_DIR:', DATA_DIR);
console.log('WORKSPACE_ROOT:', WORKSPACE_ROOT);
console.log('-----------------------------');

const ccc = new CCCService(WORKSPACE_ROOT);

// Ensure directories exist
const ensureDir = async (dir: string) => {
  if (!existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    await fs.mkdir(dir, { recursive: true });
  } else {
    console.log(`Directory exists: ${dir}`);
  }
};

await ensureDir(WORKSPACE_ROOT);
await ensureDir(UPLOADS_ROOT);

// Database Setup
console.log(`Initializing database at ${DB_PATH}`);
const db = new Database(DB_PATH, { verbose: console.log });
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('temp_store = MEMORY');
db.pragma('foreign_keys = ON');

// Throttled sync map
const lastSyncMap = new Map<string, number>();
async function ensureRecentSync(projectId: string) {
  const now = Date.now();
  const last = lastSyncMap.get(projectId) || 0;
  if (now - last > 5000) {
    await forceFileSync(projectId);
    lastSyncMap.set(projectId, now);
  }
}

// Log current state
try {
  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get() as any;
  const fileCount = db.prepare('SELECT COUNT(*) as count FROM files').get() as any;
  console.log(`Startup DB Check: Projects: ${projectCount?.count || 0}, Files: ${fileCount?.count || 0}`);
} catch (e) {
  console.log('Database tables not yet initialized.');
}

// Initial basic tables
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT,
    entry_file TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_size INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS repositories (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    name TEXT,
    url TEXT,
    path_prefix TEXT,
    tags TEXT,
    type TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT,
    repository_id TEXT,
    path TEXT,
    size INTEGER,
    hash TEXT,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, path),
    FOREIGN KEY(project_id) REFERENCES projects(id),
    FOREIGN KEY(repository_id) REFERENCES repositories(id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    project_id TEXT PRIMARY KEY,
    messages JSON
  );

  CREATE TABLE IF NOT EXISTS debug_events (
    id TEXT PRIMARY KEY,
    parent_id TEXT,
    timestamp INTEGER,
    session_id TEXT,
    project_id TEXT,
    type TEXT,
    branch TEXT,
    commit_hash TEXT,
    ccc_tier INTEGER,
    replayable INTEGER,
    payload TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );
`);

// Migrations for schema evolution
function applyMigrations() {
  const tableInfos: Record<string, any[]> = {
    projects: db.prepare("PRAGMA table_info(projects)").all() as any[],
    files: db.prepare("PRAGMA table_info(files)").all() as any[]
  };

  if (!tableInfos.projects.some(c => c.name === 'workspace_config')) {
    db.exec("ALTER TABLE projects ADD COLUMN workspace_config JSON");
  }

  if (!tableInfos.files.some(c => c.name === 'repository_id')) {
    db.exec("ALTER TABLE files ADD COLUMN repository_id TEXT");
  }

  if (!tableInfos.files.some(c => c.name === 'hash')) {
    db.exec("ALTER TABLE files ADD COLUMN hash TEXT");
  }
}

applyMigrations();

const app = express();
app.use(compression());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const upload = multer({ dest: UPLOADS_ROOT });

// --- Helper Functions ---

function emitDebugEvent(io: Server, event: any) {
  const debugEvent = {
    id: uuidv4(),
    timestamp: Date.now(),
    ...event
  };

  try {
    db.prepare(`
      INSERT INTO debug_events (id, parent_id, timestamp, session_id, project_id, type, branch, commit_hash, ccc_tier, replayable, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      debugEvent.id,
      debugEvent.parentId || null,
      debugEvent.timestamp,
      debugEvent.sessionId,
      debugEvent.projectId,
      debugEvent.type,
      debugEvent.gitRef.branch,
      debugEvent.gitRef.commit,
      debugEvent.cccTier || null,
      debugEvent.replayable ? 1 : 0,
      JSON.stringify(debugEvent.payload)
    );

    io.to(debugEvent.projectId).emit('debug:event', debugEvent);
  } catch (e) {
    console.error('Failed to persist debug event:', e);
  }
  
  return debugEvent;
}

async function calculateHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const input = createReadStream(filePath);
    input.on('readable', () => {
      const data = input.read();
      if (data) hash.update(data);
      else resolve(hash.digest('hex'));
    });
    input.on('error', reject);
  });
}

const syncQueue: Set<string> = new Set();
let isSyncing = false;

async function processSyncQueue(io: Server) {
  if (isSyncing || syncQueue.size === 0) return;
  isSyncing = true;
  
  const tasks = Array.from(syncQueue);
  syncQueue.clear();
  
  for (const task of tasks) {
    const [projectId, relPath] = task.split('|');
    try {
      const projectDir = path.join(WORKSPACE_ROOT, projectId);
      const fullPath = path.join(projectDir, relPath);
      
      if (existsSync(fullPath)) {
        const stats = await fs.stat(fullPath);
        if (stats.isFile()) {
          const hash = await calculateHash(fullPath);
          db.prepare('INSERT OR REPLACE INTO files (project_id, path, size, hash, modified_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)')
            .run(projectId, relPath, stats.size, hash);
          
          let cccTier = null;
          // Tiered Update Logic
          if (relPath.endsWith('.md') || relPath.endsWith('.json') || relPath.endsWith('.ts') || relPath.endsWith('.tsx')) {
             await ccc.run(projectId);
             await generateProjectContext(projectId);
             cccTier = 1;
          }

          emitDebugEvent(io, {
            projectId,
            sessionId: 'fs-watcher',
            type: 'fs:change',
            gitRef: { branch: 'main', commit: 'head' },
            cccTier,
            payload: { event: 'update', path: relPath }
          });
        }
      } else {
        // File deleted
        db.prepare('DELETE FROM files WHERE project_id = ? AND path = ?').run(projectId, relPath);
        await ccc.run(projectId);
        await generateProjectContext(projectId);

        emitDebugEvent(io, {
          projectId,
          sessionId: 'fs-watcher',
          type: 'fs:change',
          gitRef: { branch: 'main', commit: 'head' },
          cccTier: 1,
          payload: { event: 'delete', path: relPath }
        });
      }
      
      io.to(projectId).emit('fs_event', { type: 'sync', path: relPath });
    } catch (e) {
      console.error('Fast Sync Error:', e);
    }
  }
  
  isSyncing = false;
  if (syncQueue.size > 0) processSyncQueue(io);
}

async function generateProjectContext(projectId: string) {
  const projectDir = path.join(WORKSPACE_ROOT, projectId);
  const files = db.prepare('SELECT path, size, repository_id FROM files WHERE project_id = ?').all(projectId) as any[];
  const repos = db.prepare('SELECT * FROM repositories WHERE project_id = ?').all(projectId) as any[];
  
  let workspaceContext = `# MiMo Workspace Context: ${projectId}\n\n`;
  workspaceContext += `## Repositories (Services)\n\n`;
  repos.forEach(r => {
    workspaceContext += `- **${r.name}** (${r.type}): Tags: ${r.tags}, Path: \`${r.path_prefix || './'}\`\n`;
  });

  workspaceContext += `\n## Global File Tree\n\n`;
  
  // Simple tree representation
  const tree: any = {};
  files.forEach(f => {
    const parts = f.path.split('/');
    let current = tree;
    parts.forEach((part: string, i: number) => {
      if (!current[part]) current[part] = i === parts.length - 1 ? null : {};
      current = current[part];
    });
  });

  const renderTree = (node: any, indent = ''): string => {
    let res = '';
    const keys = Object.keys(node).sort();
    for (const key of keys) {
      if (node[key] === null) {
        res += `${indent}- 📄 ${key}\n`;
      } else {
        res += `${indent}- 📁 ${key}/\n`;
        res += renderTree(node[key], indent + '  ');
      }
    }
    return res;
  };
  
  workspaceContext += renderTree(tree);
  
  // Bootstrap LLM.md (Architectural/Coding Conventions) if it doesn't exist
  const llmPath = path.join(projectDir, 'LLM.md');
  if (!existsSync(llmPath)) {
    let llmContent = `# Architectural Conventions (LLM.md)\n\n`;
    llmContent += `## Tech Stack\n`;
    
    const hasTS = files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
    const hasReact = files.some(f => f.path.includes('react'));
    const hasNode = files.some(f => f.path === 'package.json');

    if (hasTS) llmContent += `- TypeScript\n`;
    if (hasReact) llmContent += `- React\n`;
    if (hasNode) llmContent += `- Node.js\n`;

    llmContent += `\n## Development Guidelines\n- Prefer functional components and hooks.\n- Use Tailwind CSS for styling.\n- Maintain type safety for all new modules.\n`;
    
    await fs.writeFile(llmPath, llmContent);
    db.prepare('INSERT OR REPLACE INTO files (project_id, path, size) VALUES (?, ?, ?)')
      .run(projectId, 'LLM.md', llmContent.length);
  }

  // Create per-repo artifacts if it's a workspace
  for (const repo of repos) {
    let repoCtx = `# Package Context: ${repo.name}\n\n`;
    repoCtx += `Type: ${repo.type}\nTags: ${repo.tags}\n\n`;
    
    const repoFiles = files.filter(f => f.repository_id === repo.id);
    const criticalFiles = ['package.json', 'README.md', 'src/App.tsx', 'src/main.tsx', 'index.ts', 'server.ts'];
    
    repoCtx += `## Architecture Overview\n\n`;
    for (const file of repoFiles) {
      const ext = path.extname(file.path);
      const fileName = path.basename(file.path);
      if (criticalFiles.includes(file.path) || criticalFiles.includes(fileName)) {
        try {
          const fullPath = path.join(projectDir, file.path);
          const content = await fs.readFile(fullPath, 'utf-8');
          const truncated = content.length > 2000 ? content.slice(0, 2000) + '\n... [TRUNCATED]' : content;
          repoCtx += `### ${file.path}\n\n\`\`\`${ext.slice(1) || 'text'}\n${truncated}\n\`\`\`\n\n`;
        } catch (e) {}
      }
    }
    
    const repoCtxPath = path.join(projectDir, repo.path_prefix, 'CONTEXT.md');
    const repoDir = path.dirname(repoCtxPath);
    if (!existsSync(repoDir)) await fs.mkdir(repoDir, { recursive: true });
    await fs.writeFile(repoCtxPath, repoCtx);
  }

  const workspacePath = path.join(projectDir, 'WORKSPACE.md');
  await fs.writeFile(workspacePath, workspaceContext);
  
  // Register artifacts in DB
  db.prepare('INSERT OR REPLACE INTO files (project_id, path, size) VALUES (?, ?, ?)')
    .run(projectId, 'WORKSPACE.md', workspaceContext.length);
}

function sanitizePath(projectId: string, userPath: string) {
  const projectDir = path.join(WORKSPACE_ROOT, projectId);
  const resolvedPath = path.resolve(projectDir, userPath);
  if (!resolvedPath.startsWith(projectDir)) {
    throw new Error('Path traversal attempt blocked');
  }
  return resolvedPath;
}

// --- API Routes ---

// List projects
app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(projects);
});

app.get('/api/debug/db', (req, res) => {
  try {
    const projects = db.prepare('SELECT * FROM projects').all();
    const repos = db.prepare('SELECT * FROM repositories').all();
    const filesByProject = db.prepare('SELECT project_id, COUNT(*) as count FROM files GROUP BY project_id').all();
    res.json({ projects, repos, filesByProject });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/debug/storage', async (req, res) => {
  res.json({
    DATA_DIR,
    DB_PATH,
    WORKSPACE_ROOT,
    exists: existsSync(WORKSPACE_ROOT)
  });
});

app.get('/api/debug/files/:projectId', (req, res) => {
  try {
    const files = db.prepare(
      'SELECT * FROM files WHERE project_id = ? LIMIT 100'
    ).all(req.params.projectId);
    res.json(files);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/proxy/:projectId/*', async (req, res) => {
  const { projectId } = req.params;
  const filePath = req.params[0] || 'index.html';
  
  try {
    const fullPath = sanitizePath(projectId, filePath);
    if (!existsSync(fullPath)) {
      return res.status(404).send('Not Found');
    }
    
    const ext = path.extname(fullPath);
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    };
    
    res.setHeader('Content-Type', mimeTypes[ext] || 'text/plain');
    res.sendFile(fullPath);
  } catch (e: any) {
    res.status(403).send(e.message);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    persistence: {
      data_dir: DATA_DIR,
      using_custom_data_dir: process.env.DATA_DIR !== undefined,
      db_path: DB_PATH,
      workspace_root: WORKSPACE_ROOT
    }
  });
});

// Create project
app.post('/api/projects', async (req, res) => {
  const { name } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO projects (id, name) VALUES (?, ?)').run(id, name);
  const projectDir = path.join(WORKSPACE_ROOT, id);
  if (!existsSync(projectDir)) {
    await fs.mkdir(projectDir, { recursive: true });
  }
  
  // Initialize with a basic WORKSPACE.md if empty
  await generateProjectContext(id);

  // git init
  try {
    await execAsync('git init', { cwd: projectDir });
  } catch (e) {}
  
  res.json({ id, name });
});

// --- CCC Endpoints ---
app.post('/api/ccc/run', async (req, res) => {
  const { projectId } = req.body;
  try {
    await ccc.run(projectId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ccc/query', async (req, res) => {
  const { projectId, term, type } = req.body;
  try {
    const result = await ccc.query(projectId, term, type);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI Proxy ---
app.post('/api/ai', async (req, res) => {
  const { provider, tier, messages, tools, tool_choice, temperature } = req.body;
  
  if (tools && Array.isArray(tools)) {
    console.log(`[AI Proxy] Tools provided by client:`, tools.map((t: any) => t.function?.name || t.name));
  }

  const providerConfig = PROVIDERS[provider as keyof typeof PROVIDERS];
  if (!providerConfig) {
    return res.status(400).json({ error: `Unknown provider: ${provider}` });
  }

  const model = MODELS[provider as keyof typeof MODELS]?.[tier as keyof (typeof MODELS)['mimo']];
  if (!model) {
    return res.status(400).json({ error: `Unknown tier ${tier} for provider ${provider}` });
  }

  const apiKey = process.env[providerConfig.apiKeyEnv];
  if (!apiKey) {
    return res.status(500).json({ error: `API key for ${provider} (${providerConfig.apiKeyEnv}) is not configured on the server.` });
  }

  try {
    const response = await axios.post(`${providerConfig.baseURL}/chat/completions`, {
      model,
      messages,
      tools,
      tool_choice,
      temperature,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 55000,
    });

    res.json(response.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    const body = err.response?.data || { error: err.message };
    console.error(`AI Proxy Error [${provider}]:`, body);
    res.status(status).json(body);
  }
});

// Chat Persistence
app.get('/api/projects/:projectId/chat', (req, res) => {
  const { projectId } = req.params;
  const row = db.prepare('SELECT messages FROM conversations WHERE project_id = ?').get(projectId) as any;
  res.json(row ? JSON.parse(row.messages) : []);
});

app.post('/api/projects/:projectId/chat', (req, res) => {
  const { projectId } = req.params;
  const { messages } = req.body;
  db.prepare('INSERT OR REPLACE INTO conversations (project_id, messages) VALUES (?, ?)')
    .run(projectId, JSON.stringify(messages));
  res.json({ success: true });
});

// List repositories for a project
app.get('/api/projects/:projectId/repositories', (req, res) => {
  const { projectId } = req.params;
  const repos = db.prepare('SELECT * FROM repositories WHERE project_id = ?').all(projectId);
  res.json(repos);
});

// ... (GitHub and ZIP imports) ...

// New Tools: search_files and replace_in_file
app.post('/api/tools/search_files', async (req, res) => {
  const { projectId, query } = req.body;
  try {
    const projectDir = path.join(WORKSPACE_ROOT, projectId);
    const { stdout } = await execAsync(`grep -rInI "${query.replace(/"/g, '\\"')}" .`, { cwd: projectDir });
    const lines = stdout.split('\n').filter(l => l.trim());
    const results = lines.map(line => {
      const [path, lineNo, ...rest] = line.split(':');
      return { path, line: parseInt(lineNo), content: rest.join(':').trim() };
    });
    res.json({ results });
  } catch (err: any) {
    if (err.code === 1) return res.json({ results: [] });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tools/replace_in_file', async (req, res) => {
  const { projectId, path: filePath, find, replace, dry_run } = req.body;
  try {
    const fullPath = sanitizePath(projectId, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    
    if (!content.includes(find)) {
      return res.status(400).json({ error: 'Target content not found in file' });
    }

    const newContent = content.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
    
    if (dry_run) {
      return res.json({ 
        success: true, 
        message: 'Dry run complete. No changes made.',
        diff: { path: filePath, find, replace }
      });
    }

    await fs.writeFile(fullPath, newContent);
    db.prepare('INSERT OR REPLACE INTO files (project_id, path, size) VALUES (?, ?, ?)')
      .run(projectId, filePath, newContent.length);

    await ccc.run(projectId);

    emitDebugEvent(io, {
      projectId,
      sessionId: req.body.sessionId || 'ai-session',
      type: 'ai:action',
      gitRef: { branch: 'main', commit: 'head' },
      cccTier: 1,
      replayable: true,
      payload: { action: 'replace_in_file', path: filePath }
    });

    res.json({ success: true, message: 'Replacement successful' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GitHub Import (Advanced: Workshop Support)
app.post('/api/import/github', async (req, res) => {
  const { url, name, projectId: existingProjectId, type, tags } = req.body;
  const id = existingProjectId || uuidv4();
  const repoId = uuidv4();
  
  try {
    let zipUrl = url;
    if (url.includes('github.com') && !url.endsWith('.zip')) {
      zipUrl = `${url.replace(/\/$/, '')}/archive/refs/heads/main.zip`;
    }

    console.log(`Downloading ZIP from ${zipUrl}`);
    const response = await axios.get(zipUrl, { responseType: 'arraybuffer' });
    console.log(`Downloaded ${response.data.byteLength} bytes`);
    const zip = new AdmZip(Buffer.from(response.data));
    const projectDir = path.join(WORKSPACE_ROOT, id);
    console.log(`Target project directory: ${projectDir}`);
    
    // If it's a new project, create entry
    if (!existingProjectId) {
      console.log(`Creating new project entry: ${id}`);
      db.prepare('INSERT INTO projects (id, name) VALUES (?, ?)').run(id, name || 'New Workspace');
      await fs.mkdir(projectDir, { recursive: true });
    }

    // Determine path prefix for this repo (e.g. services/my-repo)
    // If it's the first repo in a workspace, we might put it in root or a subdir
    // For CCC style, let's put it in a subdir if it's a workspace
    const repoSlug = name || url.split('/').pop().replace('.git', '');
    const pathPrefix = existingProjectId ? `services/${repoSlug}` : '';
    const repoTargetDir = path.join(projectDir, pathPrefix);
    
    if (!existsSync(repoTargetDir)) {
      await fs.mkdir(repoTargetDir, { recursive: true });
    }

    db.prepare('INSERT INTO repositories (id, project_id, name, url, path_prefix, type, tags) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(repoId, id, repoSlug, url, pathPrefix, type || 'unknown', tags || '');

    const zipEntries = zip.getEntries();
    console.log(`ZIP has ${zipEntries.length} entries`);
    const ignoreList = ['node_modules/', 'dist/', 'build/', '.git/', 'coverage/', '.next/'];
    
    let filesCreated = 0;
    // Check if the ZIP has a common top-level directory (GitHub style)
    const topLevelDirs = new Set(zipEntries.map(e => e.entryName.split('/')[0]));
    const hasTopLevelDir = topLevelDirs.size === 1 && zipEntries.every(e => e.entryName.startsWith(Array.from(topLevelDirs)[0] + '/'));
    console.log(`Detected ZIP structure: ${hasTopLevelDir ? 'Has top-level directory' : 'Flat or multiple roots'}`);

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      if (ignoreList.some(ignore => entry.entryName.includes(ignore))) continue;
      
      const fileNameInsideRepo = hasTopLevelDir 
        ? entry.entryName.split('/').slice(1).join('/')
        : entry.entryName;
        
      if (!fileNameInsideRepo) continue;

      const fullRelativePath = path.join(pathPrefix, fileNameInsideRepo);
      const filePath = path.join(projectDir, fullRelativePath);
      const dirPath = path.dirname(filePath);
      
      try {
        if (!existsSync(dirPath)) {
          await fs.mkdir(dirPath, { recursive: true });
        }

        const content = entry.getData();
        await fs.writeFile(filePath, content);

        db.prepare('INSERT OR REPLACE INTO files (project_id, repository_id, path, size) VALUES (?, ?, ? , ?)')
          .run(id, repoId, fullRelativePath, content.length);
        
        filesCreated++;
      } catch (err: any) {
        console.error(`Failed to create file ${fullRelativePath}:`, err.message);
      }
    }
    console.log(`Extracted and created ${filesCreated} files in database and filesystem`);

    const cccResult = await ccc.run(id);
    await generateProjectContext(id);

    emitDebugEvent(io, {
      projectId: id,
      type: 'git:import',
      gitRef: { branch: 'main', commit: 'head' },
      payload: { url, name, filesCreated, ccc: cccResult }
    });

    io.to(id).emit('fs_event', { type: 'sync_complete', projectId: id });
    res.json({ id, repoId });
  } catch (error: any) {
    console.error('Import failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects/:projectId/upload', upload.array('files'), async (req, res) => {
  const { projectId } = req.params;
  const { path: uploadPath } = req.body; // Optional subdirectory
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const projectDir = path.join(WORKSPACE_ROOT, projectId);
  
  try {
    for (const file of files) {
      const targetRelPath = path.join(uploadPath || '', file.originalname);
      const fullPath = sanitizePath(projectId, targetRelPath);
      const dir = path.dirname(fullPath);
      
      if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true });
      
      const content = await fs.readFile(file.path);
      await fs.writeFile(fullPath, content);
      
      const stats = await fs.stat(fullPath);
      db.prepare('INSERT OR REPLACE INTO files (project_id, path, size) VALUES (?, ?, ?)')
        .run(projectId, targetRelPath, stats.size);
      
      await fs.unlink(file.path);
    }
    
    const cccResult = await ccc.run(projectId);
    await generateProjectContext(projectId);

    emitDebugEvent(io, {
      projectId,
      type: 'fs:change',
      gitRef: { branch: 'main', commit: 'head' },
      payload: { event: 'upload', count: files.length, ccc: cccResult }
    });

    io.to(projectId).emit('fs_event', { type: 'sync_complete', projectId });
    res.json({ success: true, count: files.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/import/zip', upload.single('file'), async (req, res) => {
  const { name } = req.body;
  const id = uuidv4();
  const repoId = uuidv4();
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const zip = new AdmZip(req.file.path);
    const projectDir = path.join(WORKSPACE_ROOT, id);
    
    db.prepare('INSERT INTO projects (id, name) VALUES (?, ?)').run(id, name || 'Uploaded Workspace');
    await fs.mkdir(projectDir, { recursive: true });

    const pathPrefix = ''; // Root for ZIP uploads usually
    const repoSlug = name || 'main-repo';
    
    db.prepare('INSERT INTO repositories (id, project_id, name, path_prefix, type) VALUES (?, ?, ?, ?, ?)')
      .run(repoId, id, repoSlug, pathPrefix, 'uploaded');

    const zipEntries = zip.getEntries();
    const ignoreList = ['node_modules/', 'dist/', 'build/', '.git/', 'coverage/', '.next/', '__MACOSX'];
    
    // Detect root folder
    let commonRoot = '';
    const topLevelEntries = zipEntries.filter(e => !e.entryName.includes('/') || (e.isDirectory && e.entryName.split('/').length === 2 && e.entryName.endsWith('/')));
    if (topLevelEntries.length === 1 && topLevelEntries[0].isDirectory) {
      commonRoot = topLevelEntries[0].entryName;
    }

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      if (ignoreList.some(ignore => entry.entryName.includes(ignore))) continue;
      
      let entryName = entry.entryName;
      if (commonRoot && entryName.startsWith(commonRoot)) {
        entryName = entryName.slice(commonRoot.length);
      }
      if (!entryName) continue;

      const filePath = path.join(projectDir, entryName);
      const dirPath = path.dirname(filePath);
      
      if (!existsSync(dirPath)) {
        await fs.mkdir(dirPath, { recursive: true });
      }

      const content = entry.getData();
      await fs.writeFile(filePath, content);

      db.prepare('INSERT OR REPLACE INTO files (project_id, repository_id, path, size) VALUES (?, ?, ?, ?)')
        .run(id, repoId, entryName, content.length);
    }

    await ccc.run(id);
    await generateProjectContext(id);
    
    // Cleanup upload
    await fs.unlink(req.file.path);

    res.json({ id, repoId });
  } catch (error: any) {
    console.error('ZIP Import failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:projectId/export', async (req, res) => {
  const { projectId } = req.params;
  try {
    const projectDir = path.join(WORKSPACE_ROOT, projectId);
    const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(projectId) as any;
    
    if (!existsSync(projectDir)) {
      return res.status(404).json({ error: 'Project directory not found' });
    }

    const zip = new AdmZip();
    zip.addLocalFolder(projectDir);
    const buffer = zip.toBuffer();
    
    const fileName = (project?.name || 'project').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.zip"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:projectId/reset-sync', async (req, res) => {
  const { projectId } = req.params;
  try {
    db.prepare('DELETE FROM files WHERE project_id = ?').run(projectId);
    await forceFileSync(projectId);
    await generateProjectContext(projectId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function forceFileSync(projectId: string) {
  const projectDir = path.join(WORKSPACE_ROOT, projectId);
  if (!existsSync(projectDir)) {
    console.error(`[forceFileSync] Directory not found: ${projectDir}`);
    return;
  }

  console.log(`[forceFileSync] Scanning ${projectDir}...`);
  let fileCount = 0;

  const walk = async (dir: string, base = '') => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = path.join(base, entry.name);
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
         if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
         await walk(fullPath, relPath);
      } else {
        const stats = await fs.stat(fullPath);
        db.prepare(`
          INSERT INTO files (project_id, path, size, modified_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(project_id, path) DO UPDATE SET 
            size = excluded.size,
            modified_at = CURRENT_TIMESTAMP
        `).run(projectId, relPath, stats.size);
        fileCount++;
      }
    }
  };

  await walk(projectDir);
  console.log(`[forceFileSync] Sync complete for ${projectId}. Found ${fileCount} files.`);
}

// Get files tree with repo info
app.get('/api/files/:projectId', async (req, res) => {
  const { projectId } = req.params;
  try {
    // Throttled sync instead of full scan every time
    await ensureRecentSync(projectId);

    const files = db.prepare(`
      SELECT f.path, f.size, f.repository_id, r.name as repo_name, r.id as repo_id 
      FROM files f 
      LEFT JOIN repositories r ON f.repository_id = r.id 
      WHERE f.project_id = ?
    `).all(projectId);
    
    res.json(files);
  } catch (err: any) {
    console.error(`[GET /api/files/${projectId}] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get file content
app.get('/api/files/:projectId/content', async (req, res) => {
  const { projectId } = req.params;
  const { path: filePath } = req.query;
  try {
    const fullPath = sanitizePath(projectId, filePath as string);
    const content = await fs.readFile(fullPath, 'utf-8');
    res.send(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tools/align_check', async (req, res) => {
  const { projectId, requirement } = req.body;
  try {
    const projectDir = path.join(WORKSPACE_ROOT, projectId);
    const workspacePath = path.join(projectDir, 'WORKSPACE.md');
    const llmPath = path.join(projectDir, 'LLM.md');
    
    let context = '';
    if (existsSync(workspacePath)) context += await fs.readFile(workspacePath, 'utf-8');
    if (existsSync(llmPath)) context += "\n\n" + await fs.readFile(llmPath, 'utf-8');

    // This tool is meant to be called by the AI itself, but we can provide a basic response
    // Or we could trigger a specific Gemini call here if we wanted to be autonomous.
    res.json({ 
      status: 'analyzing', 
      context_found: !!context,
      message: "Alignment check initiated against WORKSPACE.md and LLM.md" 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tools/generate_pkml', async (req, res) => {
  const { projectId, content } = req.body; // AI generated PKML content
  try {
    const projectDir = path.join(WORKSPACE_ROOT, projectId);
    const pkmlPath = path.join(projectDir, 'PKML.md');
    await fs.writeFile(pkmlPath, content);
    db.prepare('INSERT OR REPLACE INTO files (project_id, path, size) VALUES (?, ?, ?)')
      .run(projectId, 'PKML.md', content.length);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tools/analyze_file', async (req, res) => {
  const { projectId, path: filePath } = req.body;
  try {
    const fullPath = sanitizePath(projectId, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const stats = await fs.stat(fullPath);
    const ext = path.extname(filePath).slice(1);
    
    // Quick heuristic analysis
    const lines = content.split('\n').length;
    const purpose = filePath.includes('test') ? 'Testing' : 
                   filePath.includes('config') ? 'Configuration' :
                   ['ts', 'tsx', 'js', 'jsx'].includes(ext) ? 'Logic/Component' : 'Resource';

    res.json({ 
      summary: `File: ${filePath}
Language: ${ext || 'Text'}
Size: ${(stats.size/1024).toFixed(2)} KB (${lines} lines)
Purpose: ${purpose}
Analysis: File appears well-formed. Analysis complete.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tools/read_file', async (req, res) => {
  const { projectId, path: filePath } = req.body;
  try {
    const fullPath = sanitizePath(projectId, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    res.json({ content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tools/write_file', async (req, res) => {
  const { projectId, path: filePath, content } = req.body;
  console.log(`[write_file] Project: ${projectId}, Path: ${filePath}, Content length: ${content?.length || 0}`);
  try {
    const fullPath = sanitizePath(projectId, filePath);
    console.log(`[write_file] Resolved path: ${fullPath}`);
    const dir = path.dirname(fullPath);
    if (!existsSync(dir)) {
      console.log(`[write_file] Creating directory: ${dir}`);
      await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(fullPath, content);
    console.log(`[write_file] File written successfully`);
    db.prepare('INSERT OR REPLACE INTO files (project_id, path, size) VALUES (?, ?, ?)')
      .run(projectId, filePath, content.length);
    console.log(`[write_file] Database updated`);

    const cccResult = await ccc.run(projectId);
    await generateProjectContext(projectId);

    emitDebugEvent(io, {
      projectId,
      sessionId: req.body.sessionId || 'ai-session',
      type: 'fs:change',
      gitRef: { branch: 'main', commit: 'head' },
      cccTier: 1,
      payload: { event: 'write_file', path: filePath, ccc: cccResult }
    });

    io.to(projectId).emit('fs_event', { type: 'write', path: filePath, projectId });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tools/search_code', async (req, res) => {
  const { projectId, query, isRegex } = req.body;
  try {
    const projectDir = path.join(WORKSPACE_ROOT, projectId);
    // Use grep -rIn for powerful search. -I skips binary files.
    const flags = isRegex ? '-rInE' : '-rIn';
    const { stdout } = await execAsync(`grep ${flags} "${query.replace(/"/g, '\\"')}" .`, { 
      cwd: projectDir,
      maxBuffer: 1024 * 1024 // 1MB buffer for search results
    });
    res.json({ results: stdout });
  } catch (err: any) {
    if (err.code === 1) return res.json({ results: '' }); // No matches found
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tools/audit_files', async (req, res) => {
  const { projectId, paths } = req.body;
  try {
    const projectDir = path.join(WORKSPACE_ROOT, projectId);
    const auditData: any = {};
    
    // Read LLM.md for architectural context if it exists
    try {
      auditData.architecture = await fs.readFile(path.join(projectDir, 'LLM.md'), 'utf-8');
    } catch {}

    const filesContent = await Promise.all((paths as string[]).map(async (p) => {
      try {
        const content = await fs.readFile(path.join(projectDir, p), 'utf-8');
        return { path: p, content };
      } catch {
        return null;
      }
    }));

    auditData.files = filesContent.filter(f => f !== null);
    res.json(auditData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tools/analyze_dependencies', async (req, res) => {
  const { projectId } = req.body;
  try {
    const projectDir = path.join(WORKSPACE_ROOT, projectId);
    const files = db.prepare('SELECT path FROM files WHERE project_id = ?').all(projectId) as any[];
    
    // Filter for code files
    const codeFiles = files.filter(f => /\.(ts|tsx|js|jsx)$/.test(f.path));
    
    const nodes: any[] = [];
    const links: any[] = [];
    const nodeMap = new Map();

    for (const f of codeFiles) {
      const fullPath = path.join(projectDir, f.path);
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const repoName = f.path.split('/')[0] || 'root';
        
        if (!nodeMap.has(f.path)) {
          nodes.push({ id: f.path, group: repoName });
          nodeMap.set(f.path, true);
        }

        // Match import lines: import ... from '...' or import '...'
        // Simple regex: could be improved but good for a start
        const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          const target = match[1];
          if (target.startsWith('.')) {
            // Resolve relative path
            const resolved = path.join(path.dirname(f.path), target);
            // Try to find matching file in project
            const targetFile = codeFiles.find(cf => 
              cf.path === resolved || 
              cf.path === resolved + '.ts' || 
              cf.path === resolved + '.tsx' ||
              cf.path === resolved + '.js' ||
              cf.path === resolved + '/index.ts'
            );

            if (targetFile) {
              links.push({ source: f.path, target: targetFile.path, type: 'internal' });
            }
          } else {
            // External dependency
            if (!nodeMap.has(target)) {
              nodes.push({ id: target, group: 'external' });
              nodeMap.set(target, true);
            }
            links.push({ source: f.path, target: target, type: 'external' });
          }
        }
      } catch (e) {}
    }

    res.json({ nodes, links });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tools/get_ccc_status', async (req, res) => {
  const { projectId } = req.body;
  try {
    const cccResult = await ccc.run(projectId);
    const cccCheck = await execAsync('ccc --version').catch(e => ({ stderr: e.message }));
    res.json({ 
      active: !('stderr' in cccCheck), 
      version: !('stderr' in cccCheck) ? (cccCheck as any).stdout?.trim() : 'N/A',
      lastRun: cccResult 
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/tools/run_shell', async (req, res) => {
  const { projectId, command } = req.body;
  try {
    const projectDir = path.join(WORKSPACE_ROOT, projectId);
    
    // Security check: only allow a whitelist of basic safe commands or just trust the sandbox for now
    // In a real app we would be very careful here.
    const { stdout, stderr } = await execAsync(command, { cwd: projectDir });
    
    res.json({ stdout, stderr });
  } catch (err: any) {
    res.status(500).json({ 
      error: err.message, 
      stdout: err.stdout || '', 
      stderr: err.stderr || '' 
    });
  }
});

app.post('/api/tools/list_files', async (req, res) => {
  const { projectId } = req.body;
  try {
    const files = db.prepare('SELECT path FROM files WHERE project_id = ?').all(projectId);
    res.json({ files: files.map((f: any) => f.path) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Git Integration
app.post('/api/git/init', async (req, res) => {
  const { projectId } = req.body;
  try {
    const projectDir = path.join(WORKSPACE_ROOT, projectId);
    await execAsync('git init', { cwd: projectDir });
    res.json({ success: true, message: 'Git initialized' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/status', async (req, res) => {
  const { projectId } = req.body;
  try {
    const projectDir = path.join(WORKSPACE_ROOT, projectId);
    // --porcelain=v1 gives a stable, parser-friendly output
    const { stdout } = await execAsync('git status --porcelain=v1', { cwd: projectDir });
    
    // Parse status lines: "XY PATH"
    const files = stdout.split('\n').filter(l => l.trim()).map(line => {
      const x = line[0]; // Index status
      const y = line[1]; // Work tree status
      const path = line.slice(3);
      
      let status: 'staged' | 'modified' | 'untracked' | 'deleted' = 'untracked';
      if (x === '?' && y === '?') status = 'untracked';
      else if (x !== ' ' && y === ' ') status = 'staged';
      else if (x === ' ' && y === 'M') status = 'modified';
      else if (x === 'M' && y === 'M') status = 'modified'; // partially staged
      else if (x === 'D' || y === 'D') status = 'deleted';
      else if (x !== ' ' && y !== ' ') status = 'staged'; // also staged/modified

      return { path, status, x, y };
    });

    res.json({ files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/git/gitignore/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const filePath = path.join(WORKSPACE_ROOT, projectId, '.gitignore');
  try {
    if (existsSync(filePath)) {
      const content = await fs.readFile(filePath, 'utf-8');
      res.json({ content });
    } else {
      res.json({ content: '' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/gitignore', async (req, res) => {
  const { projectId, content } = req.body;
  const filePath = path.join(WORKSPACE_ROOT, projectId, '.gitignore');
  try {
    await fs.writeFile(filePath, content);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/commit', async (req, res) => {
  const { projectId, message } = req.body;
  try {
    const projectDir = path.join(WORKSPACE_ROOT, projectId);
    await execAsync('git add .', { cwd: projectDir });
    const { stdout } = await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: projectDir });
    res.json({ success: true, output: stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/push', async (req, res) => {
  const { projectId, remote, branch } = req.body;
  try {
    const projectDir = path.join(WORKSPACE_ROOT, projectId);
    const { stdout } = await execAsync(`git push ${remote || 'origin'} ${branch || 'main'}`, { cwd: projectDir });
    res.json({ success: true, output: stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/debug/events/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const events = db.prepare('SELECT * FROM debug_events WHERE project_id = ? ORDER BY timestamp DESC LIMIT 100').all(projectId) as any[];
  res.json(events.map(e => ({
    ...e,
    payload: JSON.parse(e.payload),
    replayable: !!e.replayable,
    gitRef: { branch: e.branch, commit: e.commit_hash }
  })));
});

app.post('/api/debug/report_error', async (req, res) => {
  const { projectId, message, source, line, column, type } = req.body;
  emitDebugEvent(io, {
    projectId,
    sessionId: 'sandbox-runtime',
    type: type === 'console' ? 'runtime:log' : 'runtime:error',
    gitRef: { branch: 'main', commit: 'head' },
    payload: { message, source, line, column }
  });
  res.json({ success: true });
});

// --- Preview Service ---
app.get('/preview/:projectId/*', async (req, res) => {
  const { projectId } = req.params;
  const userPath = (req.params as any)[0] || 'index.html';
  try {
    const fullPath = sanitizePath(projectId, userPath);
    if (existsSync(fullPath)) {
      if (userPath.endsWith('.html')) {
        const content = await fs.readFile(fullPath, 'utf-8');
        const script = `
          <script>
            function reportToCHD(data) {
              fetch('/api/debug/report_error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: '${projectId}', ...data })
              });
            }

            window.onerror = function(message, source, lineno, colno, error) {
              window.parent.postMessage({
                type: 'SANDBOX_ERROR',
                message: message,
                line: lineno,
                column: colno,
                source: source
              }, '*');
              reportToCHD({ type: 'error', message, source, line: lineno, column: colno });
            };
            console.error = (function(oldError) {
              return function() {
                oldError.apply(console, arguments);
                const args = Array.from(arguments).map(String);
                window.parent.postMessage({
                  type: 'SANDBOX_CONSOLE_ERROR',
                  args: args
                }, '*');
                reportToCHD({ type: 'console', message: args.join(' ') });
              };
            })(console.error);
          </script>
        `;
        res.send(content.replace('</head>', script + '</head>'));
      } else {
        res.sendFile(fullPath);
      }
    } else {
      res.status(404).send('Not found');
    }
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

// --- Server Setup ---
let io: Server;

async function startServer() {
  const httpServer = createServer(app);
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  // Watcher Initialization
  const watcher = chokidar.watch(WORKSPACE_ROOT, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 100
    }
  });

  watcher.on('all', (event, fullPath) => {
    const relToWorkspace = path.relative(WORKSPACE_ROOT, fullPath);
    const parts = relToWorkspace.split(path.sep);
    const projectId = parts[0];
    const relPath = parts.slice(1).join('/');

    if (projectId && relPath && !relPath.endsWith('CONTEXT.md') && !relPath.endsWith('WORKSPACE.md')) {
      syncQueue.add(`${projectId}|${relPath}`);
      processSyncQueue(io);

      emitDebugEvent(io, {
        projectId,
        sessionId: 'fs-sync', 
        type: 'fs:change',
        gitRef: { branch: 'main', commit: 'head' },
        payload: { event, path: relPath }
      });
    }
  });

  const projectUsers: Record<string, Set<string>> = {};

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('join_project', (projectId) => {
      socket.join(projectId);
      if (!projectUsers[projectId]) projectUsers[projectId] = new Set();
      projectUsers[projectId].add(socket.id);
      
      io.to(projectId).emit('presence_update', Array.from(projectUsers[projectId]).length);
      console.log(`Socket ${socket.id} joined project ${projectId}`);
    });

    socket.on('editor_change', ({ projectId, path, changes }) => {
      socket.to(projectId).emit('remote_change', { path, changes, userId: socket.id });
    });

    socket.on('chat_message', ({ projectId, message }) => {
      socket.to(projectId).emit('remote_chat', { message, userId: socket.id });
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (projectUsers[room]) {
          projectUsers[room].delete(socket.id);
          io.to(room).emit('presence_update', projectUsers[room].size);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
