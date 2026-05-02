#bldr future goal

---

## 📦 **bldr — Complete Product & Engineering Spec (Condensed)**

**Positioning**

* **MICRA** → Cursor competitor with precise AI control
* **bldr** → Full dev infra ecosystem (this doc)
* Target: *Cursor-lite for mobile with deterministic AI execution*

---

## 🏛️ **1. Product Constitution**

### North Star

**“Instruction over Typing.”**
bldr is an **execution layer for developer intent**—AI writes, human decides.

### Core Loop (Non-negotiable)

1. Intent (voice/text)
2. AI understands (CCC artifacts)
3. Proposes changes (block-based)
4. User approves (mobile-first UX)
5. Git-backed execution (session branches)
6. CCC auto-updates (incremental)

👉 If a feature doesn’t strengthen this loop → cut it.

---

### Core Principles

* **Intelligence > Interface** → Chat is the IDE, editor is secondary
* **Context = Moat** → Multi-repo CCC > everything else
* **Mobile-first clarity** → Tap, don’t type
* **Git = Time machine** → No custom undo systems

---

### What bldr IS

* Multi-repo architect in your pocket
* Intent → PR pipeline
* AI-driven iteration + review engine

### What it is NOT

* VS Code clone
* Terminal emulator
* Chatbot wrapper

### Strict Deferrals

Marketplace, multi-model A/B, CRDT, enterprise auth

---

## 🗺️ **2. Roadmap (Condensed)**

### ✅ Foundation (Done)

Workspace, multi-repo, AI tools, CCC generation, diff preview, terminal, collab

### 🏗 Phase 6 — Sync Engine (Critical)

* FS watcher (`chokidar`)
* Incremental CCC (Tier 1/2/3)
* Git-backed sessions (replace snapshots)
* Semantic search (`sqlite-vss` + embeddings)

### 📱 Phase 7 — Mobile UX

* Voice input
* Block-based approvals
* Intent-based branching (sandbox mode)

### 🛡 Phase 8 — Stability

* WebContainers sandbox
* Asset previews
* Dependency graph

### 🔗 Phase 9 — Sync to Production

* GitHub PR export
* Conflict locking

---

## 📜 **3. CCC Protocol (AI Memory System)**

### Artifacts

* **WORKSPACE.md** → repo map
* **LLM.md** → rules, stack, conventions
* **[SERVICE]/CONTEXT.md** → service-level understanding

### Tiered Updates

* Tier 1 → file change → update service context
* Tier 2 → config change → update rules + workspace
* Tier 3 → repo change → full regeneration

**Rule:** Filesystem = source of truth

---

## 🏗️ **4. Architecture Overview**

```
Client (Mobile/Web)
   ↕ SSE/WebSocket
Express Server
   ├─ Event Bus
   ├─ CCC Engine
   ├─ Git Manager
   ├─ chokidar (FS watcher)
   └─ SQLite (+ vector search)
        ↕
      Filesystem
        ↕
      Gemini API
```

---

### Key Decisions (ADRs)

* **Git Sessions**

  * Each AI session = branch
  * Undo = `git reset`
  * Publish = PR

* **FS ↔ DB Sync**

  * `chokidar` + debounce
  * Batch updates → CCC queue
  * FS always wins

* **AI Safety**

  * Scoped writes per repo
  * No path traversal
  * Deletes gated

---

## ⚙️ **5. Critical Systems**

### Event Bus

All changes flow through a central emitter → prevents drift

### CCC Engine

* Priority queue
* Tier-based updates
* Token-efficient

### Semantic Search

* Embeddings (`text-embedding-004`)
* `sqlite-vss` + hybrid ranking

### Git Session Manager

* Branch per intent
* Commit on approval
* Auto PR generation

---

## 📱 **6. Mobile UX Principles**

* Tap > type
* Thumb-zone actions (bottom UI)
* Chat = primary interface
* Editor = inspector
* Block-based approvals (not full diffs)
* Visible progress (no “waiting”)

---

## 🛡️ **7. Security & Stability**

* API keys server-only
* Sandbox isolation (WebContainers target)
* Dry-run diffs before write
* Rate limiting + queue prioritization

---

## 📊 **8. Success Metrics**

**UX**

* AI response < 3s
* Approve action < 1s
* PR publish < 5s

**System**

* CCC lag < 2s
* Zero FS/DB drift

**Adoption**

* > 60% mobile usage
* > 40% session → PR

---

## 🧭 **9. Core Insight (80/20)**

**Most value comes from:**

* CCC freshness
* Git session model
* Block-based UX
* Voice input
* PR export

Everything else is secondary.

---

## 🚀 **10. North Star Feature**

**Intent-Based Branching**

“Replace REST with GraphQL”

→ bldr:

1. Creates branch
2. Updates all services
3. Runs checks
4. Shows results
5. One-tap merge/reject

---

## ⚡ **Usage Rule**

* Build only what strengthens the Core Loop
* Prioritize sync + CCC before new features
* Treat AI as a system component, not a feature

---
