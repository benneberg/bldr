export enum EventCategory {
  DOMAIN = 'DOMAIN',
  TRANSPORT = 'TRANSPORT',
  UI = 'UI',
  AUDIT = 'AUDIT'
}

export enum DomainEventType {
  FILE_UPDATED = 'FILE_UPDATED',
  FILE_DELETED = 'FILE_DELETED',
  PROJECT_IMPORTED = 'PROJECT_IMPORTED',
  AI_PATCH_APPLIED = 'AI_PATCH_APPLIED',
  CCC_REGENERATED = 'CCC_REGENERATED',
  AI_REQUEST = 'AI_REQUEST',
  TOOL_INVOKE = 'TOOL_INVOKE',
  PLUGIN_EXECUTE = 'PLUGIN_EXECUTE',
  MUTATION = 'MUTATION',
  ARTIFACT_CREATED = 'ARTIFACT_CREATED',
  CCC_ANALYSIS = 'CCC_ANALYSIS',
  FS_SYNC = 'FS_SYNC'
}

export enum TransportEventType {
  SOCKET_CONNECTED = 'SOCKET_CONNECTED',
  SOCKET_SYNC = 'SOCKET_SYNC',
  CLIENT_RECONNECTED = 'CLIENT_RECONNECTED'
}

export interface RuntimeEvent<T = any> {
  eventId: string;
  causationId?: string;
  correlationId?: string;
  timestamp: number;
  sessionId?: string;
  projectId: string;
  source: string;
  actor: 'user' | 'ai' | 'system';
  replayable: boolean;
  category: EventCategory;
  type: DomainEventType | TransportEventType | string;
  payload: T;
  payloadVersion: string;
  metadata?: {
    hashBefore?: string;
    hashAfter?: string;
    gitRef?: string;
    timing?: number;
  };
}
