# LLM.md — Architectural Conventions & Rules

## 🏛️ Product Constitution
**North Star:** “Instruction over Typing.”
bldr is an **execution layer for developer intent**—AI writes, human decides.

## 🛠️ Stack & Principles
* **Backend:** Node.js (Vite + Express), SQLite, Socket.io, Chokidar (FS Sync)
* **Frontend:** React, Tailwind CSS, Lucide React, Framer Motion
* **Intelligence:** Gemini 3 Flash Preview (Experimental), Vertex AI Embeddings
* **Execution:** AI as a system component, not a feature.

## 📜 Coding Rules
1. **Intelligence > Interface:** Prioritize functionality that enhances the AI's ability to reason over UI fluff.
2. **Context = Moat:** Always update and reference CCC artifacts (`WORKSPACE.md`, `LLM.md`, `CONTEXT.md`).
3. **Mobile-First Clarity:** Design interactions that are tap-friendly and block-based.
4. **Git = Time Machine:** Use session branches for undo/redo logic. Publish via PR.
5. **Instruction First:** Prefer describing intent and letting the AI execute rather than manual typing.

## 🏗️ Architecture Conventions
* **CCC Protocol:** Filesystem is the source of truth. Any change must trigger a Tiered Update.
* **Event Bus:** All changes flow through a central server-side emitter to prevent state drift.
* **Safety:** Scoped writes, no path traversal, gated deletes.
* **Feedback:** Continuous health checks (lint/build) surfaced in the UI.
