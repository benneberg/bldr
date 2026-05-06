# Railway Deployment & Persistence

To ensure that your projects, files, and chat history are saved when you deploy to Railway, you must use a **Persistent Volume**. By default, Railway's filesystem is ephemeral, meaning all data is lost when the app restarts or redeploys.

## Setup Instructions

1.  **Add a Volume in Railway:**
    *   Go to your Railway project dashboard.
    *   Click **+ New** -> **Volume**.
    *   Mount it to a path, for example: `/data`.

2.  **Configure Environment Variables:**
    *   In your Railway Service settings, go to the **Variables** tab.
    *   Add a new variable: `DATA_DIR`.
    *   Set its value to the mount path you chose (e.g., `/data`).

3.  **Redeploy:**
    *   Railway will restart your application with the new volume and environment variable.
    *   All data stored in `mimo.db`, `workspace/`, and `uploads/` will now persist in that volume.

## Why this is necessary
Railway (and most cloud container platforms) treats the local disk as temporary. Any file created while the app is running is erased during the next deployment. By mounting a volume at `/data` and telling the app to use it via `DATA_DIR`, we ensure that the database and file storage remain intact across updates.
