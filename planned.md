# bldr Roadmap (Unified System + CCC Runtime Evolution)

⸻

✅ Foundation (Completed)

* Workspace model implementation (SQLite)
* Multi-repository import support
* AI Tool execution (read/write/list)
* “Sophisticated Dark” UI theme
* Live Preview sandbox
* CCC generation (Tiered IR: Tier 1/2/3)
* Diff preview & PR simulation
* Real-time collaboration
* Event-driven FS watcher (chokidar baseline)
* Causal History Debugger (CHD) foundation

⸻

🧠 Phase 6 — Runtime Determinism Layer (COMPLETED / HARDENED)

Mutation & Execution Governance

* Centralized Mutation Authority (WorkspaceMutationService)
* All filesystem writes routed through deterministic mutation pipeline
* Hash-based write verification (content integrity enforcement)
* Git staging synchronized post-mutation flush
* AI write operations fully mediated (no direct FS access)

Event System Formalization

* Strongly typed RuntimeEvent contracts
* Event taxonomy introduced:
    * DOMAIN / TRANSPORT / UI / AUDIT
* Correlation + causation IDs enforced across system
* Deterministic event emission sequencing
* Legacy logging upgraded into telemetry pipeline

Observability Layer

* TelemetryService implemented
* Structured runtime metrics (latency, throughput, queue depth)
* Debug endpoints:
    * /api/debug/runtime
    * /api/debug/queues
    * /api/debug/events
    * /api/debug/metrics

FS Watcher Refactor

* chokidar converted to passive observer mode
* external change detection separated from mutation authority
* sync engine decoupled from business logic

⸻

🧠 Phase 6.5 — CCC Embedded Runtime (CRITICAL ARCHITECTURAL SHIFT)

CCC is no longer a CLI tool. It is now a runtime cognition subsystem inside bldr.

⸻

CCC Runtime Service (NEW SYSTEM CORE)

* Introduce Python FastAPI service: ccc-runtime
* Deploy as Railway sidecar service
* Shared volume mount:
    * /app/data
    * .llm-context
    * workspace artifacts

CCC Runtime API (Internal Only)

* POST /compile
* POST /quick-update
* POST /workspace/generate
* POST /workspace/discover
* POST /align
* GET /query
* GET /artifacts/*
* GET /stats

CCC Execution Model Evolution

Phase 6.5A — CLI Bridge (Current Temporary State)

* Node.js CCCService wrapper using exec("ccc ...")
* Replace all CLI usage with internal service calls

Phase 6.5B — Runtime Integration (Target State)

* Replace subprocess execution with:

import { generateContext } from "ccc/generator"

⸻

🧠 Phase 6.6 — CCC Internal Architecture (IR LAYER)

Core Runtime Objects (IN MEMORY, NOT FILES)

* Symbol Graph (live)
* Dependency DAG (incremental)
* Route Registry (live API map)
* Workspace Topology Graph
* Artifact Cache Layer

Incremental Compilation Engine

* File-change → affected-symbol propagation
* Dependency-aware partial recompilation
* Artifact-level invalidation (not full scan)
* Coalesced mutation batching (queue-based)

⸻

⚙️ Phase 6.7 — Event-Driven CCC Integration

Event Hooks (CCC → bldr)

* fs:file.changed → CCC incremental queue
* ccc:compile.started
* ccc:artifact.updated
* ccc:alignment.completed
* git:session.created
* ai:operation.completed

Flow Model

File Mutation
   ↓
WorkspaceMutationService
   ↓
RuntimeEvent emitted
   ↓
CCC Queue
   ↓
Incremental Compilation
   ↓
Artifact Update
   ↓
Telemetry + UI Update
   ↓
AI Context Invalidation

⸻

🔁 Phase 6.8 — Deterministic Replay System (CHD EVOLUTION)

Replay Model Upgrade

* Every mutation assigned:
    * artifact_generation_id
    * workspace_hash
    * dependency_graph_hash
    * symbol_graph_hash

Replay Engine

* SQLite journal → full system reconstruction
* Event stream + artifact snapshot pairing
* Deterministic rebuild of entire workspace state

⸻

⚡ Phase 6.9 — CCC Worker Queue System

Execution Control

* Introduce mutation queue layer:
    * PQueue / BullMQ (initial)
* Single worker runtime (Phase 1)
* Coalescing of FS events (debounce windows)
* Priority-based compilation scheduling

Critical Rule

* ❌ No inline compilation in API request cycle
* ✔ All CCC operations are async + queued

⸻

🧾 Phase 7 — Mobile UX & Intelligence (ACTIVE)

* Multi-provider AI support (Gemini, MiMo, OpenAI)
* Real-time AI metrics + metadata
* Mobile-first UI (portrait optimized)

In Progress

* Voice input system
* Block-based approvals UX refinement
* Intent-based branching sandbox mode
* Thumb-zone gesture optimization

⸻

🛡 Phase 8 — Stability & Infrastructure Hardening

* WebContainers sandbox integration
* Asset preview system (images/videos/code diffs)
* Automatic dependency graph visualization (live CCC graph)
* Backpressure handling for mutation spikes
* Queue overflow protection + throttling policies

⸻

🔗 Phase 9 — Production Sync Layer

* GitHub PR export system (fully automated)
* Conflict locking mechanism (multi-agent safety)
* Environment variable secret manager
* CI integration with CCC alignment gate

⸻

🧩 Phase 10 — CCC First-Class Runtime Promotion (FINAL TARGET STATE)

This is the architectural end state.

CCC becomes:

* ✔ Deterministic runtime cognition engine
* ✔ In-memory semantic graph system
* ✔ Workspace truth layer (not filesystem scans)
* ✔ AI context compiler (not CLI tool)
* ✔ Replayable computation layer

bldr becomes:

* Runtime orchestrator
* Event-driven mutation system
* AI execution environment
* CCC consumer (not controller)

⸻

🚨 Critical Architectural Rule (NON-NEGOTIABLE)

The filesystem is no longer the source of intelligence.

It is only:

* persistence layer
* snapshot layer
* replay substrate

Truth lives in:

* CCC IR graph
* Runtime event stream
* Mutation authority system

⸻

🧭 Immediate Next Step (Recommended Order)

1. Keep current Railway deployment stable (no refactor yet)
2. Replace CLI CCC calls → CCC runtime service (Phase 6.5A)
3. Introduce event → CCC queue integration (Phase 6.7)
4. Move CCC into sidecar Python service on Railway
5. Begin removing exec("ccc ...") entirely
6. Promote CCC IR into in-memory graph system

⸻
