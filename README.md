# FireLab

A web-based platform to manage and configure Firebase emulators locally.

## Prerequisites

- Node.js (v18+)
- Firebase CLI: `npm install -g firebase-tools`
- Firebase account (optional - only needed for deploying rules to production)

## Setup

### Full Setup (Both Backend & Frontend)

```bash
git clone <your-repo-url>
cd firelab

# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

### Backend Only (For Remote Machine)

```bash
# Clone only backend folder
git clone --no-checkout <your-repo-url>
cd firelab
git sparse-checkout init --cone
git sparse-checkout set backend
git checkout

# Install dependencies
cd backend
npm install
```

### Frontend Only (For Local Machine)

```bash
# Clone only frontend folder
git clone --no-checkout <your-repo-url>
cd firelab
git sparse-checkout init --cone
git sparse-checkout set frontend
git checkout

# Install dependencies
cd frontend
npm install
```

## Running the Application

### Option 1: Local Development (Same Machine)

### Start Backend (Terminal 1)
```bash
cd backend
npm run dev
```
Backend runs on: http://localhost:3001

### Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
Frontend runs on: http://localhost:5173

---

### Option 2: Remote Emulator (Different Machine)

**On Backend Machine (where emulators run):**

1. Find your machine's IP address:
   - Windows: `ipconfig` (look for IPv4)
   - Linux/Mac: `ifconfig` or `ip addr`

2. Start backend:
```bash
cd backend
npm run dev
```

**On Frontend Machine (where you access the UI):**

1. Update `.env` file in `frontend/` folder:
```bash
VITE_API_URL=http://<BACKEND_IP>:3001
```
Example: `VITE_API_URL=http://192.168.1.100:3001`

2. Start frontend:
```bash
cd frontend
npm run dev
```

3. Access dashboard at: http://localhost:5173

4. Emulator UI will be at: `http://<BACKEND_IP>:4000`

**Firewall Note:** Ensure ports 3001, 4000, and emulator ports (9099, 8080, etc.) are open on the backend machine.

## Usage

### Quick Start

1. **Select or Create Project**
   - Choose existing project from dropdown, or
   - Select "+ Create New Project" and enter a name
   - Config loads automatically

2. **Start Emulator**
   - Click "Start Emulator" or press `Ctrl+E`
   - Watch real-time logs
   - View running services with connection status

3. **Create Snapshots**
   - Click "📸 Create Snapshot" while emulator is running
   - Name your snapshot or use auto-generated timestamp
   - Restore snapshots anytime to load saved data

### Keyboard Shortcuts

- `Ctrl+E` (or `Cmd+E`) - Start/Stop emulator
- `Ctrl+L` (or `Cmd+L`) - Clear logs
- `Ctrl+S` (or `Cmd+S`) - Save config or rules

### Managing Snapshots

**Create Snapshot:**
- Emulator must be running
- Click "📸 Create Snapshot"
- Optionally name it (e.g., "before-migration", "test-data")
- Auto-generated format: `snapshot-2024-01-15T14-30-00`

**Restore Snapshot:**
- Stop emulator if running
- Click "↻ Restore" on any snapshot
- Emulator starts with that snapshot's data

**Delete Snapshot:**
- Click 🗑️ button on any snapshot
- Confirm deletion (cannot be undone)

### Importing Existing Projects

**Local Projects:**
```bash
cp -r /path/to/your-firebase-project firebase-projects/my-project
```
Then select from dropdown in UI.

**Cloud Projects:**
Currently not supported. Requires `firebase login` on backend machine.

### Editing Security Rules

1. Click rule file button (e.g., "firestore")
2. Edit rules with syntax validation
3. Save locally with `Ctrl+S`
4. Deploy to production (requires `firebase login` on backend)

### Log Filtering

- **Search**: Type in search box to filter logs
- **Service Filter**: Select specific service (Auth, Firestore, etc.)
- **Clear**: Press `Ctrl+L` or click "Clear Logs"

### Connection Status

When emulator is running, view:
- Active services with green indicator
- Port numbers for each service
- Copy service URLs with 📋 button

## Default Ports

- Auth: 9099
- Firestore: 8080
- Realtime Database: 9000
- Hosting: 5000
- Storage: 9199
- Emulator UI: 4000

## Project Structure

```
firelab/
├── backend/                    # Express API + Firebase CLI wrapper
│   ├── server.js              # Main server with Socket.io
│   └── package.json
├── frontend/                   # React + Vite UI
│   └── src/
│       ├── App.jsx            # Main dashboard component
│       ├── components/        # React components
│       │   ├── ProjectSetup.jsx
│       │   ├── EmulatorControls.jsx
│       │   ├── ConfigEditor.jsx
│       │   ├── RulesEditor.jsx
│       │   ├── LogsViewer.jsx
│       │   ├── SnapshotsManager.jsx
│       │   └── ConnectionStatus.jsx
│       └── App.css            # Styles
└── firebase-projects/          # Firebase project configs
    └── [project-name]/
        ├── firebase.json
        ├── firestore.rules
        ├── storage.rules
        ├── database.rules.json
        └── emulator-data/      # Snapshots
            ├── snapshot-2024-01-15T14-30-00/
            └── my-custom-snapshot/
```

## Features

### Core Features
✅ Create and manage Firebase projects
✅ Import existing Firebase projects
✅ Start/Stop emulators via web UI
✅ Real-time log streaming with ANSI colors
✅ Configure emulator ports
✅ Remote backend support (backend on one machine, frontend on another)

### Data Management
✅ Named snapshots with timestamps
✅ Create, restore, and delete snapshots
✅ Import data on emulator start
✅ Persistent data between sessions

### Rules Management
✅ Edit Firestore, Storage, and Database rules
✅ Inline syntax validation
✅ Save rules locally
✅ Deploy rules to production (requires Firebase login)

### Developer Experience
✅ Keyboard shortcuts (Ctrl+E, Ctrl+L, Ctrl+S)
✅ Log filtering by service and search
✅ Connection status indicators
✅ Auto-scroll logs
✅ Dark GitHub-inspired theme
✅ Responsive design

## Firebase Login (Optional)

Firebase login is **only required** for:
- Deploying rules to production
- Importing projects from Firebase cloud (not yet supported)

For local development, no login needed!

**To enable production deployment:**
```bash
# On backend machine
firebase login
```

The UI will show login status and disable deploy button when not logged in.

## Troubleshooting

**Emulator won't start:**
- Check if ports are already in use
- Verify Firebase CLI is installed: `firebase --version`
- Check logs for error messages

**Backend not connected:**
- Verify backend is running on port 3001
- Check `.env` file has correct `VITE_API_URL`
- Ensure firewall allows connections

**Deploy button disabled:**
- Run `firebase login` on backend machine
- Refresh frontend to update login status

**Snapshot restore fails:**
- Stop emulator before restoring
- Verify snapshot exists in `emulator-data/` folder
- Check logs for detailed error messages
