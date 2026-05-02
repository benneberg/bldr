export interface Project {
  id: string;
  name: string;
  githubUrl?: string;
  createdAt: number;
}

export interface FileEntry {
  path: string;
  size: number;
}

export interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
  activities?: { name: string; args: any }[];
}

export interface TreeNode {
  name: string;
  path: string;
  size?: number;
  children?: Record<string, TreeNode>;
}
