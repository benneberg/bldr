# MiMo Workspace Evolution Plan (CCC + PKML)

This plan outlines the integration of `ccc` (Code Context Compiler) and `PKML` (Product Knowledge Markup Language) philosophies into MiMo.

## 1. Data Model Evolution
Convert MiMo from a single-repository model to a **Workspace** model that supports multiple repositories (services).

### New Schema Concepts:
- **Project (Workspace)**: The top-level container.
- **Repository (Service)**: A GitHub repo or local folder within the workspace.
- **Tags**: Metadata for repositories (e.g., `frontend`, `auth-service`).
- **Focus Mode**: A state where the AI only "sees" files within specific repositories/tags.

## 2. CCC (Code Context Compiler) Integration
MiMo will automatically maintain a `.mimo-context/` (or similar) layer to provide the AI with high-level architecture without consuming massive tokens.

### Key Artifacts:
- `LLM.md`: Automatically generated summary of tech stack, architectural patterns, and coding conventions.
- `WORKSPACE.md`: Overview of all repositories in the project, their dependencies, and roles.
- `CONTEXT_TREE.md`: A flattened tree representation of the workspace for AI spatial awareness.

## 3. PKML (Product Knowledge Markup Language)
Implementing @benneberg's standard for product documentation.

### Features:
- `PRODUCT.md / PKML.md`: Stores the "Why" and "What" of the product.
- **Alignment Checks**: A tool for the AI to verify if a new feature request contradicts the existing product knowledge or architectural conventions in `LLM.md`.

## 4. Implementation Steps

### Phase 1: Multi-Repo Infrastructure
- Update SQLite schema: `repositories` table linked to `projects`.
- Update `files` table to include `repository_id`.
- Refactor GitHub Import to support adding multiple repos to one project.

### Phase 2: CCC Context Engine
- Implement `generate_workspace_context()` in `server.ts`.
- Use Gemini to analyze the codebase post-import to bootstrap `LLM.md`.
- Inject `LLM.md` into the system prompt for every chat session.

### Phase 3: UI Enhancements
- Nested File Explorer: `Workspace > Repository > Files`.
- "Focus" selector in the Chat UI to limit AI context to specific services.
- "Alignment" indicator showing if code matches documentation.

## 5. Token Efficiency Strategy
Instead of sending every file:
1. AI reads `WORKSPACE.md` and `LLM.md` initially.
2. AI uses `list_files` (with service filtering) to find relevant code.
3. AI only reads specific files it identifies as necessary.
