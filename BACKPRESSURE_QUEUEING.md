# bldr Queueing & Backpressure Recommendations

## 1. Mutation Queueing
Currently, `WorkspaceMutationService` executes mutations sequentially per request. To handle bursts (especially from high-tier AI models), a internal operation queue should be introduced.

**Recommendation**:
- Use an in-memory `AsyncQueue` to serialize filesystem writes.
- Reject requests if the queue depth exceeds a stability threshold (e.g., 50 pending mutations).

## 2. Sync Backpressure
`Chokidar` events are already debounced via `stabilityThreshold`.
**Recommendation**:
- Implement a leaky bucket for `syncQueue` to prevent resource exhaustion during massive git operations (e.g., branch switching).
- Pause UI broadcasts if the event throughput exceeds 100 events/second.

## 3. SQLite Lock Management
`WAL` mode is enabled to improve concurrency.
**Recommendation**:
- Use `IMMEDIATE` transactions for bulk imports to prevent "database is locked" errors.
- Monitor `busy_timeout` metrics in diagnostic endpoints.
