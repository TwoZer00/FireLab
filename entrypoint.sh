#!/bin/sh
chmod -R 755 /app/firebase-projects 2>/dev/null || true
# Load persisted firebase token if present
if [ -f /app/firebase-projects/.firebase-token ]; then
  export FIREBASE_TOKEN=$(cat /app/firebase-projects/.firebase-token)
fi
exec node /app/server.js
