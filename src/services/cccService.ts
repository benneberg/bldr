import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export class CCCService {
  constructor(private workspaceRoot: string) {}

  private getProjectPath(projectId: string) {
    // Ensure we are working with the correct project directory
    return path.join(this.workspaceRoot, projectId);
  }

  private isAvailable: boolean | null = null;

  private async checkAvailability() {
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
   * Run CCC update on the project.
   * Uses --quick-update for better performance after initial run.
   */
  async run(projectId: string) {
    if (!(await this.checkAvailability())) return { success: false, reason: "CCC not available" };
    
    const cwd = this.getProjectPath(projectId);
    try {
      // Create .llm-context directory if it doesn't exist via ccc execution
      await execAsync("ccc --quick-update", { cwd });
      return { success: true };
    } catch (error: any) {
      console.error(`CCC Run Error [${projectId}]:`, error.message);
      // Fallback to full run if quick-update fails or first time
      try {
        await execAsync("ccc workspace generate", { cwd });
        return { success: true };
      } catch (innerError: any) {
        console.error(`Failed to run CCC fallback: ${innerError.message}`);
        return { success: false, error: innerError.message };
      }
    }
  }

  /**
   * Query structured context from CCC.
   * @param type 'context', 'symbols', 'dependencies', etc.
   */
  async query(projectId: string, term: string, type = "context") {
    if (!(await this.checkAvailability())) return null;

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

  /**
   * Get specific symbol impact or definition
   */
  async getSymbol(projectId: string, symbolName: string) {
    return this.query(projectId, symbolName, "symbols");
  }
}
