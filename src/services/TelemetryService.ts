import { RuntimeEvent, EventCategory } from '../types/events.js';
import { Database } from 'better-sqlite3';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

export class TelemetryService {
  constructor(private db: Database, private io: Server) {}

  logEvent(event: Partial<RuntimeEvent>) {
    const fullEvent: RuntimeEvent = {
      eventId: uuidv4(),
      timestamp: Date.now(),
      projectId: event.projectId || 'system',
      source: event.source || 'runtime',
      actor: event.actor || 'system',
      replayable: event.replayable ?? true,
      category: event.category || EventCategory.AUDIT,
      type: event.type || 'LOG',
      payload: event.payload || {},
      payloadVersion: '1.0.0',
      ...event
    };

    console.log(`[${fullEvent.category}] ${fullEvent.type} - ${fullEvent.source}:`, JSON.stringify(fullEvent.payload));

    // Persist to journal
    try {
      this.db.prepare(`
        INSERT INTO debug_events (id, timestamp, session_id, project_id, type, payload, replayable, metadata, causation_id, correlation_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        fullEvent.eventId,
        fullEvent.timestamp,
        fullEvent.sessionId || null,
        fullEvent.projectId,
        fullEvent.type,
        JSON.stringify(fullEvent.payload),
        fullEvent.replayable ? 1 : 0,
        JSON.stringify(fullEvent.metadata || {}),
        fullEvent.causationId || null,
        fullEvent.correlationId || null
      );
    } catch (err) {
      console.error('Failed to persist telemetry event:', err);
    }

    // Broadcast if transport event or important domain event
    if (fullEvent.category === EventCategory.TRANSPORT || fullEvent.category === EventCategory.DOMAIN) {
      this.io.emit('runtime:event', fullEvent);
    }
  }

  trackMetric(name: string, value: number, tags: Record<string, string> = {}) {
    // Current simple implementation: log to console
    // Future: Persist to a metrics table
    this.logEvent({
      category: EventCategory.AUDIT,
      type: 'METRIC',
      payload: { name, value, tags },
      replayable: false
    });
  }
}
