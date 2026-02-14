# Quick Backend Setup for Remote Machine

## One-Line Install:
```bash
git clone --no-checkout <your-repo-url> && cd firedashboard && git sparse-checkout init --cone && git sparse-checkout set backend && git checkout && cd backend && npm install
```

## Or Step-by-Step:

1. **Clone backend only:**
```bash
git clone --no-checkout <your-repo-url>
cd firedashboard
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
firebase login
```

4. **Start server:**
```bash
npm run dev
```

Server will run on `http://0.0.0.0:3001` (accessible from network)
