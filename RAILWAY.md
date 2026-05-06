# Railway Deployment & Persistence

To ensure that your projects, files, and chat history are saved when you deploy to Railway, you must use a **Persistent Volume**. By default, Railway's filesystem is ephemeral, meaning all data is lost when the app restarts or redeploys.

## Setup Instructions

1.  **Add a Volume in Railway:**
    *   Go to your Railway project dashboard.
    *   Click **+ New** -> **Volume**.
    *   Mount it to exactly: `/app/data`.

2.  **Configure Environment Variables:**
    *   In your Railway Service settings, go to the **Variables** tab.
    *   Add a new variable: `DATA_DIR`.
    *   Set its value to: `/app/data`.

3.  **Redeploy:**
    *   Railway will restart your application with the new volume and environment variable.
    *   All data stored in `mimo.db`, `workspace/`, and `uploads/` will now persist in that volume at `/app/data`.

## Why this is necessary
Railway's default workdir is `/app`. By mounting at `/app/data` and setting `DATA_DIR=/app/data`, we ensure the app has stable access to its database and workspace files across deployments. If you choose a different path like `/data`, you **must** update the `DATA_DIR` environment variable to match it exactly.
