import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { spawn } from 'child_process';
import { readFile, writeFile, mkdir, stat, rename } from 'fs/promises';
import { existsSync, createReadStream, createWriteStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import unzipper from 'unzipper';
import { initAuth, authMiddleware, JWT_SECRET, generateToken } from './auth.js';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3001'];

const io = new Server(httpServer, { cors: { origin: ALLOWED_ORIGINS } });

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: '1mb' }));

let emulatorProcess = null;
let snapshotInterval = null;
let loginProcess = null;
let exportInProgress = false;
let debugLogStream = null;

async function openDebugLog(projectPath) {
  const logPath = path.join(projectPath, 'debug.log');
  const rotatedPath = path.join(projectPath, 'debug.log.1');
  try {
    const s = await stat(logPath);
    if (s.size > 10 * 1024 * 1024) {
      if (existsSync(rotatedPath)) {
        const { unlink } = await import('fs/promises');
        await unlink(rotatedPath);
      }
      await rename(logPath, rotatedPath);
    }
  } catch { /* file doesn't exist yet, that's fine */ }
  const { createWriteStream } = await import('fs');
  debugLogStream = createWriteStream(logPath, { flags: 'a' });
  debugLogStream.write(`\n\n--- Session started: ${new Date().toISOString()} ---\n`);
}

function closeDebugLog() {
  if (debugLogStream) {
    debugLogStream.write(`--- Session ended: ${new Date().toISOString()} ---\n`);
    debugLogStream.end();
    debugLogStream = null;
  }
}
const projectsDir = process.env.TEST_PROJECTS_DIR ||
  (existsSync(path.join(__dirname, '../firebase-projects'))
    ? path.join(__dirname, '../firebase-projects')
    : path.join(__dirname, 'firebase-projects'));

// Ensure projectsDir exists (important for Docker volume mounts)
if (!existsSync(projectsDir)) {
  await mkdir(projectsDir, { recursive: true });
}
console.log(`[FireLab] Projects directory: ${projectsDir}`);
const connectionHistory = [];

// Validate that a resolved path stays within the base directory
function safeJoin(base, ...parts) {
  const resolved = path.resolve(base, ...parts);
  if (!resolved.startsWith(path.resolve(base) + path.sep) && resolved !== path.resolve(base)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

// Validate a simple name segment (no path separators or traversal)
function validateSegment(segment) {
  if (!segment || typeof segment !== 'string' || segment.includes('..') || segment.includes('/') || segment.includes('\\') || segment.trim() === '') {
    throw new Error('Invalid path segment');
  }
  return segment;
}

// Initialize auth
await initAuth();

// Health check (no auth required)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Apply auth to all API routes
app.use('/api', authMiddleware);

// Initialize project
app.post('/api/init', async (req, res) => {
  const { projectId, services } = req.body;
  let projectPath;
  try {
    projectPath = safeJoin(projectsDir, validateSegment(projectId));
  } catch {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  console.log('Creating project:', projectId, 'with services:', services);

  try {
    if (!existsSync(projectPath)) {
      await mkdir(projectPath, { recursive: true });
    }

    const emulators = {};
    
    if (services?.auth) emulators.auth = { port: 9099, host: '0.0.0.0' };
    if (services?.firestore) emulators.firestore = { port: 8080, host: '0.0.0.0' };
    if (services?.database) emulators.database = { port: 9000, host: '0.0.0.0' };
    if (services?.hosting) emulators.hosting = { port: 5000, host: '0.0.0.0' };
    if (services?.storage) emulators.storage = { port: 9199, host: '0.0.0.0' };
    if (services?.ui) emulators.ui = { enabled: true, port: 4000, host: '0.0.0.0' };
    emulators.hub = { host: '0.0.0.0', port: 4400 };

    const firebaseConfig = { emulators };

    await writeFile(
      path.join(projectPath, 'firebase.json'),
      JSON.stringify(firebaseConfig, null, 2)
    );

    if (services?.firestore) {
      await writeFile(
        path.join(projectPath, 'firestore.indexes.json'),
        JSON.stringify({ indexes: [], fieldOverrides: [] }, null, 2)
      );
      await writeFile(
        path.join(projectPath, 'firestore.rules'),
        `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`
      );
    }

    if (services?.storage) {
      await writeFile(
        path.join(projectPath, 'storage.rules'),
        `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}`
      );
    }

    if (services?.database) {
      await writeFile(
        path.join(projectPath, 'database.rules.json'),
        `{
  "rules": {
    ".read": true,
    ".write": true
  }
}`
      );
    }

    res.json({ success: true, projectPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start emulator with optional snapshot
app.post('/api/emulator/start', async (req, res) => {
  const { projectId, importData, snapshotName, autoSnapshot } = req.body;
  let projectPath;
  try {
    projectPath = safeJoin(projectsDir, validateSegment(projectId));
    if (snapshotName) validateSegment(snapshotName);
  } catch {
    return res.status(400).json({ error: 'Invalid project ID or snapshot name' });
  }

  if (emulatorProcess) {
    return res.status(400).json({ error: 'Emulator already running' });
  }

  try {
    const args = ['emulators:start', '--project', projectId];
    
    // Read config to determine which services to start
    const configPath = path.join(projectPath, 'firebase.json');
    if (existsSync(configPath)) {
      const configData = await readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);

      // Ensure hub is configured for export support
      if (!config.emulators.hub) {
        config.emulators.hub = { host: '0.0.0.0', port: 4400 };
        await writeFile(configPath, JSON.stringify(config, null, 2));
      }

      if (config.emulators) {
        const services = [];
        if (config.emulators.auth) services.push('auth');
        if (config.emulators.firestore) services.push('firestore');
        if (config.emulators.database) services.push('database');
        if (config.emulators.storage) services.push('storage');
        if (config.emulators.hosting) services.push('hosting');

        if (services.length > 0) {
          args.push('--only', services.join(','));
        }
      }
    }



    // Add import flag if requested and data exists
    if (importData) {
      const importPath = snapshotName 
        ? path.join(projectPath, 'emulator-data', snapshotName)
        : path.join(projectPath, 'emulator-data');
      
      if (existsSync(importPath)) {
        args.push('--import', importPath);
      }
    }

    const env = { ...process.env, FORCE_COLOR: '1', FIREBASE_EMULATOR_HUB: 'localhost:4400' };
    if (process.env.FIREBASE_TOKEN) {
      env.FIREBASE_TOKEN = process.env.FIREBASE_TOKEN;
    }

    emulatorProcess = spawn('firebase', args, {
      cwd: projectPath,
      shell: true,
      env
    });

    await openDebugLog(projectPath);

    emulatorProcess.stdout.on('data', (data) => {
      const text = data.toString();
      if (debugLogStream) debugLogStream.write(text);
      io.emit('logs', text);
    });

    emulatorProcess.stderr.on('data', (data) => {
      const text = data.toString();
      if (debugLogStream) debugLogStream.write(text);
      io.emit('logs', text);
    });

    emulatorProcess.on('error', (error) => {
      const message = `Emulator error: ${error.message}`;
      console.error(message);
      io.emit('logs', message);
      if (debugLogStream) debugLogStream.write(message + '\n');
    });

    emulatorProcess.on('close', (code) => {
      const message = `Emulator process exited with code ${code}`;
      console.log(message);
      io.emit('logs', message);
      closeDebugLog();
      emulatorProcess = null;
      
      // Clear snapshot interval
      if (snapshotInterval) {
        clearInterval(snapshotInterval);
        snapshotInterval = null;
      }
    });

    // Start auto-snapshot timer (every 15 minutes) if enabled
    if (autoSnapshot !== false) {
      snapshotInterval = setInterval(async () => {
        if (exportInProgress) {
          io.emit('logs', '[FireLab] ⏭️ Auto-snapshot skipped: export already in progress');
          return;
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const snapshotName = `auto-${timestamp}`;
        const exportPath = path.join(projectPath, 'emulator-data', snapshotName);

        exportInProgress = true;
        await mkdir(path.join(projectPath, 'emulator-data'), { recursive: true });
        const exportProcess = spawn('firebase', ['emulators:export', exportPath, '--project', projectId, '--force'], {
          cwd: projectPath,
          shell: true,
          env: { ...process.env, FORCE_COLOR: '1', FIREBASE_EMULATOR_HUB: 'localhost:4400' }
        });

        exportProcess.stdout.on('data', (data) => {
          io.emit('logs', data.toString());
        });

        exportProcess.stderr.on('data', (data) => {
          io.emit('logs', data.toString());
        });

        exportProcess.on('close', async (code) => {
          exportInProgress = false;
          if (code === 0) {
            io.emit('logs', `✅ Auto-snapshot '${snapshotName}' created`);
            
            // Cleanup old auto-snapshots (keep last 5)
            try {
              const { readdir, rm } = await import('fs/promises');
              const snapshotsPath = path.join(projectPath, 'emulator-data');
              if (existsSync(snapshotsPath)) {
                const snapshots = await readdir(snapshotsPath, { withFileTypes: true });
                const autoSnapshots = snapshots
                  .filter(d => d.isDirectory() && d.name.startsWith('auto-'))
                  .map(d => d.name)
                  .sort()
                  .reverse();
                
                for (let i = 5; i < autoSnapshots.length; i++) {
                  const oldSnapshot = path.join(snapshotsPath, autoSnapshots[i]);
                  await rm(oldSnapshot, { recursive: true, force: true });
                  io.emit('logs', `🗑️ Deleted old auto-snapshot: ${autoSnapshots[i]}`);
                }
              }
            } catch (cleanupError) {
              console.error('Cleanup error:', cleanupError);
            }
          }
        });
      }, 15 * 60 * 1000);
    }

    res.json({ success: true, message: 'Emulator starting...' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop emulator with auto-snapshot
app.post('/api/emulator/stop', async (req, res) => {
  const { projectId } = req.body;
  if (projectId) {
    try { validateSegment(projectId); } catch { return res.status(400).json({ error: 'Invalid project ID' }); }
  }
  
  if (!emulatorProcess) {
    return res.status(400).json({ error: 'No emulator running' });
  }

  // Clear snapshot interval
  if (snapshotInterval) {
    clearInterval(snapshotInterval);
    snapshotInterval = null;
  }

  try {
    // Create auto-snapshot before stopping
    if (projectId && !exportInProgress) {
      const projectPath = safeJoin(projectsDir, projectId);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const snapshotName = `auto-${timestamp}`;
      const exportPath = path.join(projectPath, 'emulator-data', snapshotName);

      exportInProgress = true;
      await mkdir(path.join(projectPath, 'emulator-data'), { recursive: true });
      await new Promise((resolve) => {
        const exportProcess = spawn('firebase', ['emulators:export', exportPath, '--project', projectId, '--force'], {
          cwd: projectPath,
          shell: true,
          env: { ...process.env, FORCE_COLOR: '1', FIREBASE_EMULATOR_HUB: 'localhost:4400' }
        });

        exportProcess.stdout.on('data', (data) => io.emit('logs', data.toString()));
        exportProcess.stderr.on('data', (data) => io.emit('logs', data.toString()));

        exportProcess.on('close', async (code) => {
          exportInProgress = false;
          if (code === 0) {
            io.emit('logs', `✅ Auto-snapshot '${snapshotName}' created`);
            try {
              const { readdir, rm } = await import('fs/promises');
              const snapshotsPath = path.join(projectPath, 'emulator-data');
              if (existsSync(snapshotsPath)) {
                const snapshots = await readdir(snapshotsPath, { withFileTypes: true });
                const autoSnapshots = snapshots
                  .filter(d => d.isDirectory() && d.name.startsWith('auto-'))
                  .map(d => d.name)
                  .sort()
                  .reverse();
                for (let i = 5; i < autoSnapshots.length; i++) {
                  const oldSnapshot = path.join(snapshotsPath, autoSnapshots[i]);
                  await rm(oldSnapshot, { recursive: true, force: true });
                  io.emit('logs', `🗑️ Deleted old auto-snapshot: ${autoSnapshots[i]}`);
                }
              }
            } catch (cleanupError) {
              console.error('Cleanup error:', cleanupError);
            }
          }
          resolve();
        });
      });
    } else if (exportInProgress) {
      io.emit('logs', '[FireLab] ⚠️ Auto-snapshot on stop skipped: export already in progress');
    }

    // Kill after export completes
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', emulatorProcess.pid, '/f', '/t'], { shell: true });
    } else {
      emulatorProcess.kill('SIGTERM');
    }

    emulatorProcess = null;
    console.log('Emulator stopped');
    res.json({ success: true, message: 'Emulator stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if ports are available
app.post('/api/ports/check', async (req, res) => {
  const { ports } = req.body;
  const { createServer } = await import('net');
  
  const checkPort = (port) => {
    return new Promise((resolve) => {
      const server = createServer();
      
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve({ port, available: false });
        } else {
          resolve({ port, available: true });
        }
      });
      
      server.once('listening', () => {
        server.close();
        resolve({ port, available: true });
      });
      
      server.listen(port, '0.0.0.0');
    });
  };

  const findAlternativePort = async (basePort) => {
    // Try ports in range: basePort+1 to basePort+100
    for (let i = 1; i <= 100; i++) {
      const testPort = basePort + i;
      const result = await checkPort(testPort);
      if (result.available) {
        return testPort;
      }
    }
    return null;
  };
  
  try {
    const results = await Promise.all(ports.map(checkPort));
    const conflicts = results.filter(r => !r.available);
    
    // Find alternatives for conflicting ports
    const suggestions = [];
    for (const conflict of conflicts) {
      const alternative = await findAlternativePort(conflict.port);
      suggestions.push({
        port: conflict.port,
        alternative
      });
    }
    
    res.json({ conflicts, suggestions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Firebase login flow
app.post('/api/auth/login', async (req, res) => {
  if (loginProcess) {
    return res.status(400).json({ error: 'Login already in progress' });
  }

  try {
    const env = { ...process.env };
    loginProcess = spawn('firebase', ['login', '--no-localhost'], { shell: true, env });

    let buffer = '';
    const onData = (data) => {
      const text = data.toString();
      buffer += text;
      const urlMatch = buffer.match(/https:\/\/accounts\.google\.com\S+/);
      if (urlMatch) {
        io.emit('firebase-login-url', urlMatch[0]);
        buffer = '';
      }
      io.emit('logs', `[Firebase Login] ${text}`);
    };

    loginProcess.stdout.on('data', onData);
    loginProcess.stderr.on('data', onData);

    const loginTimeout = setTimeout(() => {
      if (loginProcess) {
        loginProcess.kill();
        loginProcess = null;
        io.emit('firebase-login-error', 'Login timed out after 5 minutes');
      }
    }, 5 * 60 * 1000);

    loginProcess.on('close', (code) => {
      clearTimeout(loginTimeout);
      loginProcess = null;
      if (code === 0) {
        io.emit('firebase-login-success');
        io.emit('logs', '[Firebase Login] ✅ Login successful');
      } else {
        io.emit('firebase-login-error', 'Login failed or was cancelled');
      }
    });

    res.json({ success: true, message: 'Login process started' });
  } catch (error) {
    loginProcess = null;
    res.status(500).json({ error: error.message });
  }
});

// Check Firebase login status
app.get('/api/auth/status', async (req, res) => {
  try {
    const env = { ...process.env };
    if (process.env.FIREBASE_TOKEN) {
      env.FIREBASE_TOKEN = process.env.FIREBASE_TOKEN;
    }

    const checkProcess = spawn('firebase', ['projects:list', '--json'], { shell: true, env });
    
    let output = '';
    let errorOutput = '';
    
    checkProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    checkProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    checkProcess.on('close', (code) => {
      // Exit code 0 means logged in, regardless of project list
      if (code === 0) {
        res.json({ loggedIn: true });
      } else {
        res.json({ loggedIn: false });
      }
    });
  } catch (error) {
    res.json({ loggedIn: false });
  }
});

// Get status
app.get('/api/emulator/status', (req, res) => {
  res.json({ running: !!emulatorProcess });
});

// Get config
app.get('/api/config/:projectId', async (req, res) => {
  const { projectId } = req.params;
  let configPath;
  try {
    configPath = safeJoin(projectsDir, validateSegment(projectId), 'firebase.json');
  } catch {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  try {
    const config = await readFile(configPath, 'utf-8');
    res.json(JSON.parse(config));
  } catch (error) {
    res.status(404).json({ error: 'Config not found' });
  }
});

// List all projects
app.get('/api/projects', async (req, res) => {
  try {
    const { readdir } = await import('fs/promises');
    if (!existsSync(projectsDir)) {
      return res.json([]);
    }
    const projects = await readdir(projectsDir, { withFileTypes: true });
    const projectList = projects
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    res.json(projectList);
  } catch (error) {
    res.json([]);
  }
});

// Delete project
app.delete('/api/projects/:projectId', async (req, res) => {
  const { projectId } = req.params;
  let projectPath;
  try {
    projectPath = safeJoin(projectsDir, validateSegment(projectId));
  } catch {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  try {
    if (existsSync(projectPath)) {
      const { rm } = await import('fs/promises');
      await rm(projectPath, { recursive: true, force: true });
      io.emit('logs', `[FireLab] ✅ Project '${projectId}' deleted`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Project not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update services for existing project
app.put('/api/services/:projectId', async (req, res) => {
  const { services } = req.body;
  let projectPath, configPath;
  try {
    projectPath = safeJoin(projectsDir, validateSegment(req.params.projectId));
    configPath = path.join(projectPath, 'firebase.json');
  } catch {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  try {
    const configData = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);
    const emulators = config.emulators || {};
    const host = Object.values(emulators).find(s => s?.host)?.host || '0.0.0.0';

    const defaults = {
      auth:      { port: 9099, host },
      firestore: { port: 8080, host },
      database:  { port: 9000, host },
      hosting:   { port: 5000, host },
      storage:   { port: 9199, host },
      ui:        { enabled: true, port: 4000, host },
      hub:       { host: '0.0.0.0', port: 4400 }
    };

    // Always ensure hub is present
    if (!emulators.hub) emulators.hub = defaults.hub;

    for (const [svc, enabled] of Object.entries(services)) {
      if (enabled && !emulators[svc] && svc !== 'hub') {
        emulators[svc] = defaults[svc];
        if (svc === 'firestore') {
          const idxPath = path.join(projectPath, 'firestore.indexes.json');
          if (!existsSync(idxPath)) await writeFile(idxPath, JSON.stringify({ indexes: [], fieldOverrides: [] }, null, 2));
          const rPath = path.join(projectPath, 'firestore.rules');
          if (!existsSync(rPath)) await writeFile(rPath, "rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}");
        } else if (svc === 'storage') {
          const rPath = path.join(projectPath, 'storage.rules');
          if (!existsSync(rPath)) await writeFile(rPath, "rules_version = '2';\nservice firebase.storage {\n  match /b/{bucket}/o {\n    match /{allPaths=**} {\n      allow read, write: if true;\n    }\n  }\n}");
        } else if (svc === 'database') {
          const rPath = path.join(projectPath, 'database.rules.json');
          if (!existsSync(rPath)) await writeFile(rPath, '{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}');
        }
      } else if (!enabled && emulators[svc]) {
        delete emulators[svc];
      }
    }

    config.emulators = emulators;
    await writeFile(configPath, JSON.stringify(config, null, 2));
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update config
app.put('/api/config/:projectId', async (req, res) => {
  const { projectId } = req.params;
  let configPath;
  try {
    configPath = safeJoin(projectsDir, validateSegment(projectId), 'firebase.json');
  } catch {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  try {
    await writeFile(configPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get rules file
app.get('/api/rules/:projectId/:type', async (req, res) => {
  const { projectId, type } = req.params;
  let rulesPath;
  try {
    const projectPath = safeJoin(projectsDir, validateSegment(projectId));
    validateSegment(type);
    if (type === 'database') {
      rulesPath = path.join(projectPath, 'database.rules.json');
    } else {
      rulesPath = path.join(projectPath, `${type}.rules`);
      if (!existsSync(rulesPath)) {
        rulesPath = path.join(projectPath, `${type}.rule`);
      }
    }
  } catch {
    return res.status(400).json({ error: 'Invalid project ID or rules type' });
  }

  try {
    const rules = await readFile(rulesPath, 'utf-8');
    res.json({ rules });
  } catch (error) {
    res.status(404).json({ error: 'Rules file not found' });
  }
});

// List available rules files
app.get('/api/rules/:projectId', async (req, res) => {
  const { projectId } = req.params;
  let projectPath;
  try {
    projectPath = safeJoin(projectsDir, validateSegment(projectId));
  } catch {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  try {
    const { readdir } = await import('fs/promises');
    if (!existsSync(projectPath)) {
      return res.json([]);
    }
    const files = await readdir(projectPath);
    const rulesFiles = files
      .filter(file => {
        return file.endsWith('.rules') || 
               file.endsWith('.rule') || 
               file === 'database.rules.json';
      })
      .map(file => {
        if (file === 'database.rules.json') return 'database';
        return file.replace(/\.(rules|rule)$/, '');
      });
    res.json(rulesFiles);
  } catch (error) {
    console.error('Error listing rules:', error);
    res.json([]);
  }
});

// Update rules file
app.put('/api/rules/:projectId/:type', async (req, res) => {
  const { projectId, type } = req.params;
  const { rules } = req.body;
  let rulesPath;
  try {
    const projectPath = safeJoin(projectsDir, validateSegment(projectId));
    validateSegment(type);
    if (type === 'database') {
      rulesPath = path.join(projectPath, 'database.rules.json');
    } else {
      rulesPath = path.join(projectPath, `${type}.rules`);
      if (!existsSync(rulesPath)) {
        rulesPath = path.join(projectPath, `${type}.rule`);
      }
    }
  } catch {
    return res.status(400).json({ error: 'Invalid project ID or rules type' });
  }

  try {
    await writeFile(rulesPath, rules);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deploy rules
app.post('/api/deploy/:projectId/:type', async (req, res) => {
  const { projectId, type } = req.params;
  let projectPath;
  try {
    projectPath = safeJoin(projectsDir, validateSegment(projectId));
    validateSegment(type);
  } catch {
    return res.status(400).json({ error: 'Invalid project ID or rules type' });
  }

  try {
    let deployTarget;
    if (type === 'firestore') deployTarget = 'firestore:rules';
    else if (type === 'storage') deployTarget = 'storage:rules';
    else if (type === 'database') deployTarget = 'database';
    else return res.status(400).json({ error: 'Invalid rules type' });

    const env = { ...process.env };
    if (process.env.FIREBASE_TOKEN) {
      env.FIREBASE_TOKEN = process.env.FIREBASE_TOKEN;
    }

    env.FORCE_COLOR = '1';

    const deployProcess = spawn('firebase', ['deploy', '--only', deployTarget], {
      cwd: projectPath,
      shell: true,
      env
    });

    let output = '';
    deployProcess.stdout.on('data', (data) => {
      output += data.toString();
      io.emit('logs', data.toString());
    });

    deployProcess.stderr.on('data', (data) => {
      output += data.toString();
      io.emit('logs', data.toString());
    });

    deployProcess.on('close', (code) => {
      if (code === 0) {
        io.emit('logs', `✅ ${type} rules deployed successfully`);
      } else {
        io.emit('logs', `❌ Deploy failed with code ${code}`);
      }
    });

    res.json({ success: true, message: 'Deployment started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export emulator data with optional name
app.post('/api/export/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const { snapshotName } = req.body;

  if (exportInProgress) {
    return res.status(400).json({ error: 'A snapshot export is already in progress' });
  }

  let projectPath, exportPath, exportName;
  try {
    projectPath = safeJoin(projectsDir, validateSegment(projectId));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    exportName = snapshotName ? validateSegment(snapshotName) : `snapshot-${timestamp}`;
    exportPath = safeJoin(projectPath, 'emulator-data', exportName);
  } catch {
    return res.status(400).json({ error: 'Invalid project ID or snapshot name' });
  }

  try {
    await mkdir(path.join(projectPath, 'emulator-data'), { recursive: true });
    const exportProcess = spawn('firebase', ['emulators:export', exportPath, '--project', projectId, '--force'], {
      cwd: projectPath,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1', FIREBASE_EMULATOR_HUB: 'localhost:4400' }
    });

    exportInProgress = true;
    exportProcess.stdout.on('data', (data) => io.emit('logs', data.toString()));
    exportProcess.stderr.on('data', (data) => io.emit('logs', data.toString()));
    exportProcess.on('close', (code) => {
      exportInProgress = false;
      if (code === 0) {
        io.emit('logs', `✅ Snapshot '${exportName}' created successfully`);
      } else {
        io.emit('logs', `❌ Export failed with code ${code}`);
      }
    });

    res.json({ success: true, message: 'Export started', snapshotName: exportName });
  } catch (error) {
    exportInProgress = false;
    res.status(500).json({ error: error.message });
  }
});

// List snapshots
app.get('/api/snapshots/:projectId', async (req, res) => {
  const { projectId } = req.params;
  let snapshotsPath;
  try {
    snapshotsPath = safeJoin(projectsDir, validateSegment(projectId), 'emulator-data');
  } catch {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  try {
    if (!existsSync(snapshotsPath)) {
      return res.json([]);
    }
    const { readdir } = await import('fs/promises');
    const snapshots = await readdir(snapshotsPath, { withFileTypes: true });
    const snapshotList = snapshots
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    res.json(snapshotList);
  } catch (error) {
    res.json([]);
  }
});

// Delete snapshot
app.delete('/api/snapshots/:projectId/:snapshotName', async (req, res) => {
  const { projectId, snapshotName } = req.params;
  let snapshotPath;
  try {
    snapshotPath = safeJoin(projectsDir, validateSegment(projectId), 'emulator-data', validateSegment(snapshotName));
  } catch {
    return res.status(400).json({ error: 'Invalid project ID or snapshot name' });
  }

  try {
    const { rm } = await import('fs/promises');
    await rm(snapshotPath, { recursive: true, force: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if export data exists
app.get('/api/export/:projectId/exists', (req, res) => {
  const { projectId } = req.params;
  const exportPath = path.join(projectsDir, projectId, 'emulator-data');
  res.json({ exists: existsSync(exportPath) });
});

// Get rules history
app.get('/api/rules-history/:projectId/:type', async (req, res) => {
  const { projectId, type } = req.params;
  let historyPath;
  try {
    historyPath = safeJoin(projectsDir, validateSegment(projectId), '.rules-history', `${validateSegment(type)}.json`);
  } catch {
    return res.status(400).json({ error: 'Invalid project ID or rules type' });
  }

  try {
    if (!existsSync(historyPath)) {
      return res.json([]);
    }
    const history = await readFile(historyPath, 'utf-8');
    res.json(JSON.parse(history));
  } catch (error) {
    res.json([]);
  }
});

// Save rules to history
app.post('/api/rules-history/:projectId/:type', async (req, res) => {
  const { projectId, type } = req.params;
  const { rules } = req.body;
  let historyDir, historyPath;
  try {
    historyDir = safeJoin(projectsDir, validateSegment(projectId), '.rules-history');
    historyPath = path.join(historyDir, `${validateSegment(type)}.json`);
  } catch {
    return res.status(400).json({ error: 'Invalid project ID or rules type' });
  }

  try {
    if (!existsSync(historyDir)) {
      await mkdir(historyDir, { recursive: true });
    }

    let history = [];
    if (existsSync(historyPath)) {
      const data = await readFile(historyPath, 'utf-8');
      history = JSON.parse(data);
    }

    history.unshift({
      timestamp: new Date().toISOString(),
      rules
    });

    // Keep last 20 versions
    if (history.length > 20) {
      history = history.slice(0, 20);
    }

    await writeFile(historyPath, JSON.stringify(history, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all emulator data
app.post('/api/emulator/clear/:projectId', async (req, res) => {
  const { projectId } = req.params;
  let dataPath;
  try {
    dataPath = safeJoin(projectsDir, validateSegment(projectId), 'emulator-data');
  } catch {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  try {
    if (existsSync(dataPath)) {
      const { rm } = await import('fs/promises');
      await rm(dataPath, { recursive: true, force: true });
      io.emit('logs', '[FireLab] ✅ All emulator data cleared');
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download snapshot as zip
app.get('/api/snapshots/:projectId/:snapshotName/download', (req, res) => {
  const { projectId, snapshotName } = req.params;
  let snapshotPath;
  try {
    snapshotPath = safeJoin(projectsDir, validateSegment(projectId), 'emulator-data', validateSegment(snapshotName));
  } catch {
    return res.status(400).json({ error: 'Invalid project ID or snapshot name' });
  }

  if (!existsSync(snapshotPath)) {
    return res.status(404).json({ error: 'Snapshot not found' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${snapshotName}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);
  archive.directory(snapshotPath, false);
  archive.finalize();
});

// Upload snapshot from zip
app.post('/api/snapshots/:projectId/upload', async (req, res) => {
  const { projectId } = req.params;
  const { snapshotName } = req.body;
  const snapshotsPath = path.join(projectsDir, projectId, 'emulator-data');
  const targetPath = path.join(snapshotsPath, snapshotName || `uploaded-${Date.now()}`);

  try {
    if (!existsSync(snapshotsPath)) {
      await mkdir(snapshotsPath, { recursive: true });
    }

    // Note: This expects multipart/form-data with file upload
    // For now, return success - frontend will need to handle file upload
    res.json({ success: true, message: 'Upload endpoint ready' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run seed script
// ⚠️ WARNING: This endpoint executes arbitrary JS. Only expose in trusted environments.
app.post('/api/seed/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const { script } = req.body;

  if (!script || script.length > 50000) {
    return res.status(400).json({ error: 'Script is required and must be under 50KB' });
  }

  let projectPath, seedsDir, scriptPath;
  try {
    projectPath = safeJoin(projectsDir, validateSegment(projectId));
    seedsDir = path.join(projectPath, '.seeds');
    scriptPath = path.join(seedsDir, `${Date.now()}.js`);
  } catch {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  try {
    if (!existsSync(seedsDir)) {
      await mkdir(seedsDir, { recursive: true });
    }

    await writeFile(scriptPath, script);

    const seedProcess = spawn('node', [scriptPath], {
      cwd: projectPath,
      shell: true,
      env: { ...process.env, FIRESTORE_EMULATOR_HOST: 'localhost:8080', FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099' }
    });

    seedProcess.stdout.on('data', (data) => {
      io.emit('logs', `[Seed] ${data.toString()}`);
    });

    seedProcess.stderr.on('data', (data) => {
      io.emit('logs', `[Seed Error] ${data.toString()}`);
    });

    seedProcess.on('close', (code) => {
      if (code === 0) {
        io.emit('logs', '[FireLab] ✅ Seed script completed');
      } else {
        io.emit('logs', `[FireLab] ❌ Seed script failed with code ${code}`);
      }
    });

    res.json({ success: true, message: 'Seed script started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch deployed rules from Firebase production
app.get('/api/fetch-rules/:projectId/:type', async (req, res) => {
  const { projectId, type } = req.params;
  let projectPath;
  try {
    projectPath = safeJoin(projectsDir, validateSegment(projectId));
    validateSegment(type);
  } catch {
    return res.status(400).json({ error: 'Invalid project ID or rules type' });
  }

  try {
    const env = { ...process.env };
    if (process.env.FIREBASE_TOKEN) {
      env.FIREBASE_TOKEN = process.env.FIREBASE_TOKEN;
    }

    let args;
    if (type === 'firestore') {
      args = ['firestore:rules:get', '--json'];
    } else if (type === 'storage') {
      args = ['storage:rules:get', '--json'];
    } else if (type === 'database') {
      args = ['database:get', '/.settings/rules', '--json'];
    } else {
      return res.status(400).json({ error: 'Invalid rules type' });
    }

    const fetchProcess = spawn('firebase', args, {
      cwd: projectPath,
      shell: true,
      env
    });

    let output = '';
    let errorOutput = '';

    fetchProcess.stdout.on('data', (data) => { output += data.toString(); });
    fetchProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

    fetchProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const parsed = JSON.parse(output);
          // Firebase CLI --json wraps result in { status, result }
          const rules = parsed.result || parsed;
          res.json({ rules: typeof rules === 'string' ? rules : JSON.stringify(rules, null, 2) });
        } catch {
          // If not JSON, return raw output (e.g. firestore/storage rules are plain text)
          res.json({ rules: output.trim() });
        }
      } else {
        io.emit('logs', `❌ Failed to fetch ${type} rules from Firebase`);
        res.status(500).json({ error: errorOutput || 'Failed to fetch rules' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch deployed indexes from Firebase production
app.get('/api/fetch-indexes/:projectId', async (req, res) => {
  const { projectId } = req.params;
  let projectPath;
  try {
    projectPath = safeJoin(projectsDir, validateSegment(projectId));
  } catch {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  try {
    const env = { ...process.env };
    if (process.env.FIREBASE_TOKEN) {
      env.FIREBASE_TOKEN = process.env.FIREBASE_TOKEN;
    }

    const fetchProcess = spawn('firebase', ['firestore:indexes', '--json'], {
      cwd: projectPath,
      shell: true,
      env
    });

    let output = '';
    let errorOutput = '';

    fetchProcess.stdout.on('data', (data) => { output += data.toString(); });
    fetchProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

    fetchProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const parsed = JSON.parse(output);
          const indexes = parsed.result || parsed;
          res.json({ indexes: typeof indexes === 'string' ? indexes : JSON.stringify(indexes, null, 2) });
        } catch {
          res.json({ indexes: output.trim() });
        }
      } else {
        io.emit('logs', '❌ Failed to fetch indexes from Firebase');
        res.status(500).json({ error: errorOutput || 'Failed to fetch indexes' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Firestore indexes
app.get('/api/indexes/:projectId', async (req, res) => {
  const { projectId } = req.params;
  let indexesPath;
  try {
    indexesPath = safeJoin(projectsDir, validateSegment(projectId), 'firestore.indexes.json');
  } catch {
    return res.status(400).json({ error: 'Invalid project ID' });
  }
  try {
    if (!existsSync(indexesPath)) {
      return res.json({ indexes: [], fieldOverrides: [] });
    }
    const data = await readFile(indexesPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save Firestore indexes
app.put('/api/indexes/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const { indexes } = req.body;
  let indexesPath;
  try {
    indexesPath = safeJoin(projectsDir, validateSegment(projectId), 'firestore.indexes.json');
  } catch {
    return res.status(400).json({ error: 'Invalid project ID' });
  }
  try {
    await writeFile(indexesPath, indexes);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deploy Firestore indexes
app.post('/api/deploy-indexes/:projectId', async (req, res) => {
  const { projectId } = req.params;
  let projectPath;
  try {
    projectPath = safeJoin(projectsDir, validateSegment(projectId));
  } catch {
    return res.status(400).json({ error: 'Invalid project ID' });
  }
  try {
    const env = { ...process.env };
    if (process.env.FIREBASE_TOKEN) {
      env.FIREBASE_TOKEN = process.env.FIREBASE_TOKEN;
    }
    env.FORCE_COLOR = '1';
    const deployProcess = spawn('firebase', ['deploy', '--only', 'firestore:indexes'], {
      cwd: projectPath,
      shell: true,
      env
    });
    deployProcess.stdout.on('data', (data) => io.emit('logs', data.toString()));
    deployProcess.stderr.on('data', (data) => io.emit('logs', data.toString()));
    deployProcess.on('close', (code) => {
      if (code === 0) {
        io.emit('logs', '✅ Firestore indexes deployed successfully');
      } else {
        io.emit('logs', `❌ Index deploy failed with code ${code}`);
      }
    });
    res.json({ success: true, message: 'Index deployment started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download debug log
app.get('/api/debug-log/:projectId', (req, res) => {
  const { projectId } = req.params;
  let logPath;
  try {
    logPath = safeJoin(projectsDir, validateSegment(projectId), 'debug.log');
  } catch {
    return res.status(400).json({ error: 'Invalid project ID' });
  }
  if (!existsSync(logPath)) return res.status(404).json({ error: 'No debug log found' });
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${projectId}-debug.log"`);
  createReadStream(logPath).pipe(res);
});

// List seed scripts
app.get('/api/seeds/:projectId', async (req, res) => {
  const { projectId } = req.params;
  let seedsDir;
  try {
    seedsDir = safeJoin(projectsDir, validateSegment(projectId), '.seeds');
  } catch {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  try {
    if (!existsSync(seedsDir)) {
      return res.json([]);
    }
    const { readdir } = await import('fs/promises');
    const files = await readdir(seedsDir);
    const seeds = files.filter(f => f.endsWith('.js'));
    res.json(seeds);
  } catch (error) {
    res.json([]);
  }
});

io.on('connection', (socket) => {
  const token = socket.handshake.auth?.token;
  let username = 'anonymous';
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      username = decoded.username;
    } catch (err) {
      console.log('Invalid socket token:', err.message);
    }
  }
  
  const clientInfo = {
    id: socket.id,
    username,
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    connectedAt: new Date().toISOString()
  };
  
  connectionHistory.push(clientInfo);
  if (connectionHistory.length > 200) connectionHistory.splice(0, connectionHistory.length - 200);
  console.log(`Client connected: ${username} (${socket.id}) from ${clientInfo.ip}`);
  
  socket.on('disconnect', () => {
    const connection = connectionHistory.find(c => c.id === socket.id);
    if (connection) {
      connection.disconnectedAt = new Date().toISOString();
      connection.duration = new Date(connection.disconnectedAt) - new Date(connection.connectedAt);
    }
    console.log(`Client disconnected: ${username} (${socket.id})`);
  });
});

// Get connection history
app.get('/api/connections', (req, res) => {
  res.json(connectionHistory.slice(-50));
});

// Cleanup on server shutdown
const shutdown = () => {
  console.log('\nShutting down server...');
  if (snapshotInterval) {
    clearInterval(snapshotInterval);
    snapshotInterval = null;
  }
  if (loginProcess) {
    loginProcess.kill();
    loginProcess = null;
  }
  closeDebugLog();
  if (emulatorProcess) {
    console.log('Stopping emulator...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', emulatorProcess.pid, '/f', '/t'], { shell: true });
    } else {
      emulatorProcess.kill('SIGTERM');
    }
  }
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  // Force exit after 5s if connections don't drain
  setTimeout(() => process.exit(1), 5000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Serve frontend static build if available
const frontendBuildPath = path.join(__dirname, '../frontend/dist');
if (existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    }
  });
}

// Interactive CLI commands
function startCLI() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const promptCommand = () => {
    rl.question('', async (input) => {
      const cmd = input.trim().toLowerCase();
      if (cmd === 'token') {
        rl.question('Username: ', async (username) => {
          if (username.trim()) {
            const token = await generateToken(username.trim());
            console.log(`\n✅ Token for ${username.trim()}:\n${token}\n`);
          } else {
            console.log('❌ Username required');
          }
          promptCommand();
        });
      } else if (cmd === 'q' || cmd === 'quit') {
        process.emit('SIGINT');
      } else if (cmd === 'help') {
        console.log('\nCommands: token, quit, help\n');
        promptCommand();
      } else if (cmd) {
        console.log('Unknown command. Type "help" for available commands.');
        promptCommand();
      } else {
        promptCommand();
      }
    });
  };

  promptCommand();
}

export { app, httpServer };

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const PORT = 3001;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🔥 FireLab running on http://0.0.0.0:${PORT}`);
    if (existsSync(frontendBuildPath)) {
      console.log(`📱 Frontend: http://localhost:${PORT}`);
    }
    console.log(`📡 API: http://localhost:${PORT}/api`);
    if (process.stdin.isTTY) {
      console.log(`\nType "token" to generate an access token, "help" for commands\n`);
      startCLI();
    }
  });
}
