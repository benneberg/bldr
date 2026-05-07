import { Database } from 'better-sqlite3';

export class InspectorService {
  constructor(private db: Database) {}

  async getSessionTraces(sessionId: string) {
    const traces = this.db.prepare(`
      SELECT * FROM tool_traces 
      WHERE session_id = ? 
      ORDER BY timestamp ASC
    `).all(sessionId);
    
    return traces.map((t: any) => ({
      ...t,
      input: JSON.parse(t.input),
      output: JSON.parse(t.output)
    }));
  }

  async getArtifacts(sessionId: string) {
    const artifacts = this.db.prepare(`
      SELECT * FROM artifacts 
      WHERE session_id = ? 
      ORDER BY created_at ASC
    `).all(sessionId);

    return artifacts.map((a: any) => ({
      ...a,
      data: JSON.parse(a.data),
      metadata: JSON.parse(a.metadata)
    }));
  }

  async getMutationHistory(projectId: string) {
    const mutations = this.db.prepare(`
      SELECT * FROM debug_events 
      WHERE project_id = ? AND category = 'DOMAIN' AND (type = 'FILE_UPDATED' OR type = 'FILE_DELETED')
      ORDER BY timestamp DESC LIMIT 100
    `).all(projectId);

    return mutations.map((m: any) => ({
      ...m,
      payload: JSON.parse(m.payload),
      metadata: m.metadata ? JSON.parse(m.metadata) : {}
    }));
  }
}
