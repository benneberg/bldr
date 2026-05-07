import { Plugin, PluginArtifact, ToolContext } from '../../types/plugins.js';
import { WorkspaceMutationService } from '../WorkspaceMutationService.js';
import { v4 as uuidv4 } from 'uuid';

export class FilesystemPlugin implements Plugin {
  id = 'system.filesystem';
  name = 'Filesystem Service';
  type = 'filesystem' as const;
  capabilities = ['write', 'delete', 'rename', 'patch'];

  constructor(private mutationService: WorkspaceMutationService) {}

  async execute(input: any, context: ToolContext): Promise<PluginArtifact> {
    const { action, path, content, newPath } = input;
    
    const event = await this.mutationService.executeMutation({
      projectId: context.projectId,
      sessionId: context.sessionId,
      actor: 'ai',
      type: action,
      path,
      content,
      newPath
    });

    return {
      id: uuidv4(),
      type: "diff",
      source: "system",
      data: { eventId: event.eventId, path },
      metadata: {
        path,
        executionTimeMs: event.metadata?.timing
      },
      createdAt: Date.now()
    };
  }

  validate(input: any): boolean {
    return !!(input && input.action && input.path);
  }
}
