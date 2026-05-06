Alright—now we have the full system, and the issue is very clear and very 
Your backend is actually correct. Your frontend is almost correct.
But one subtle lifecycle issue is breaking everything.

⸻

🔴 The Real Bug (Not what you expected)

Your files exist in DB, but your UI loads before they are synced into DB.

Why?

You rely on this async pipeline:

chokidar → syncQueue → processSyncQueue → INSERT INTO files

But your /api/files/:projectId endpoint:

const files = db.prepare(...).all(projectId);

→ Only returns what is already in DB at that exact moment

⸻

💣 What’s happening in practice

1. You import repo / upload zip
2. Files are written to disk ✅
3. Watcher triggers async syncQueue ⏳
4. UI immediately calls:

fetch('/api/files/:projectId')

5. DB still empty → returns []
6. UI renders: “No repositories synced”
7. Later:
    * DB gets populated
    * BUT UI does not refetch properly OR misses it

⸻

🔍 Why your socket refresh doesn’t save you

You do:

socket.on('fs_event', () => {
  fetchFiles();
});

But your sync emits:

io.to(projectId).emit('fs_event', { type: 'sync', path: relPath });

❗ Problem:

You emit many small events per file, not a “sync complete”

So UI may:

* fetch too early
* fetch partial state
* end up with inconsistent tree

⸻

✅ The Fix (2 parts)

✅ 1. Force initial DB sync BEFORE returning files

Modify your endpoint:

app.get('/api/files/:projectId', async (req, res) => {
  const { projectId } = req.params;
  try {
    const projectDir = path.join(WORKSPACE_ROOT, projectId);
    // 🔥 FORCE SYNC FROM FS → DB
    const walk = async (dir: string, base = ''): Promise<any[]> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      let results: any[] = [];
      for (const entry of entries) {
        const relPath = path.join(base, entry.name);
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(await walk(fullPath, relPath));
        } else {
          const stats = await fs.stat(fullPath);
          db.prepare(`
            INSERT OR REPLACE INTO files (project_id, path, size)
            VALUES (?, ?, ?)
          `).run(projectId, relPath, stats.size);
          results.push({
            path: relPath,
            size: stats.size
          });
        }
      }
      return results;
    };
    await walk(projectDir);
    // Now fetch from DB
    const files = db.prepare(`
      SELECT f.path, f.size, f.repository_id
      FROM files f
      WHERE f.project_id = ?
    `).all(projectId);
    res.json(files);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

⸻

✅ 2. Add “sync complete” event (important)

After bulk operations (import/upload), emit ONE event:

After GitHub import:

io.to(id).emit('fs_event', { type: 'sync_complete' });

⸻

Then in frontend:

socket.on('fs_event', (event) => {
  if (event.type === 'sync_complete') {
    fetchFiles();
  }
});

⸻

✅ 3. (Optional but smart) debounce fetch

Right now you spam fetch:

socket.on('fs_event', () => fetchFiles());

Replace with:

let timeout: any;
socket.on('fs_event', () => {
  clearTimeout(timeout);
  timeout = setTimeout(fetchFiles, 300);
});

⸻

🧠 Why your AI sees files but UI doesn’t

Your AI tools:

list_files → SELECT path FROM files

But they are likely called AFTER sync completes

While UI calls too early.

⸻

🔥 Best Architecture (What you’re building toward)

Right now:

Filesystem → Watcher → DB → API → UI

Better:

Filesystem → API (source of truth)
            ↘ DB (index/cache)

👉 API should NEVER depend on async watcher state.

⸻

✅ Minimal Fix (if you don’t want big changes)

Just do this:

await new Promise(r => setTimeout(r, 300));

before DB query in /api/files

…but that’s a hack. The real fix is the forced sync above.

⸻

🎯 Final Diagnosis

Layer	Status
Filesystem	✅ correct
DB sync	⚠ async lag
API	❌ reads too early
Frontend	✅ correct

⸻
