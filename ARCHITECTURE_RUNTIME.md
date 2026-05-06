# bldr Runtime Architecture & Governance

## 1. Operational Philosophy
bldr is a local-first, filesystem-authoritative AI development runtime. It treats the filesystem as the single source of truth (SSOT). All other systems (SQLite, CCC, Sockets) are derivatives, observers, or transport layers.

## 2. Subsystem Responsibilities
- **Filesystem**: Authoritative storage and state.
- **SQLite (Journal)**: Audit trail, metadata cache, and operation sequencing.
- **Git (Sessioning)**: Intent isolation and state history.
- **CCC (Memory)**: Tiered semantic context for AI invalidation.
- **Chokidar (Watcher)**: Passive infrastructure observer for filesystem changes.
- **Socket.io**: Real-time event transport from server to client.

## 3. Mutation Authority Rules
1. **SSOT Rule**: The filesystem is the only authoritative source for file content and structure.
2. **Centralized Authority**: All mutations (write, delete, rename, patch) MUST pass through the `WorkspaceMutationService`. Direct `fs` writes in routes or other services are FORBIDDEN.
3. **Sequential Commit**: Mutations follow a strict lifecycle:
   - Request Intent -> Authorization -> Mutation -> Commit to Disk -> Verification -> Event Propagation.
4. **CCC Invalidation**: No CCC regeneration shall occur before a filesystem mutation is successfully committed and flushed to disk.

## 4. Event Flow & Lifecycle
- **Authoritative Change**: Occurs in `WorkspaceMutationService`.
- **Primary Notification**: Emitted by the Service (not the Watcher).
- **Secondary Discovery**: Watcher detects external changes (e.g., git checkout, manual user edit) and notifies the Service to synchronize metadata.
- **Broadcast**: Sockets transmit transport events to connected clients.

## 5. Event Categories
- **DOMAIN_EVENT**: Business-critical state changes (Sync necessary).
- **TRANSPORT_EVENT**: Connectivity and infrastructure updates.
- **AUDIT_EVENT**: Journal entries for replay and history.

## 6. Conflict Resolution & Replay
- Operations are monotonic and sequential.
- Operation IDs are deterministic derived from `(projectId, timestamp, hash)`.
- Replay relies on the SQLite journal to reconstruct causal history.
