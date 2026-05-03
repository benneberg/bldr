# bldr — Build Anywhere, Intelligently

**bldr** is an **execution layer for developer intent**, designed for high-density engineering and mobile-first productivity. It transitions development from "typing in an IDE" to "instructing an AI system" that manages full dev infra.

## 🚀 Core Features

- **Causal History Debugger (CHD)**: Real-Time event bus that correlates AI actions, Git commits, and runtime errors to provide instant root-cause analysis.
- **Sync Engine (Phase 6)**: Real-time filesystem synchronization with `chokidar` ensures zero drift between the AI's internal model and the codebase.
- **Multi-Repository Workspaces**: Unified management of complex service architectures in a single "pocket" interface.
- **CCC Protocol (Memory Layer)**: Automated, tiered generation of `WORKSPACE.md`, `LLM.md`, and `CONTEXT.md` artifacts for perfect AI comprehension.
- **Instruction-First UI**: A mobile-optimized interface where Chat is the IDE and the editor is a secondary tool for inspection.
- **Git-Backed Sessions**: AI changes use transient branches for deterministic undo/redo logic.
- **Dry Run Protection**: AI-proposed changes are presented as block-based PR summaries for touch-friendly user approval.
- **Sandbox Terminal**: Integrated shell execution for running builds, lints, and services in real-time.
- **Real-time Collaboration**: Multi-user presence and editor sync for remote pairing sessions.

## 🛠 Tech Stack

- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **AI**: Gemini 2.0/3.0 Flash with advanced Function Calling (Tool Use)
- **Context**: Code Context Compiler (CCC) methodology

## 📂 Workspace Structure

bldr workspaces use a flat hierarchy optimized for AI ingestion:
- `/WORKSPACE.md`: Global inventory of all connected repositories and services.
- `/LLM.md`: Registry of tech stack conventions and architectural rules.
- `/PKML.md`: Source of truth for product goals and requirements.
- `/services/{repo-name}`: The actual codebase for each attached repository.

## 📥 Getting Started

1. **Create a Workspace**: Start by naming your project.
2. **Attach Repositories**: Import one or more repositories via GitHub URL.
3. **Chat and Code**: Ask the AI to build features. It will use the generated context to understand the relationships between your services.
4. **Preview**: Verify your changes in the Live Preview tab.
