import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { Database } from 'better-sqlite3';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import { RuntimeEvent, DomainEventType, EventCategory } from '../types/events.js';
import { TelemetryService } from './TelemetryService.js';
import { CCCService } from './cccService.js';

const execAsync = promisify(exec);

export interface MutationIntent {
  projectId: string;
  sessionId: string;
  actor: 'user' | 'ai' | 'system';
  type: 'write' | 'delete' | 'rename' | 'patch';
  path: string;
  content?: string;
  newPath?: string;
  metadata?: any;
  skipCCC?: boolean;
}

export class WorkspaceMutationService {
  constructor(
    private db: Database,
    private io: Server,
    private ccc: CCCService,
    private telemetry: TelemetryService,
    private workspaceRoot: string
  ) {}

  private sanitizePath(projectId: string, userPath: string) {
    const projectDir = path.join(this.workspaceRoot, projectId);
    const resolvedPath = path.resolve(projectDir, userPath);
    if (!resolvedPath.startsWith(projectDir)) {
      throw new Error('Path traversal attempt blocked');
    }
    return { fullPath: resolvedPath, relPath: path.relative(projectDir, resolvedPath), projectDir };
  }

  async executeMutation(intent: MutationIntent): Promise<RuntimeEvent> {
    const { projectId, type, path: userPath, content, actor, sessionId } = intent;
    const { fullPath, relPath, projectDir } = this.sanitizePath(projectId, userPath);
    const causationId = intent.metadata?.causationId;
    const correlationId = intent.metadata?.correlationId || uuidv4();

    const startTime = Date.now();
    let hashBefore: string | undefined;
    
    if (existsSync(fullPath)) {
      const existing = await fs.readFile(fullPath);
      hashBefore = this.calculateHash(existing);
    }

    // Execute mutation
    switch (type) {
      case 'write':
        if (content === undefined) throw new Error('Content required for write mutation');
        const dir = path.dirname(fullPath);
        if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, content);
        break;
      case 'delete':
        if (existsSync(fullPath)) {
          await fs.unlink(fullPath);
        }
        break;
      case 'rename':
        if (!intent.newPath) throw new Error('New path required for rename mutation');
        const { fullPath: newFullPath } = this.sanitizePath(projectId, intent.newPath);
        const newDir = path.dirname(newFullPath);
        if (!existsSync(newDir)) await fs.mkdir(newDir, { recursive: true });
        await fs.rename(fullPath, newFullPath);
        break;
      default:
        throw new Error(`Unsupported mutation type: ${type}`);
    }

    const hashAfter = type === 'delete' ? undefined : this.calculateHash(await fs.readFile(type === 'rename' ? this.sanitizePath(projectId, intent.newPath!).fullPath : fullPath));
    const duration = Date.now() - startTime;

    // Update DB
    if (type === 'delete') {
      this.db.prepare('DELETE FROM files WHERE project_id = ? AND path = ?').run(projectId, relPath);
    } else {
      const finalPath = type === 'rename' ? intent.newPath! : relPath;
      const stats = await fs.stat(type === 'rename' ? this.sanitizePath(projectId, intent.newPath!).fullPath : fullPath);
      this.db.prepare(`
        INSERT INTO files (project_id, path, size, hash, modified_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(project_id, path) DO UPDATE SET 
          size = excluded.size,
          hash = excluded.hash,
          modified_at = CURRENT_TIMESTAMP
      `).run(projectId, finalPath, stats.size, hashAfter);
    }

    // Git Sessioning (Post-Mutation Staging)
    if (actor === 'ai') {
      try {
        await execAsync('git add .', { cwd: projectDir });
      } catch (e) {
        console.warn('Git staging failed during ai mutation:', e);
      }
    }

    // CCC Invalidation
    let cccResult = null;
    if (!intent.skipCCC) {
      cccResult = await this.ccc.run(projectId);
    }

    // Create Domain Event
    const event: RuntimeEvent = {
      eventId: uuidv4(),
      causationId,
      correlationId,
      timestamp: Date.now(),
      sessionId,
      projectId,
      source: 'MutationService',
      actor,
      replayable: true,
      category: EventCategory.DOMAIN,
      type: type === 'delete' ? DomainEventType.FILE_DELETED : DomainEventType.FILE_UPDATED,
      payload: { 
        type, 
        path: relPath, 
        newPath: intent.newPath,
        ccc: cccResult 
      },
      payloadVersion: '1.0.0',
      metadata: {
        hashBefore,
        hashAfter,
        timing: duration
      }
    };

    // Log and Broadcast
    this.telemetry.logEvent(event);
    this.io.to(projectId).emit('fs_event', { 
      type: type === 'delete' ? 'delete' : 'write', 
      path: relPath, 
      projectId,
      eventId: event.eventId
    });

    return event;
  }

  private calculateHash(data: string | Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

import crypto from 'crypto';
