import { DomainEventType } from './events.js';

export interface ToolContext {
  sessionId: string;
  projectId: string;
  userId?: string;
  workspacePath: string;
  ccc?: any;
  git?: any;
  runtime: {
    timestamp: number;
    environment: "mobile" | "desktop";
  };
}

export interface PluginArtifact {
  id: string;
  type: "image" | "video" | "audio" | "text" | "json" | "diff";
  source: "mimo" | "ccc" | "openai" | "system";
  data: any;
  metadata: {
    prompt?: string;
    model?: string;
    tokens?: number;
    executionTimeMs?: number;
    path?: string;
  };
  createdAt: number;
}

export interface Plugin {
  id: string;
  name: string;
  type: "image" | "video" | "audio" | "code" | "analysis" | "filesystem";
  capabilities: string[];
  execute(
    input: unknown,
    context: ToolContext
  ): Promise<PluginArtifact>;
  validate?(input: unknown): boolean;
}

export interface ToolTraceEvent {
  id: string;
  type:
    | "AI_CALL"
    | "TOOL_CALL"
    | "PLUGIN_EXECUTION"
    | "CCC_QUERY"
    | "FS_MUTATION"
    | "GIT_ACTION";
  input: any;
  output: any;
  timestamp: number;
  sessionId: string;
  correlationId: string;
}
