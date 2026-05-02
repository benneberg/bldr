# bldr Architecture

## 1. System Overview

bldr follows a **Workspace-Centric** architecture designed to bridge the gap between fragmented mobile interfaces and complex multi-repo codebases.

```
[ iPhone / Browser ] <--- SSE/JSON ---> [ Express Server ] <--- API ---> [ Gemini AI ]
                                              |
                                     [ SQLite + Filesystem ]
```

## 2. Data Schema (SQLite)

### `projects`
Stores the top-level workspace information and global configuration.
- `id`: UUID (Primary Key)
- `name`: Workspace display name
- `workspace_config`: JSON blob for CCC metadata

### `repositories`
Links multiple Git repositories to a single workspace.
- `id`: UUID
- `project_id`: Link to project
- `path_prefix`: The folder where the repo is stored (e.g., `services/api`)
- `tags`: Metadata for AI focus targeting (e.g., `backend, infra`)

### `files`
Flat registry of all files across all repositories.
- `path`: Normalized path within the workspace
- `repository_id`: The originating service

## 3. Context Layer (The CCC Strategy)

To keep token usage low while maintaining high AI comprehension, bldr generates "Context Artifacts" after every import or major change:

1. **WORKSPACE.md**: A flattened map of the entire directory structure.
2. **LLM.md**: A summarized extraction of package.json dependencies, file extensions, and common patterns to define the "Architectural Convention".
3. **Package-level CONTEXT.md**: Localized code summaries for individual services.

## 4. Security & Interception

- **Dry Run Interceptor**: The frontend intercepts `write_file` and `replace_in_file` function calls when Dry Run is active, surfacing a UI modal to the user for approval.
- **Path Jailing**: All file operations are sanitized to prevent directory traversal outside the `workspace/{id}` root.
- **Preview Sandbox**: The preview iframe uses `sandbox="allow-scripts allow-forms allow-same-origin"` to isolate running code from the editor environment.
