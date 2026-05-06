# bldr Replay Integrity Strategy

## 1. Causal Reconstruction
bldr uses the SQLite journal (`debug_events`) to reconstruct the causal history of the workspace. Every mutation is assigned a `causationId` and `correlationId`.

## 2. Deterministic Sequencing
- Every event has a monotonically increasing `timestamp`.
- Operation hashes (`hashBefore`, `hashAfter`) are captured for every filesystem mutation.
- Integrity verification can be performed by replaying the journal and checking if the resulting filesystem state matches the stored hashes.

## 3. Drift Detection
- Chokidar acts as a drift detection mechanism.
- If the FS changes without a corresponding `DOMAIN_EVENT` from the `MutationService`, it is flagged as an external (non-deterministic) change.
- Such changes are logged as `FS_OBSERVED` for audit purposes.

## 4. Time-Travel Debugging (Future)
By replaying the journal, the system can theoretically revert the workspace to any prior state by calculating the inverse of the mutation set recorded in the audit trail.
