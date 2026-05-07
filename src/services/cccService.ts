import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import axios from 'axios';

const execAsync = promisify(exec);

export class CCCService {
  private runtimeUrl: string | null = process.env.CCC_RUNTIME_URL || null;
  private queue: string[] = [];
  private isProcessing = false;

  constructor(private workspaceRoot: string) {}

  private getProjectPath(projectId: string) {
    return path.join(this.workspaceRoot, projectId);
  }

  private isAvailable: boolean | null = null;

  private async checkAvailability() {
    if (this.runtimeUrl) return true;
    if (this.isAvailable !== null) return this.isAvailable;
    try {
      await execAsync("ccc --version");
      this.isAvailable = true;
    } catch {
      console.warn("CCC CLI (Context Compiler) is not installed in this environment. CCC features will be disabled.");
      this.isAvailable = false;
    }
    return this.isAvailable;
  }

  /**
   * Queue a CCC update. 
   * Updates are processed sequentially to prevent CPU spikes and race conditions.
   */
  async run(projectId: string) {
    if (!(await this.checkAvailability())) return { success: false, reason: "CCC not available" };
    
    // Add to queue and trigger processing if not already running
    this.queue.push(projectId);
    this.processQueue();
    
    return { success: true, status: 'queued' };
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const projectId = this.queue.shift()!;
        
        if (this.runtimeUrl) {
          await this.runRemote(projectId);
        } else {
          await this.runLocal(projectId);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async runRemote(projectId: string) {
    try {
      await axios.post(`${this.runtimeUrl}/compile`, { projectId });
    } catch (error: any) {
      console.error(`CCC Runtime API Error [${projectId}]:`, error.message);
    }
  }

  private async runLocal(projectId: string) {
    const cwd = this.getProjectPath(projectId);
    try {
      await execAsync("ccc --quick-update", { cwd });
    } catch (error: any) {
      console.error(`CCC Run Error [${projectId}]:`, error.message);
      try {
        await execAsync("ccc workspace generate", { cwd });
      } catch (innerError: any) {
        console.error(`Failed to run CCC fallback: ${innerError.message}`);
      }
    }
  }

  /**
   * Query structured context from CCC.
   */
  async query(projectId: string, term: string, type = "context") {
    if (!(await this.checkAvailability())) return null;

    if (this.runtimeUrl) {
      try {
        const { data } = await axios.get(`${this.runtimeUrl}/query`, {
          params: { projectId, term, type }
        });
        return data;
      } catch (error: any) {
        console.warn(`CCC Remote Query Warning [${projectId}]:`, error.message);
        return null;
      }
    }

    const cwd = this.getProjectPath(projectId);
    try {
      const { stdout } = await execAsync(
        `ccc query --type ${type} --format json "${term}"`,
        { cwd }
      );
      return JSON.parse(stdout);
    } catch (error: any) {
      console.warn(`CCC Query Warning [${projectId}]:`, error.message);
      return null;
    }
  }

  async getSymbol(projectId: string, symbolName: string) {
    return this.query(projectId, symbolName, "symbols");
  }
}
