import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { spawn } from 'child_process';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, createReadStream, createWriteStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import unzipper from 'unzipper';
import { initAuth, authMiddleware } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

let emulatorProcess = null;
let snapshotInterval = null;
const projectsDir = path.join(__dirname, '../firebase-projects');
const connectionHistory = [];

// Initialize auth
await initAuth();

// Apply auth to all API routes
app.use('/api', authMiddleware);

// Initialize project
app.post('/api/init', async (req, res) => {
  const { projectId, services } = req.body;
  const projectPath = path.join(projectsDir, projectId);

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

    const firebaseConfig = { emulators };

    await writeFile(
      path.join(projectPath, 'firebase.json'),
      JSON.stringify(firebaseConfig, null, 2)
    );

    if (services?.firestore) {
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
  const { projectId, importData, snapshotName, debug, autoSnapshot } = req.body;
  const projectPath = path.join(projectsDir, projectId);

  if (emulatorProcess) {
    return res.status(400).json({ error: 'Emulator already running' });
  }

  try {
    const args = ['emulators:start'];
    
    // Read config to determine which services to start
    const configPath = path.join(projectPath, 'firebase.json');
    if (existsSync(configPath)) {
      const configData = await readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      
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
    
    // Add debug flag if requested
    if (debug) {
      args.push('--debug');
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

    const env = { ...process.env };
    if (process.env.FIREBASE_TOKEN) {
      env.FIREBASE_TOKEN = process.env.FIREBASE_TOKEN;
    }

    emulatorProcess = spawn('firebase', args, {
      cwd: projectPath,
      shell: true,
      env
    });

    emulatorProcess.stdout.on('data', (data) => {
      io.emit('logs', data.toString());
    });

    emulatorProcess.stderr.on('data', (data) => {
      io.emit('logs', data.toString());
    });

    emulatorProcess.on('error', (error) => {
      const message = `Emulator error: ${error.message}`;
      console.error(message);
      io.emit('logs', message);
    });

    emulatorProcess.on('close', (code) => {
      const message = `Emulator process exited with code ${code}`;
      console.log(message);
      io.emit('logs', message);
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
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const snapshotName = `auto-${timestamp}`;
        const exportPath = path.join(projectPath, 'emulator-data', snapshotName);

        const exportProcess = spawn('firebase', ['emulators:export', exportPath], {
          cwd: projectPath,
          shell: true
        });

        exportProcess.stdout.on('data', (data) => {
          io.emit('logs', data.toString());
        });

        exportProcess.stderr.on('data', (data) => {
          io.emit('logs', data.toString());
        });

        exportProcess.on('close', async (code) => {
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
    if (projectId) {
      const projectPath = path.join(projectsDir, projectId);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const snapshotName = `auto-${timestamp}`;
      const exportPath = path.join(projectPath, 'emulator-data', snapshotName);

      const exportProcess = spawn('firebase', ['emulators:export', exportPath], {
        cwd: projectPath,
        shell: true
      });

      exportProcess.stdout.on('data', (data) => {
        io.emit('logs', data.toString());
      });

      exportProcess.stderr.on('data', (data) => {
        io.emit('logs', data.toString());
      });

      exportProcess.on('close', async (code) => {
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
              
              // Delete all but the last 5
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
    }

    // Kill the entire process tree
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
      if (code === 0 && output.trim()) {
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
  const configPath = path.join(projectsDir, projectId, 'firebase.json');

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
  
  // Safety checks
  if (!projectId || projectId.trim() === '') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }
  
  // Prevent path traversal attacks
  if (projectId.includes('..') || projectId.includes('/') || projectId.includes('\\')) {
    return res.status(400).json({ error: 'Invalid project ID' });
  }
  
  const projectPath = path.join(projectsDir, projectId);
  
  // Ensure path is within projectsDir
  if (!projectPath.startsWith(projectsDir)) {
    return res.status(400).json({ error: 'Invalid project path' });
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

// Update config
app.put('/api/config/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const configPath = path.join(projectsDir, projectId, 'firebase.json');

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
  
  if (type === 'database') {
    rulesPath = path.join(projectsDir, projectId, 'database.rules.json');
  } else {
    rulesPath = path.join(projectsDir, projectId, `${type}.rules`);
    if (!existsSync(rulesPath)) {
      rulesPath = path.join(projectsDir, projectId, `${type}.rule`);
    }
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
  const projectPath = path.join(projectsDir, projectId);

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
  
  if (type === 'database') {
    rulesPath = path.join(projectsDir, projectId, 'database.rules.json');
  } else {
    rulesPath = path.join(projectsDir, projectId, `${type}.rules`);
    if (!existsSync(rulesPath)) {
      rulesPath = path.join(projectsDir, projectId, `${type}.rule`);
    }
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
  const projectPath = path.join(projectsDir, projectId);

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
  const projectPath = path.join(projectsDir, projectId);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const exportName = snapshotName || `snapshot-${timestamp}`;
  const exportPath = path.join(projectPath, 'emulator-data', exportName);

  try {
    const exportProcess = spawn('firebase', ['emulators:export', exportPath], {
      cwd: projectPath,
      shell: true
    });

    exportProcess.stdout.on('data', (data) => {
      io.emit('logs', data.toString());
    });

    exportProcess.stderr.on('data', (data) => {
      io.emit('logs', data.toString());
    });

    exportProcess.on('close', (code) => {
      if (code === 0) {
        io.emit('logs', `✅ Snapshot '${exportName}' created successfully`);
      } else {
        io.emit('logs', `❌ Export failed with code ${code}`);
      }
    });

    res.json({ success: true, message: 'Export started', snapshotName: exportName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List snapshots
app.get('/api/snapshots/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const snapshotsPath = path.join(projectsDir, projectId, 'emulator-data');

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
  const snapshotPath = path.join(projectsDir, projectId, 'emulator-data', snapshotName);

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
  const historyPath = path.join(projectsDir, projectId, '.rules-history', `${type}.json`);

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
  const historyDir = path.join(projectsDir, projectId, '.rules-history');
  const historyPath = path.join(historyDir, `${type}.json`);

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
  const projectPath = path.join(projectsDir, projectId);
  const dataPath = path.join(projectPath, 'emulator-data');

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
  const snapshotPath = path.join(projectsDir, projectId, 'emulator-data', snapshotName);

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
app.post('/api/seed/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const { script } = req.body;
  const projectPath = path.join(projectsDir, projectId);
  const seedsDir = path.join(projectPath, '.seeds');
  const scriptPath = path.join(seedsDir, `${Date.now()}.js`);

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

// List seed scripts
app.get('/api/seeds/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const seedsDir = path.join(projectsDir, projectId, '.seeds');

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
  const clientInfo = {
    id: socket.id,
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    connectedAt: new Date().toISOString()
  };
  
  connectionHistory.push(clientInfo);
  console.log(`Client connected: ${socket.id} from ${clientInfo.ip}`);
  
  socket.on('disconnect', () => {
    const connection = connectionHistory.find(c => c.id === socket.id);
    if (connection) {
      connection.disconnectedAt = new Date().toISOString();
      connection.duration = new Date(connection.disconnectedAt) - new Date(connection.connectedAt);
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Get connection history
app.get('/api/connections', (req, res) => {
  res.json(connectionHistory.slice(-50));
});

// Cleanup on server shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  if (emulatorProcess) {
    console.log('Stopping emulator...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', emulatorProcess.pid, '/f', '/t'], { shell: true });
    } else {
      emulatorProcess.kill('SIGTERM');
    }
  }
  process.exit(0);
});

const PORT = 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
