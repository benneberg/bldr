# Railway Dual-Service Implementation Spec (Production)

⸻

🧭 Overview

This document defines the exact deployment architecture for bldr + CCC on Railway.

It is strictly implementation-level and not conceptual.

⸻

🏗 System Topology

Railway Project

bldr-platform (Railway Project)
│
├── Service A: bldr (Node.js)
└── Service B: ccc-runtime (Python FastAPI)

⸻

📁 Folder Structure

Monorepo (Recommended)

/bldr-platform
  /server            → Node.js runtime (bldr)
  /ccc-runtime       → Python CCC service
  /shared            → optional contracts/types

⸻

⚙️ Service A — bldr (Node Runtime)

Responsibilities

* UI (mobile-first IDE)
* AI orchestration
* mutation authority
* git sessions
* sandbox execution
* CCC client (HTTP only)

⸻

Railway Config

[build]
builder = "RAILPACK"
buildCommand = "npm run build"
[deploy]
startCommand = "node --import tsx server.ts"
healthcheckPath = "/health"

⸻

Environment Variables

CCC_RUNTIME_URL=http://ccc-runtime.railway.internal:8000
DATA_DIR=/app/data
NODE_ENV=production

⸻

CCC Client (Node)

export class CCCService {
  constructor(private baseUrl: string) {}
  async quickUpdate(projectId: string, changedFiles: string[]) {
    return fetch(`${this.baseUrl}/quick-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, changedFiles })
    }).then(r => r.json());
  }
  async query(projectId: string, term: string, type: string) {
    return fetch(`${this.baseUrl}/query?term=${term}&type=${type}`)
      .then(r => r.json());
  }
  async align(projectId: string) {
    return fetch(`${this.baseUrl}/align`, {
      method: "POST",
      body: JSON.stringify({ projectId })
    }).then(r => r.json());
  }
}

⸻

🧠 Service B — ccc-runtime (Python FastAPI)

Responsibilities

* deterministic code analysis
* symbol indexing
* dependency graph generation
* query engine
* alignment engine
* incremental compiler

⸻

Railway Config

[build]
builder = "NIXPACKS"
[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port 8000"

⸻

Requirements

fastapi
uvicorn
watchdog
networkx
sqlite-utils
pydantic

⸻

Environment Variables

DATA_DIR=/app/data
CCC_MODE=production
LOG_LEVEL=info

⸻

🔌 API Contract (CCC Runtime)

⸻

Incremental Compile

POST /quick-update

⸻

Full Compile

POST /compile

⸻

Query Engine

GET /query?term=user&type=context

⸻

Alignment Check

POST /align

⸻

Workspace Generation

POST /workspace/generate

⸻

Artifact Access

GET /artifacts/*

⸻

💾 Shared Volume (CRITICAL)

Mounted on BOTH services:

/app/data

Contents:

/app/data
  /workspace
  /projects
  /.llm-context
  /cache
  /sqlite
  /artifacts

⸻

🔁 Runtime Execution Flow

User Action
   ↓
bldr MutationAuthority
   ↓
RuntimeEvent emitted
   ↓
CCC HTTP request
   ↓
ccc-runtime queue
   ↓
incremental compile
   ↓
artifact update
   ↓
AI context refresh
   ↓
UI update

⸻

🚨 Hard Rules

❌ Forbidden

* exec(“ccc …”)
* direct filesystem coupling between services
* CCC triggering mutations
* CLI-based orchestration

⸻

✅ Required

* HTTP-only communication
* Node as orchestrator
* CCC as analysis engine only
* shared volume only for persistence

⸻

🧠 Design Guarantees

This architecture ensures:

✔ deterministic execution

✔ clean separation of concerns

✔ scalable compute isolation

✔ Railway-native deployment

✔ safe AI orchestration layer

✔ mobile-first responsiveness

⸻

🧭 Deployment Steps

1. Create Railway Project

Add two services:

* bldr
* ccc-runtime

⸻

2. Attach Shared Volume

Mount:

/app/data

to both services.

⸻

3. Set Internal URL

CCC_RUNTIME_URL=http://ccc-runtime.railway.internal:8000

⸻

4. Replace CLI Execution

Remove all:

exec("ccc ...")

Replace with:

fetch(CCC_RUNTIME_URL + ...)

⸻

🧭 Final System Outcome

After deployment:

bldr becomes:

* AI IDE
* orchestration engine
* mutation controller
* product layer

CCC becomes:

* deterministic code intelligence engine
* analysis subsystem
* query + graph engine

⸻
