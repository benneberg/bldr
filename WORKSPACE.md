# WORKSPACE.md — Project Structure & Service Map

## 📂 IDE Core Structure
* `/src` — Frontend application (React + Vite)
* `/server.ts` — Main IDE server (Express, Socket.io, Tool handlers)
* `/workspace` — Persistent storage for user projects
* `/uploads` — Temporary storage for imports
* `/metadata.json` — IDE configuration and permissions

## 🛠️ Service Definitions
| Service | Role | Tech Stack |
| :--- | :--- | :--- |
| **IDE Client** | Primary UI | React, Tailwind, Framer Motion |
| **IDE Server** | Execution Layer | Node.js, Express, SQLite |
| **Sync Engine** | FS Monitoring | Chokidar |
| **CCC Engine** | Intelligence Layer | Gemini API, FS Processing |

## 🔗 Repository Connections
This workspace is designed to manage multiple git-backed repositories simultaneously.

## 📡 Live Endpoints
* `GET /api/projects` — List active workspaces
* `POST /api/import/github` — Import a new service
* `WS /socket.io` — Real-time event bus
