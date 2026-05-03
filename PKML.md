# PKML.md — Product Knowledge & Philosophy

## 🧬 The bldr DNA
bldr is not just another editor; it is a **deterministic execution engine** for developer intent. Our philosophy is that code is a byproduct of architecture, and architecture is best managed through high-level instructions.

## 📈 Status Report (May 2026)
### Current State
* **Sync Engine Established:** Chokidar-based FS watcher prevents drift between the filesystem and the IDE database.
* **Architecture-First UI:** Navigation is centered around Chat and Architecture Visualization rather than a file tree.
* **Deterministic AI:** Tools are gated and results are previewed via an approval-based diff system.

### Recent Breakthroughs
* **Tiered Context Updates:** The system now intelligently regenerates only the parts of the context (CCC) affected by local changes, preserving token budget.
* **Mobile-First Interaction:** Bottom-anchored navigation and block-based PR summaries implemented.

## 🚀 Future Goals
1.  **Semantic Vector Search:** Integrating `sqlite-vss` for true multi-repo code discovery.
2.  **Voice Interaction:** Moving towards a hands-free "Dictation to PR" workflow.
3.  **Git-Backed Sessions:** Replacing snapshots with real git branches for robust version control.
4.  **WebContainers:** Running full build/test cycles locally in the browser sandbox.

## 🛡️ Stability Delta
Current health checks monitor for linting errors and build breakages across all imported repositories.
