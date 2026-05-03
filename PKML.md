# PKML.md — Product Knowledge & Philosophy

## 🧬 The bldr DNA
bldr is not just another editor; it is a **deterministic execution engine** for developer intent. Our philosophy is that code is a byproduct of architecture, and architecture is best managed through high-level instructions.

## 📈 Status Report (May 2026)
### Current State
* **Sync Engine Established:** Chokidar-based FS watcher prevents drift between the filesystem and the IDE database.
* **Causal History Debugger (CHD):** Real-time monitoring of AI actions and runtime errors, enabling "time-travel" debugging on mobile.
* **Architecture-First UI:** Navigation is centered around Chat and CHD rather than a file tree.

### Recent Breakthroughs
* **Tiered Context Updates:** The system now intelligently regenerates only the parts of the context (CCC) affected by local changes.
* **Deterministic Debugging:** The IDE can now trace runtime failures back to the specific AI instruction or file change that caused them.

## 🚀 Future Goals
1.  **Git-Backed Sessions (Active):** Moving towards a hands-free "Dictation to PR" workflow using real git branches for robust version control.
2.  **Voice Interaction (Phase 7):** Implementing natural language commands for mobile-first hands-free development.
3.  **Semantic Vector Search:** Integrating `sqlite-vss` for true multi-repo code discovery.
4.  **WebContainers:** Running full build/test cycles locally in the browser sandbox.

## 🛡️ Stability Delta
Current health checks monitor for linting errors and build breakages across all imported repositories.
