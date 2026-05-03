# bldr Causal History Debugger (CHD)
**Final Implementation Specification: Git-Based Time Travel + Event-Causality Graph**
## 0. Core Thesis & Vision
bldr is **not** a traditional IDE. It is an **Intent Execution System**:
User Intent → AI (Gemini) → Code Mutation → Git Session → Filesystem Sync
**The hidden opportunity:** Because state is versioned by design and AI is a first-class actor, you already possess a complete causal graph of software development.
The debugger is simply a visualization and traversal layer over that graph. You are **not** building a step debugger, a breakpoint manager, or a log viewer.
You are building:
> **A Git-backed, event-driven causality engine for AI-generated code.**
> It answers: *“What sequence of human + AI decisions led to this failure?”*
> 
## 1. Architectural Principle (Non‑Negotiable)
To protect long-term performance and prevent bloat, there is a **strict responsibility split** between the bldr Core and the Debugger Plugin.
### ✅ bldr Core (Source of Truth & Dumb Emitter)
Responsible only for:
 * AI execution & Git sessions
 * Filesystem sync (chokidar)
 * CCC tier classification
 * **Event emission (Synchronous, lightweight, non-blocking)**
*Core MUST NOT build graphs, run AI analysis, block execution flow, or know about debugger UI state.*
### 🔌 Debugger Plugin (Smart Sidecar / Interpretation Layer)
Isolated in plugins/debugger/, responsible for:
 * Event ingestion & SQLite persistence
 * Timeline & causal graph construction
 * Git state replay (checkout, diff)
 * Mobile UI visualization
 * Optional AI insight generation
### System Flow
```text
bldr Core
  ├── Git Manager
  ├── CCC Engine
  ├── FS Watcher
  └── Debug Adapter (thin emitter only)
               ↓ (Event Bus / Socket.io)
       Debugger Plugin (isolated sidecar)
            ├── Event Consumer & SQLite DB
            ├── Causality Engine (Graph Builder)
            ├── Git Replay Engine
            ├── Mobile Timeline UI
            └── Insight Engine (AI)

```
## 2. Core Data Model: DebugEvent
Core must emit structured events. Everything revolves around this normalized single unit of truth.
```ts
type DebugEvent = {
  id: string;                    // UUID
  parentId?: string;             // Direct causality predecessor (if known by Core)
  timestamp: number;
  sessionId: string;
  
  type:
    | "ai:action"
    | "git:commit"
    | "fs:change"
    | "runtime:error"
    | "runtime:log"
    | "runtime:preview";
    
  gitRef: {
    branch: string;
    commit: string;
  };

  cccTier?: 1 | 2 | 3;           // 1=File, 2=Config, 3=Structure
  replayable?: boolean;          // Can this action be deterministically replayed?
  
  payload: Record<string, any>;  // Event-specific data
  
  links?: {                      // Populated later by the Causality Engine
    causedBy?: string;
    resultedIn?: string;
  };
};

```
## 3. Lightweight Event Persistence
The Debugger Plugin maintains a local SQLite journal inside the project registry.
**Table: debug_events**
```sql
CREATE TABLE debug_events (
  id TEXT PRIMARY KEY,
  timestamp INTEGER,
  session_id TEXT,
  type TEXT,
  branch TEXT,
  commit_hash TEXT,
  ccc_tier INTEGER,
  payload TEXT,
  parent_id TEXT
);

```
**Why?** Enables offline debugging, state replay, fast graph rebuilding on reload, and serves as a future dataset for fine-tuning models.
## 4. The Causality Engine (Plugin Only)
The core emits linear events; the plugin builds the **versioned event graph**.
 * **Nodes:** DebugEvents
 * **Edges:** parentId links + inferred relationships
 * **Anchors:** Git commits act as state snapshots
### CCC-Aware Debugging
Because bldr categorizes intent, the debugger natively understands the *weight* of a change:
| Tier | Meaning | Debug Implication |
|---|---|---|
| **1** | File change | Local syntax / logic bug |
| **2** | Config change | Environment / system bug |
| **3** | Structural change | Architectural / routing issue |
*Example Outcome:* The engine maps a runtime error to a Git change, traces it to an AI action, and highlights: *"Failure correlates with Tier 2 config mutation — likely environment mismatch."*
## 5. Git-Based Time Travel Model
Git replaces traditional code stepping. Every debugger action is a Git traversal.
 * **Restore state:** git checkout <commit>
 * **View changes:** git diff A..B
 * **Replay sequence:** Re-execute flagged replayable: true AI actions and file mutations.
## 6. Mobile-First Debug UX
Traditional IDE debugging (breakpoints, variable inspectors, stack trees) fails on mobile.
**Build Instead: Block-Based Timeline UI**
 * **Interaction:** Tap to expand a causal chain/diff; swipe to navigate history; tap button to "Restore this state".
 * **Windowing:** Only load the last 50–100 events to maintain mobile performance.
```text
┌──────────────────────────────────┐
│ 🔵 AI: Refactored Auth Service   │
│ ⚪ Commit: a1b2c3                │
│ 🔴 Error: token undefined        │
│                                  │
│  [View Cause]  [Restore State]   │
└──────────────────────────────────┘

```
## 7. AI Insight Layer (Optional Phase)
Do not block the core release on AI. Build value with the timeline and Git navigation first. Once mature, introduce the AI Insight Layer.
**Input:** Git Diff + Runtime Error + Event Chain
**Target Output:**
```json
{
  "rootCause": "AI refactor removed config.token initialization",
  "explanation": "The auth service requires a token on boot, but commit a1b2c3 deleted it.",
  "suggestedFix": "...diff...",
  "linkedCommit": "a1b2c3",
  "confidence": 0.95
}

```
*Fine-Tuning Strategy:* Focus strictly on blame localization and event-chain comprehension, not general coding capabilities.
## 8. Performance & Safety Guardrails
**Do NOT:**
❌ Embed graph logic, heavy computation, or AI analysis in bldr Core.
❌ Attempt to recreate a traditional breakpoint debugger.
❌ Make the core system dependent on the debugger (the plugin must be able to crash without taking down the core).
**DO:**
✅ Debounce filesystem events (chokidar batching).
✅ Compress noisy runtime logs.
✅ Lazy-load file contents and Git diffs in the UI.
## 9. Implementation Roadmap
 * **Phase 1 — Core Foundation (1–2 days):** Add DebugEvent TS schema, hook up the thin emitter in bldr Core (AI, Git, FS, errors), and stand up the SQLite debug_events table.
 * **Phase 2 — Timeline Viewer (2–4 days):** Build the event consumer, group events by commit, and render the basic mobile block UI.
 * **Phase 3 — Git Time Travel (3–7 days):** Implement diff viewing, commit navigation, and one-tap git checkout state restoration.
 * **Phase 4 — Causality Engine (1–2 weeks):** Build the graph logic linking errors → commits → AI actions → original prompts, factoring in CCC tiers.
 * **Phase 5 — AI Insights (Future):** Add prompt-based (and later, fine-tuned) root-cause analysis based on causal chains.
