# bldr — Build Anywhere, Intelligently

**bldr** is a mobile-first, AI-powered development environment designed for high-density code iteration on the go. It implements deterministic AI tool control and automated context compilation to make solo development efficient and reliable.

## 🚀 Core Features

- **Multi-Repository Workspaces**: Import multiple GitHub repositories into a single unified workspace.
- **CCC (Code Context Compiler)**: Automatically generates `WORKSPACE.md` and `LLM.md` artifacts to provide the AI with structural and architectural awareness without wasting tokens.
- **PKML Native**: Built-in support for Product Knowledge Markup Language to ensure AI changes align with product intent.
- **Deterministic Tooling**: The AI interacts with your code through a strictly defined set of tools (read/write/list/align), providing logs and status updates for every action.
- **Sophisticated Dark UI**: A refined, low-eye-strain interface optimized for mobile OLED screens and deep concentration.
- **Live Preview**: Isolated iframe sandbox for instant verification of web applications.

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
