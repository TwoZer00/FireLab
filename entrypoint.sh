#!/bin/sh
chmod -R 777 /app/firebase-projects 2>/dev/null || true
exec node /app/server.js
