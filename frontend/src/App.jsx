import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import ProjectSetup from './components/ProjectSetup';
import EmulatorControls from './components/EmulatorControls';
import ConfigEditor from './components/ConfigEditor';
import RulesEditor from './components/RulesEditor';
import LogsViewer from './components/LogsViewer';
import SnapshotsManager from './components/SnapshotsManager';
import ConnectionStatus from './components/ConnectionStatus';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const EMULATOR_HOST = API_URL.replace(':3001', ':4000');

function App() {
  const socketRef = useRef(null);
  const [projectId, setProjectId] = useState(() => localStorage.getItem('projectId') || 'my-project');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [config, setConfig] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [existingProjects, setExistingProjects] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [rulesType, setRulesType] = useState('firestore');
  const [rulesContent, setRulesContent] = useState('');
  const [availableRules, setAvailableRules] = useState([]);
  const [hasExportData, setHasExportData] = useState(false);
  const [importOnStart, setImportOnStart] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [firebaseLoggedIn, setFirebaseLoggedIn] = useState(false);
  const [snapshots, setSnapshots] = useState([]);

  useEffect(() => {
    localStorage.setItem('projectId', projectId);
  }, [projectId]);

  useEffect(() => {
    localStorage.setItem('logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    socketRef.current = io(API_URL);
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to backend');
      setBackendConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from backend');
      setBackendConnected(false);
    });

    socket.on('logs', (log) => {
      setLogs((prev) => [...prev, log]);
    });

    checkStatus();
    loadExistingProjects();
    checkFirebaseAuth();
    
    const savedConfig = localStorage.getItem('lastConfig');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
      setShowConfig(true);
    }
    
    return () => {
      socket.off('logs');
      socket.off('connect');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isRunning) {
        e.preventDefault();
        e.returnValue = 'Emulator is still running. Close anyway?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning]);

  useEffect(() => {
    if (autoScroll) {
      const logsDiv = document.querySelector('.logs');
      if (logsDiv) logsDiv.scrollTop = logsDiv.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl+E or Cmd+E - Toggle emulator
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (isRunning) {
          stopEmulator();
        } else if (projectId) {
          startEmulator();
        }
      }
      // Ctrl+L or Cmd+L - Clear logs
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        clearLogs();
      }
      // Ctrl+S or Cmd+S - Save config
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (showRules) {
          saveRules();
        } else if (config) {
          saveConfig();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isRunning, projectId, showRules, config]);

  const loadExistingProjects = async () => {
    const res = await fetch(`${API_URL}/api/projects`);
    const data = await res.json();
    setExistingProjects(data);
    
    const savedProject = localStorage.getItem('projectId');
    if (savedProject && data.includes(savedProject)) {
      setProjectId(savedProject);
    }
  };

  const checkStatus = async () => {
    const res = await fetch(`${API_URL}/api/emulator/status`);
    const data = await res.json();
    setIsRunning(data.running);
  };

  const checkFirebaseAuth = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/status`);
      const data = await res.json();
      setFirebaseLoggedIn(data.loggedIn);
    } catch (error) {
      setFirebaseLoggedIn(false);
    }
  };

  const initProject = async (newProjectId) => {
    const res = await fetch(`${API_URL}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: newProjectId })
    });
    const data = await res.json();
    
    if (data.success) {
      setProjectId(newProjectId);
      await loadExistingProjects();
      loadConfigForProject(newProjectId);
    } else {
      alert(data.error);
    }
  };

  const loadConfigForProject = async (selectedProjectId) => {
    const res = await fetch(`${API_URL}/api/config/${selectedProjectId}`);
    if (res.ok) {
      const data = await res.json();
      setConfig(data);
      setShowConfig(true);
      localStorage.setItem('lastConfig', JSON.stringify(data));
      
      const rulesRes = await fetch(`${API_URL}/api/rules/${selectedProjectId}`);
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setAvailableRules(rulesData);
      }
      
      const exportRes = await fetch(`${API_URL}/api/export/${selectedProjectId}/exists`);
      if (exportRes.ok) {
        const exportData = await exportRes.json();
        setHasExportData(exportData.exists);
      }

      // Load snapshots
      loadSnapshots(selectedProjectId);
    }
  };

  const loadSnapshots = async (pid = projectId) => {
    const res = await fetch(`${API_URL}/api/snapshots/${pid}`);
    if (res.ok) {
      const data = await res.json();
      setSnapshots(data);
    }
  };

  const handleSelectProject = (selectedProjectId) => {
    setProjectId(selectedProjectId);
    if (selectedProjectId) {
      loadConfigForProject(selectedProjectId);
    }
  };

  const startEmulator = async () => {
    const res = await fetch(`${API_URL}/api/emulator/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, importData: importOnStart })
    });
    const data = await res.json();
    if (data.success) {
      setIsRunning(true);
      setLogs([]);
      setAutoScroll(true);
    }
  };

  const exportData = async (snapshotName = '') => {
    if (!isRunning) {
      alert('Emulator must be running to create snapshot');
      return;
    }

    const res = await fetch(`${API_URL}/api/export/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshotName })
    });

    if (res.ok) {
      const data = await res.json();
      alert(`Snapshot '${data.snapshotName}' created! Check logs for progress.`);
      setTimeout(() => {
        setHasExportData(true);
        loadSnapshots();
      }, 2000);
    } else {
      alert('Failed to create snapshot');
    }
  };

  const restoreSnapshot = async (snapshotName) => {
    if (isRunning) {
      alert('Stop the emulator before restoring a snapshot');
      return;
    }

    if (!confirm(`Restore snapshot '${snapshotName}'?\n\nThis will start the emulator with this snapshot's data.`)) {
      return;
    }

    const res = await fetch(`${API_URL}/api/emulator/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, importData: true, snapshotName })
    });

    const data = await res.json();
    if (data.success) {
      setIsRunning(true);
      setLogs([]);
      setAutoScroll(true);
    }
  };

  const deleteSnapshot = async (snapshotName) => {
    if (!confirm(`Delete snapshot '${snapshotName}'?\n\nThis cannot be undone.`)) {
      return;
    }

    const res = await fetch(`${API_URL}/api/snapshots/${projectId}/${snapshotName}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      alert(`Snapshot '${snapshotName}' deleted`);
      loadSnapshots();
    } else {
      alert('Failed to delete snapshot');
    }
  };

  const stopEmulator = async () => {
    await fetch(`${API_URL}/api/emulator/stop`, { method: 'POST' });
    setIsRunning(false);
  };

  const loadConfig = async () => {
    const res = await fetch(`${API_URL}/api/config/${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setConfig(data);
      setShowConfig(true);
      localStorage.setItem('lastConfig', JSON.stringify(data));
      
      const rulesRes = await fetch(`${API_URL}/api/rules/${projectId}`);
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setAvailableRules(rulesData);
      }
      
      const exportRes = await fetch(`${API_URL}/api/export/${projectId}/exists`);
      if (exportRes.ok) {
        const exportData = await exportRes.json();
        setHasExportData(exportData.exists);
      }
    }
  };

  const saveConfig = async () => {
    await fetch(`${API_URL}/api/config/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    alert('Config saved!');
  };

  const updatePort = (service, port) => {
    setConfig({
      ...config,
      emulators: {
        ...config.emulators,
        [service]: { ...config.emulators[service], port: parseInt(port) }
      }
    });
  };

  const loadRules = async (type) => {
    const res = await fetch(`${API_URL}/api/rules/${projectId}/${type}`);
    if (res.ok) {
      const data = await res.json();
      setRulesContent(data.rules);
      setRulesType(type);
      setShowRules(true);
    } else {
      alert('Rules file not found');
    }
  };

  const saveRules = async () => {
    const res = await fetch(`${API_URL}/api/rules/${projectId}/${rulesType}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: rulesContent })
    });
    
    if (res.ok) {
      alert('Rules saved successfully!');
    } else {
      alert('Failed to save rules');
    }
  };

  const deployRules = async () => {
    if (!firebaseLoggedIn) {
      alert('⚠️ Firebase login required!\n\nTo deploy rules to production, run this command on the backend machine:\n\nfirebase login');
      return;
    }

    await saveRules();

    const res = await fetch(`${API_URL}/api/deploy/${projectId}/${rulesType}`, {
      method: 'POST'
    });

    if (res.ok) {
      alert('Deployment started! Check logs for progress.');
    } else {
      alert('Failed to start deployment');
    }
  };

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem('logs');
  };

  return (
    <div className="app">
      <div className="header">
        <h1>🔥 FireLab</h1>
        <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '8px' }}>
          <kbd style={{ background: '#21262d', padding: '2px 6px', borderRadius: '3px', border: '1px solid #30363d' }}>Ctrl+E</kbd> Toggle Emulator · 
          <kbd style={{ background: '#21262d', padding: '2px 6px', borderRadius: '3px', border: '1px solid #30363d' }}>Ctrl+L</kbd> Clear Logs · 
          <kbd style={{ background: '#21262d', padding: '2px 6px', borderRadius: '3px', border: '1px solid #30363d' }}>Ctrl+S</kbd> Save
        </div>
      </div>

      <div className="container">
        <div className="sidebar">
          {!backendConnected && (
            <div className="alert alert-error">
              ⚠️ Backend not connected
            </div>
          )}

          {backendConnected && !firebaseLoggedIn && (
            <div className="alert" style={{ background: '#161b22', color: '#f0883e', border: '1px solid #d29922', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
              <div>ℹ️ Not logged into Firebase</div>
              <div style={{ fontSize: '12px', color: '#8b949e' }}>
                Deploy disabled. Run on backend: <code style={{ background: '#0d1117', padding: '2px 6px', borderRadius: '3px', color: '#58a6ff' }}>firebase login</code>
              </div>
            </div>
          )}

          <ProjectSetup
            projectId={projectId}
            existingProjects={existingProjects}
            onSelectProject={handleSelectProject}
            onCreateProject={initProject}
          />

          <EmulatorControls
            isRunning={isRunning}
            hasExportData={hasExportData}
            importOnStart={importOnStart}
            setImportOnStart={setImportOnStart}
            onStart={startEmulator}
            onStop={stopEmulator}
            onExport={exportData}
            emulatorHost={EMULATOR_HOST}
          />

          {showConfig && (
            <>
              <ConfigEditor
                config={config}
                availableRules={availableRules}
                onUpdatePort={updatePort}
                onSave={saveConfig}
                onLoadRules={loadRules}
              />

              {isRunning && (
                <ConnectionStatus
                  config={config}
                  isRunning={isRunning}
                  emulatorHost={EMULATOR_HOST}
                />
              )}

              <SnapshotsManager
                projectId={projectId}
                snapshots={snapshots}
                onExport={exportData}
                onRestore={restoreSnapshot}
                onDelete={deleteSnapshot}
                isRunning={isRunning}
              />
            </>
          )}
        </div>

        <div className="main-content">
          {showRules && (
            <RulesEditor
              rulesType={rulesType}
              rulesContent={rulesContent}
              setRulesContent={setRulesContent}
              onSave={saveRules}
              onDeploy={deployRules}
              onClose={() => setShowRules(false)}
              firebaseLoggedIn={firebaseLoggedIn}
            />
          )}

          <LogsViewer
            logs={logs}
            autoScroll={autoScroll}
            setAutoScroll={setAutoScroll}
            onClear={clearLogs}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
