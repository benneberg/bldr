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

🧠 Phase 1 — CCC Runtime Integration (IN PROGRESS)

CCC Role Definition (IMPORTANT)

CCC is a deterministic code understanding engine, not a system controller.

CCC IS responsible for:

* symbol extraction
* dependency graphs
* route indexing
* query engine
* alignment validation
* incremental codebase analysis

CCC is NOT responsible for:

* orchestration
* mutation execution
* AI decision making
* git operations

⸻

Architecture Split

bldr (Node runtime)

* product runtime
* AI orchestration
* mutation authority
* UI / mobile IDE
* git workflows
* sandbox execution

CCC runtime (Python service)

* code analysis engine
* graph + symbol system
* query engine
* deterministic context generation

⸻

Communication Model

All CCC access goes through:

HTTP API (no CLI execution)

⸻

CCC Integration Flow

User Action
   ↓
bldr MutationAuthority
   ↓
RuntimeEvent emitted
   ↓
CCC runtime API call
   ↓
Incremental analysis
   ↓
Artifacts updated (.llm-context)
   ↓
AI context refreshed

⸻

📦 Phase 2 — AI Development Workflow Engine (CORE PRODUCT)

Primary User Workflow

1. Intent → Spec

* user provides PRD.md
* AI generates open-specs.md

2. Spec → Codebase

* multi-repo scaffold generation
* service + frontend + API structure

3. Continuous Evolution

* refactor code
* add features
* security reviews
* architecture improvements

⸻

🧠 Phase 3 — CCC-Aware Context System

CCC is used ONLY for:

* context injection
* dependency awareness
* impact analysis
* symbol lookup

⸻

AI Context Flow

User Request
   ↓
CCC query (symbol / route / impact)
   ↓
Context assembly
   ↓
LLM prompt injection
   ↓
Code generation / refactor

⸻

📱 Phase 4 — Mobile-First Development UX

Core Principle

“IDE designed for thumbs, not keyboards”

Features

* chat-first interface
* swipe-based diffs
* block approvals
* gesture-driven actions
* voice input (future)
* live sandbox preview

⸻

🧪 Phase 5 — Sandbox Execution Layer

* React sandbox runtime
* Python execution sandbox
* safe AI execution layer
* real-time preview system

⸻

🛡 Phase 6 — System Stability Layer

* WebContainers integration
* secret management system
* dependency graph visualization
* mutation locking system

⸻

🔗 Phase 7 — Git + Production Integration

* PR generation system
* multi-repo commit orchestration
* CI integration
* rollback system

⸻

🧠 Phase 8 — CCC Maturity (FREEZE ZONE)

CCC evolves ONLY in:

* performance improvements
* caching optimization
* graph accuracy
* incremental computation

❌ No feature expansion beyond analysis

⸻

🚨 Core Architectural Principle

bldr is the system. CCC is a subsystem.

⸻

System Hierarchy

1. User Intent (chat / PRD / UI)
2. bldr runtime (orchestrator)
3. AI reasoning layer
4. CCC analysis layer
5. filesystem (persistence only)

⸻

🧭 Immediate Next Step (Recommended Order)

1. Keep current Railway deployment stable (no refactor yet)
2. Replace CLI CCC calls → CCC runtime service (Phase 6.5A)
3. Introduce event → CCC queue integration (Phase 6.7)
4. Move CCC into sidecar Python service on Railway
5. Begin removing exec("ccc ...") entirely
6. Promote CCC IR into in-memory graph system

