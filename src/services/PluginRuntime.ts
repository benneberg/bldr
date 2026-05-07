import { Plugin, PluginArtifact, ToolContext } from '../types/plugins.js';
import { TelemetryService } from './TelemetryService.js';
import { DomainEventType, EventCategory } from '../types/events.js';
import { v4 as uuidv4 } from 'uuid';
import { Database } from 'better-sqlite3';

export class PluginRuntime {
  private plugins: Map<string, Plugin> = new Map();

  constructor(
    private telemetry: TelemetryService,
    private db: Database
  ) {}

  registerPlugin(plugin: Plugin) {
    this.plugins.set(plugin.id, plugin);
    console.log(`[PluginRuntime] Registered plugin: ${plugin.name} (${plugin.id})`);
  }

  async executeTool(
    pluginId: string,
    input: any,
    context: ToolContext
  ): Promise<PluginArtifact> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const correlationId = uuidv4();
    const startTime = Date.now();

    // Log Tool Invoke
    this.telemetry.logEvent({
      projectId: context.projectId,
      sessionId: context.sessionId,
      category: EventCategory.DOMAIN,
      type: DomainEventType.TOOL_INVOKE,
      source: 'PluginRuntime',
      actor: 'ai',
      payload: { pluginId, input },
      correlationId
    });

    try {
      if (plugin.validate && !plugin.validate(input)) {
        throw new Error(`Invalid input for plugin ${pluginId}`);
      }

      const artifact = await plugin.execute(input, context);
      const duration = Date.now() - startTime;

      // Persist Artifact to SQLite
      this.db.prepare(`
        INSERT INTO artifacts (id, session_id, type, source, data, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        artifact.id,
        context.sessionId,
        artifact.type,
        artifact.source,
        JSON.stringify(artifact.data),
        JSON.stringify(artifact.metadata),
        artifact.createdAt
      );

      // Persist Trace
      this.db.prepare(`
        INSERT INTO tool_traces (id, session_id, event_type, input, output, correlation_id, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        context.sessionId,
        'PLUGIN_EXECUTION',
        JSON.stringify(input),
        JSON.stringify(artifact),
        correlationId,
        Date.now()
      );

      // Log Success Event
      this.telemetry.logEvent({
        projectId: context.projectId,
        sessionId: context.sessionId,
        category: EventCategory.DOMAIN,
        type: DomainEventType.ARTIFACT_CREATED,
        source: 'PluginRuntime',
        actor: 'system',
        payload: { artifactId: artifact.id, type: artifact.type },
        correlationId,
        metadata: { timing: duration }
      });

      return artifact;
    } catch (error: any) {
      this.telemetry.logEvent({
        projectId: context.projectId,
        sessionId: context.sessionId,
        category: EventCategory.DOMAIN,
        type: 'TOOL_FAILURE',
        source: 'PluginRuntime',
        actor: 'system',
        payload: { pluginId, error: error.message },
        correlationId
      });
      throw error;
    }
  }
}
