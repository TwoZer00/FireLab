import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { spawn } from 'child_process';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

let emulatorProcess = null;
const projectsDir = path.join(__dirname, '../firebase-projects');

// Initialize project
app.post('/api/init', async (req, res) => {
  const { projectId } = req.body;
  const projectPath = path.join(projectsDir, projectId);

  try {
    if (!existsSync(projectPath)) {
      await mkdir(projectPath, { recursive: true });
    }

    const firebaseConfig = {
      emulators: {
        auth: { port: 9099, host: '0.0.0.0' },
        firestore: { port: 8080, host: '0.0.0.0' },
        database: { port: 9000, host: '0.0.0.0' },
        hosting: { port: 5000, host: '0.0.0.0' },
        storage: { port: 9199, host: '0.0.0.0' },
        ui: { enabled: true, port: 4000, host: '0.0.0.0' }
      }
    };

    await writeFile(
      path.join(projectPath, 'firebase.json'),
      JSON.stringify(firebaseConfig, null, 2)
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

    await writeFile(
      path.join(projectPath, 'database.rules.json'),
      `{
  "rules": {
    ".read": true,
    ".write": true
  }
}`
    );

    res.json({ success: true, projectPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start emulator
app.post('/api/emulator/start', async (req, res) => {
  const { projectId, importData } = req.body;
  const projectPath = path.join(projectsDir, projectId);

  if (emulatorProcess) {
    return res.status(400).json({ error: 'Emulator already running' });
  }

  try {
    const args = ['emulators:start'];
    
    // Add import flag if requested and data exists
    if (importData) {
      const exportPath = path.join(projectPath, 'emulator-data');
      if (existsSync(exportPath)) {
        args.push('--import', exportPath);
      }
    }

    emulatorProcess = spawn('firebase', args, {
      cwd: projectPath,
      shell: true
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
    });

    res.json({ success: true, message: 'Emulator starting...' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop emulator
app.post('/api/emulator/stop', (req, res) => {
  if (!emulatorProcess) {
    return res.status(400).json({ error: 'No emulator running' });
  }

  emulatorProcess.kill('SIGTERM');
  emulatorProcess = null;
  console.log('Emulator stopped');
  res.json({ success: true, message: 'Emulator stopped' });
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

    const deployProcess = spawn('firebase', ['deploy', '--only', deployTarget], {
      cwd: projectPath,
      shell: true
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

// Export emulator data
app.post('/api/export/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const projectPath = path.join(projectsDir, projectId);
  const exportPath = path.join(projectPath, 'emulator-data');

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
        io.emit('logs', '✅ Emulator data exported successfully');
      } else {
        io.emit('logs', `❌ Export failed with code ${code}`);
      }
    });

    res.json({ success: true, message: 'Export started' });
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

io.on('connection', (socket) => {
  console.log('Client connected');
});

const PORT = 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
