# bldr Incremental Migration Plan

## Phase 1: Service Abstraction (COMPLETED)
- Introduced `TelemetryService`.
- Introduced `WorkspaceMutationService`.
- Centralized `write_file` and `replace_in_file` logic.

## Phase 2: Event Normalization (COMPLETED)
- Defined `RuntimeEvent` contracts.
- Updated `Watcher` to passive mode.
- Integrated telemetry into Git and CCC endpoints.

## Phase 3: Total Mutation Guarding (IN PROGRESS)
- Migrate all remaining `fs.writeFile`, `fs.unlink`, and `fs.rename` calls in `server.ts` to `WorkspaceMutationService`.
- Implement `delete_file` and `rename_file` abstraction.

## Phase 4: UI/State Synchronization (PLANNED)
- Update frontend to use `eventId` for tracking optimistic state confirmation.
- Introduce `useRuntimeEvent` hooks for typed event handling.

## Phase 5: Replay Engine (PLANNED)
- Develop a CLI tool or expert system to verify total filesystem integrity against the SQLite journal.
