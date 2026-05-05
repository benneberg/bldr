export interface Project {
  id: string;
  name: string;
  githubUrl?: string;
  createdAt: number;
}

export interface FileEntry {
  path: string;
  size: number;
  gitStatus?: 'staged' | 'modified' | 'untracked' | 'deleted';
}

export interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
  activities?: { name: string; args: any }[];
  metadata?: {
    model?: string;
    tokens?: {
      prompt: number;
      completion: number;
      total: number;
    };
    latency?: number;
    provider?: string;
  };
}

export interface TreeNode {
  name: string;
  path: string;
  size?: number;
  children?: Record<string, TreeNode>;
  gitStatus?: 'staged' | 'modified' | 'untracked' | 'deleted';
}

export type DebugEventType = 
  | "ai:action"
  | "git:commit"
  | "fs:change"
  | "runtime:error"
  | "runtime:log"
  | "runtime:preview";

export interface DebugEvent {
  id: string;
  parentId?: string;
  timestamp: number;
  sessionId: string;
  projectId: string;
  type: DebugEventType;
  gitRef: {
    branch: string;
    commit: string;
  };
  cccTier?: 1 | 2 | 3;
  replayable?: boolean;
  payload: any;
  links?: {
    causedBy?: string;
    resultedIn?: string;
  };
}
