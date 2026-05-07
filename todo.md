# bldr AI Dev OS (Plugin + Tool Runtime Expansion)

🧭 SYSTEM GOAL

Transform bldr into a:

🧠 AI Execution Runtime + Plugin-Based Multimodal Development OS
with deterministic mutation, full tool observability, and replayable AI decisions.

Core stack:

* bldr = orchestration + mutation + UI
* CCC = code intelligence (analysis only)
* MiMo / OpenAI / Gemini = execution providers
* Plugin Runtime = capability abstraction layer
* Tool Inspector = observability + debugging layer

⸻

🚀 PHASE 1 — Plugin Runtime Specification v1 (CORE SYSTEM) [COMPLETED]

- [x] 1.1 Plugin Runtime Architecture (TypeScript)
    - [x] Core Interfaces
    - [x] Plugin Contract
    - [x] Artifact Model (Unified Output)

⸻

🔁 PHASE 2 — Event Flow Integration (bldr core system) [COMPLETED]

- [x] 2.1 Unified Event Flow
- [x] 2.2 Event Types
- [x] 2.3 Event Bus Integration
    - [x] Attach correlationId + causationId
    - [x] Persist events to SQLite journal

⸻

🧠 PHASE 3 — MiMo Adapter Layer (MULTIMODAL CORE) [COMPLETED]

- [x] 3.1 Purpose
- [x] 3.2 Adapter Interface
- [x] 3.3 Routing Strategy
- [x] 3.4 Plugin Dispatcher wrapper

⸻

🧩 PHASE 4 — UI Panel System (Mobile-first execution UX) [IN PROGRESS]

- [x] 4.1 Layout Model
- [x] 4.2 Panels Implementation
    - [x] 🧠 AI Chat Panel
    - [x] 💻 Code Editor Panel
    - [x] 🔍 Tool Inspector Panel (NEW)
    - [ ] 🧩 Plugin Output Panel (Generalized)
- [x] 4.3 Panel State Model

⸻

🔍 PHASE 5 — Tool Inspector v1 (CRITICAL SYSTEM) [COMPLETED]

- [x] 5.1 Purpose
- [x] 5.2 Inspector Features
    - [x] Live tool execution stream
    - [x] Full AI reasoning trace
    - [x] FS mutation diffs
- [x] 5.3 Tool Event Model
- [x] 5.4 Inspector UI
    - [x] Execution timeline
    - [x] Expandable event nodes
- [ ] 5.5 Replay System (Backend Stubbed, UI Button exists)
- [x] 5.6 Debug Modes (Tracing enabled by default)

⸻

🗄 PHASE 6 — Artifact Store (SQLite + FS Hybrid) [COMPLETED]

- [x] 6.1 SQLite Schema (artifacts, tool_traces, fs_mutations)
- [x] 6.2 File System Storage (/artifacts/ root)
- [x] 6.3 Separation Logic (SQLite metadata, FS binaries)

⸻

🧠 PHASE 7 — Advanced Idea Integration (Vision Layer) [TODO]

- [ ] Tool as Real-World Evaluation System
- [ ] Tool benchmarking mode

⸻

🧭 PHASE 8 — Plugin Ecosystem Expansion [TODO]

- [ ] GitHub Plugin
- [ ] Firebase Plugin
- [ ] Web Scraper Plugin
- [ ] PWA Generator Plugin

⸻
