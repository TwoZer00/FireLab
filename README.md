# FireLab

A web-based platform to manage and configure Firebase emulators locally.

## Prerequisites

- Node.js (v18+)
- Firebase CLI: `npm install -g firebase-tools`
- Firebase account (run `firebase login`)

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

### Using Existing Firebase Projects

If you already have Firebase projects with `firebase.json`:

1. Copy your project folder to `firebase-projects/`:
```bash
cp -r /path/to/your-firebase-project firebase-projects/my-project
```

2. In the dashboard, select your project from the dropdown
3. Click "Load Config" to view settings
4. Click "Start Emulator"

### Creating New Projects

1. **Initialize Project**
   - Enter a project ID (e.g., "my-project")
   - Click "Initialize Project"
   - Click "Load Config" to view settings

2. **Configure Emulators**
   - Adjust ports for each service (Auth, Firestore, Database, etc.)
   - Click "Save Configuration"

3. **Start Emulator**
   - Click "Start Emulator"
   - Watch real-time logs in the dashboard
   - Click "Open Emulator UI" to access Firebase Emulator UI

4. **Stop Emulator**
   - Click "Stop Emulator" when done

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
├── backend/              # Express API + Firebase CLI wrapper
│   ├── server.js        # Main server with Socket.io
│   └── package.json
├── frontend/            # React + Vite UI
│   └── src/
│       ├── App.jsx      # Main dashboard component
│       └── App.css      # Styles
└── firebase-projects/   # Generated Firebase configs
```

## Features

✅ Initialize Firebase projects
✅ Import existing Firebase projects
✅ Start/Stop emulators via web UI
✅ Real-time log streaming
✅ Configure emulator ports
✅ Direct link to Firebase Emulator UI
