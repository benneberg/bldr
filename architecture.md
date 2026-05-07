# bldr Architecture

## 🏛️ System Overview

bldr is an **execution layer for developer intent**, designed for high-density engineering and mobile-first productivity.

```
Client (Mobile/Web)
   ↕ SSE/WebSocket (Socket.io)
Express Server
   ├─ Event Bus (Central emitter)
   ├─ WorkspaceMutationService (Authoritative mutations)
   ├─ TelemetryService (Structured observability)
   ├─ CCC Engine (Tiered context generation)
   ├─ Git Manager (Session branching)
   ├─ chokidar (FS watcher - Passive observer)
   └─ SQLite (Project registry + audit journal)
        ↕
      Filesystem
        ↕
      AI Proxy (Centralized model routing)
        ├─ Gemini API (3 Flash Preview)
        ├─ MiMo API (v2.5 Pro)
        └─ OpenAI API (GPT-4o)
```

## 🛠️ Key Decisions (ADRs)

### 1. Git Sessions
* Each AI interaction session is mapped to a transient **Git branch**.
* **Undo/Redo** is handled via native `git reset` commands.
* **Publishing** changes involves generating a GitHub Pull Request, keeping the development cycle deterministic and integrated with standard CI/CD.

### 2. Mutation Authority
* The **WorkspaceMutationService** is the only layer allowed to mutate the filesystem.
* Metadata and state are derivative; the **Filesystem always wins** as the source of truth for code.
* **chokidar** is a passive observer, used only for synchronizing metadata and detecting external changes.

### 3. AI Safety & Scoping
* AI writes are scoped per repository and restricted from path traversal.
* Destructive operations (deletes) are gated and require explicit JSON approval via the UI.
* **Dry-Run Diffs** are generated before any disk commit.

## 💾 Data Layer (SQLite)

### `projects`
Stores workspace metadata and global configuration.

### `files`
Monitored registry of all tracked assets.
* `project_id`, `path`, `size`, `hash`, `modified_at`.
* Includes SHA-256 hashing for integrity checks.

### `debug_events` (Audit Journal)
* `id`, `causation_id`, `correlation_id`, `timestamp`, `session_id`, `project_id`, `type`, `payload`, `replayable`, `metadata`.
* Provides a deterministic source of truth for causal history reconstruction and replay.

## 🧠 CCC Protocol (AI Memory System)

To ensure token efficiency, bldr uses a tiered context update system:
* **Tier 1:** Individual file change → Updates the local `CONTEXT.md` for that service.
* **Tier 2:** Configuration change → Re-evaluates `LLM.md` architectural rules.
* **Tier 3:** Structural change → Full regeneration of `WORKSPACE.md` map.

## 📱 Mobile UX Strategy (Phase 7+)
* **Intent > Typing:** Primary interface is Chat; the Editor is a secondary inspector.
* **Block-Based Approvals:** AI changes are presented as functional blocks rather than massive diffs, optimized for thumb-zone interactions.
* **Visible Progress:** Real-time terminal feedback and status pulses ensure the user is never "waiting" blindly.

