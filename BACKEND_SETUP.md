# Quick Backend Setup for Remote Machine

## One-Line Install:
```bash
git clone --no-checkout https://github.com/TwoZer00/FireLab.git && cd FireLab && git sparse-checkout init --cone && git sparse-checkout set backend && git checkout && cd backend && npm install
```

## Or Step-by-Step:

1. **Clone backend only:**
```bash
git clone --no-checkout https://github.com/TwoZer00/FireLab.git
cd FireLab
git sparse-checkout init --cone
git sparse-checkout set backend
git checkout
```

2. **Install dependencies:**
```bash
cd backend
npm install
```

3. **Install Firebase CLI:**
```bash
npm install -g firebase-tools
```

4. **Generate access token:**
```bash
node generate-token.js
```
Save the generated token — you'll need it to access the UI.

5. **Start server:**
```bash
npm run dev
```

Server will run on `http://0.0.0.0:3001` (accessible from network)

## Authentication

FireLab uses JWT-based authentication. You must generate a token before accessing the UI.

**Method A: Interactive CLI (while server is running)**
```
Type "token" in the server console, then enter a username.
```

**Method B: Script**
```bash
node generate-token.js
```

Tokens are stored as hashed values in `tokens.json`. To revoke access, delete `tokens.json` and restart the backend.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3001` | Allowed CORS origins |
| `NODE_ENV` | - | Set to `production` for prod builds |
| `FIREBASE_TOKEN` | - | Firebase CI token (optional, for deploying rules) |

## Firewall

Ensure these ports are open on the backend machine:
- **3001** — Backend API + UI (unified mode)
- **4000** — Firebase Emulator UI
- **9099, 8080, 9000, 5000, 9199** — Emulator service ports

## Firebase Login (Optional)

Only required for deploying rules to production:
```bash
firebase login
```
