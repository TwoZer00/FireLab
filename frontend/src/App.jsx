import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import TokenAuth from './components/TokenAuth';
import ProjectSetup from './components/ProjectSetup';
import ProjectActions from './components/ProjectActions';
import EmulatorControls from './components/EmulatorControls';
import ConfigEditor from './components/ConfigEditor';
import RulesEditor from './components/RulesEditor';
import LogsViewer from './components/LogsViewer';
import SnapshotsManager from './components/SnapshotsManager';
import ConnectionStatus from './components/ConnectionStatus';
import DataManager from './components/DataManager';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const EMULATOR_HOST = API_URL.replace(':3001', ':4000');

function App() {
  const socketRef = useRef(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'));
  const [projectId, setProjectId] = useState(() => localStorage.getItem('projectId') || '');
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
  const [debugMode, setDebugMode] = useState(() => localStorage.getItem('debugMode') === 'true');
  const [autoSnapshot, setAutoSnapshot] = useState(() => {
    const saved = localStorage.getItem('autoSnapshot');
    return saved === null ? true : saved === 'true';
  });
  const [backendConnected, setBackendConnected] = useState(false);
  const [firebaseLoggedIn, setFirebaseLoggedIn] = useState(false);
  const [snapshots, setSnapshots] = useState([]);

  useEffect(() => {
    localStorage.setItem('projectId', projectId);
  }, [projectId]);

  useEffect(() => {
    localStorage.setItem('debugMode', debugMode);
  }, [debugMode]);

  useEffect(() => {
    localStorage.setItem('autoSnapshot', autoSnapshot);
  }, [autoSnapshot]);

  useEffect(() => {
    localStorage.setItem('logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = io(API_URL, {
      auth: {
        token: accessToken
      }
    });
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

    if (accessToken) {
      checkStatus();
      loadExistingProjects();
      if (projectId) {
        loadConfigForProject(projectId);
      }
    }
    
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
  }, [accessToken]);

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

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
  });

  const loadExistingProjects = async () => {
    const res = await fetch(`${API_URL}/api/projects`, { headers: getHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data)) return;
    setExistingProjects(data);
    
    const savedProject = localStorage.getItem('projectId');
    if (savedProject && data.includes(savedProject)) {
      setProjectId(savedProject);
    }
  };

  const checkStatus = async () => {
    const res = await fetch(`${API_URL}/api/emulator/status`, { headers: getHeaders() });
    const data = await res.json();
    setIsRunning(data.running);
  };

  const checkFirebaseAuth = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/status`, { headers: getHeaders() });
      const data = await res.json();
      setFirebaseLoggedIn(data.loggedIn);
    } catch (error) {
      setFirebaseLoggedIn(false);
    }
  };

  const initProject = async (newProjectId, services) => {
    setLogs(prev => [...prev, `[FireLab] Creating project '${newProjectId}'...`]);
    
    const res = await fetch(`${API_URL}/api/init`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ projectId: newProjectId, services })
    });
    const data = await res.json();
    
    if (data.success) {
      setLogs(prev => [...prev, `[FireLab] ✅ Project '${newProjectId}' created`]);
      setProjectId(newProjectId);
      await loadExistingProjects();
      loadConfigForProject(newProjectId);
    } else {
      setLogs(prev => [...prev, `[FireLab] ❌ Failed to create project: ${data.error}`]);
      alert(data.error);
    }
  };

  const loadConfigForProject = async (selectedProjectId) => {
    const res = await fetch(`${API_URL}/api/config/${selectedProjectId}`, { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      setConfig(data);
      setShowConfig(true);
      localStorage.setItem('lastConfig', JSON.stringify(data));
      
      const rulesRes = await fetch(`${API_URL}/api/rules/${selectedProjectId}`, { headers: getHeaders() });
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setAvailableRules(rulesData);
        
        // Only check Firebase auth if rules exist (user might want to deploy)
        if (rulesData.length > 0) {
          checkFirebaseAuth();
        }
      }
      
      const exportRes = await fetch(`${API_URL}/api/export/${selectedProjectId}/exists`, { headers: getHeaders() });
      if (exportRes.ok) {
        const exportData = await exportRes.json();
        setHasExportData(exportData.exists);
      }

      // Load snapshots
      loadSnapshots(selectedProjectId);
    }
  };

  const loadSnapshots = async (pid = projectId) => {
    const res = await fetch(`${API_URL}/api/snapshots/${pid}`, { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      setSnapshots(data);
    }
  };

  const handleSelectProject = (selectedProjectId) => {
    setProjectId(selectedProjectId);
    if (selectedProjectId) {
      setLogs(prev => [...prev, `[FireLab] Project '${selectedProjectId}' selected`]);
      loadConfigForProject(selectedProjectId);
    }
  };

  const startEmulator = async () => {
    // Check for port conflicts first
    if (config) {
      setLogs(prev => [...prev, '[FireLab] Checking port availability...']);
      
      const ports = [];
      const portMap = {};
      if (config.emulators?.auth?.port) {
        ports.push(config.emulators.auth.port);
        portMap[config.emulators.auth.port] = 'auth';
      }
      if (config.emulators?.firestore?.port) {
        ports.push(config.emulators.firestore.port);
        portMap[config.emulators.firestore.port] = 'firestore';
      }
      if (config.emulators?.database?.port) {
        ports.push(config.emulators.database.port);
        portMap[config.emulators.database.port] = 'database';
      }
      if (config.emulators?.storage?.port) {
        ports.push(config.emulators.storage.port);
        portMap[config.emulators.storage.port] = 'storage';
      }
      if (config.emulators?.hosting?.port) {
        ports.push(config.emulators.hosting.port);
        portMap[config.emulators.hosting.port] = 'hosting';
      }
      if (config.emulators?.ui?.port) {
        ports.push(config.emulators.ui.port);
        portMap[config.emulators.ui.port] = 'ui';
      }

      const checkRes = await fetch(`${API_URL}/api/ports/check`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ports })
      });

      if (checkRes.ok) {
        const { conflicts, suggestions } = await checkRes.json();
        if (conflicts.length > 0) {
          const portList = conflicts.map(c => c.port).join(', ');
          setLogs(prev => [...prev, `[FireLab] ⚠️ Port conflicts detected: ${portList}`]);
          
          const suggestionText = suggestions
            .map(s => `  • Port ${s.port} → ${s.alternative || 'N/A'}`)
            .join('\n');
          
          const choice = confirm(
            `⚠️ Port Conflict Detected!\n\n` +
            `Ports in use: ${portList}\n\n` +
            `Suggested alternatives:\n${suggestionText}\n\n` +
            `Click OK to auto-fix ports and start\n` +
            `Click Cancel to abort`
          );
          
          if (!choice) {
            setLogs(prev => [...prev, '[FireLab] Start cancelled by user']);
            return;
          }
          
          // Auto-fix: Update config with suggested ports
          const newConfig = { ...config };
          const changes = [];
          suggestions.forEach(s => {
            if (s.alternative) {
              const service = portMap[s.port];
              if (service && newConfig.emulators[service]) {
                newConfig.emulators[service].port = s.alternative;
                changes.push(`${s.port}→${s.alternative}`);
              }
            }
          });
          
          setLogs(prev => [...prev, `[FireLab] ✅ Auto-fixed ports: ${changes.join(', ')}`]);
          
          // Save updated config
          await fetch(`${API_URL}/api/config/${projectId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(newConfig)
          });
          
          setConfig(newConfig);
          localStorage.setItem('lastConfig', JSON.stringify(newConfig));
          setLogs(prev => [...prev, '[FireLab] Config updated and saved']);
        } else {
          setLogs(prev => [...prev, '[FireLab] ✅ All ports available']);
        }
      }
    }

    setLogs(prev => [...prev, `[FireLab] Starting emulator${debugMode ? ' (debug mode)' : ''}...`]);
    const res = await fetch(`${API_URL}/api/emulator/start`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ projectId, importData: importOnStart, debug: debugMode, autoSnapshot })
    });
    const data = await res.json();
    if (data.success) {
      setIsRunning(true);
      setAutoScroll(true);
    } else {
      setLogs(prev => [...prev, '[FireLab] ❌ Failed to start emulator']);
    }
  };

  const exportData = async (snapshotName = '') => {
    if (!isRunning) {
      alert('Emulator must be running to create snapshot');
      return;
    }

    setLogs(prev => [...prev, `[FireLab] Creating snapshot${snapshotName ? ` '${snapshotName}'` : ''}...`]);
    
    const res = await fetch(`${API_URL}/api/export/${projectId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ snapshotName })
    });

    if (res.ok) {
      const data = await res.json();
      setLogs(prev => [...prev, `[FireLab] Snapshot '${data.snapshotName}' creation started`]);
      setTimeout(() => {
        setHasExportData(true);
        loadSnapshots();
      }, 3000);
    } else {
      setLogs(prev => [...prev, '[FireLab] ❌ Failed to create snapshot']);
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

    setLogs(prev => [...prev, `[FireLab] Restoring snapshot '${snapshotName}'...`]);

    // Check for port conflicts first
    if (config) {
      const ports = [];
      const portMap = {};
      if (config.emulators?.auth?.port) {
        ports.push(config.emulators.auth.port);
        portMap[config.emulators.auth.port] = 'auth';
      }
      if (config.emulators?.firestore?.port) {
        ports.push(config.emulators.firestore.port);
        portMap[config.emulators.firestore.port] = 'firestore';
      }
      if (config.emulators?.database?.port) {
        ports.push(config.emulators.database.port);
        portMap[config.emulators.database.port] = 'database';
      }
      if (config.emulators?.storage?.port) {
        ports.push(config.emulators.storage.port);
        portMap[config.emulators.storage.port] = 'storage';
      }
      if (config.emulators?.hosting?.port) {
        ports.push(config.emulators.hosting.port);
        portMap[config.emulators.hosting.port] = 'hosting';
      }
      if (config.emulators?.ui?.port) {
        ports.push(config.emulators.ui.port);
        portMap[config.emulators.ui.port] = 'ui';
      }

      const checkRes = await fetch(`${API_URL}/api/ports/check`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ports })
      });

      if (checkRes.ok) {
        const { conflicts, suggestions } = await checkRes.json();
        if (conflicts.length > 0) {
          const portList = conflicts.map(c => c.port).join(', ');
          setLogs(prev => [...prev, `[FireLab] ⚠️ Port conflicts detected: ${portList}`]);
          
          const suggestionText = suggestions
            .map(s => `  • Port ${s.port} → ${s.alternative || 'N/A'}`)
            .join('\n');
          
          const choice = confirm(
            `⚠️ Port Conflict Detected!\n\n` +
            `Ports in use: ${portList}\n\n` +
            `Suggested alternatives:\n${suggestionText}\n\n` +
            `Click OK to auto-fix ports and restore\n` +
            `Click Cancel to abort`
          );
          
          if (!choice) {
            setLogs(prev => [...prev, '[FireLab] Restore cancelled by user']);
            return;
          }
          
          // Auto-fix: Update config with suggested ports
          const newConfig = { ...config };
          const changes = [];
          suggestions.forEach(s => {
            if (s.alternative) {
              const service = portMap[s.port];
              if (service && newConfig.emulators[service]) {
                newConfig.emulators[service].port = s.alternative;
                changes.push(`${s.port}→${s.alternative}`);
              }
            }
          });
          
          setLogs(prev => [...prev, `[FireLab] ✅ Auto-fixed ports: ${changes.join(', ')}`]);
          
          // Save updated config
          await fetch(`${API_URL}/api/config/${projectId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(newConfig)
          });
          
          setConfig(newConfig);
          localStorage.setItem('lastConfig', JSON.stringify(newConfig));
          setLogs(prev => [...prev, '[FireLab] Config updated and saved']);
        }
      }
    }

    const res = await fetch(`${API_URL}/api/emulator/start`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ projectId, importData: true, snapshotName, debug: debugMode, autoSnapshot })
    });

    const data = await res.json();
    if (data.success) {
      setIsRunning(true);
      setAutoScroll(true);
    } else {
      setLogs(prev => [...prev, '[FireLab] ❌ Failed to restore snapshot']);
    }
  };

  const deleteSnapshot = async (snapshotName) => {
    if (!confirm(`Delete snapshot '${snapshotName}'?\n\nThis cannot be undone.`)) {
      return;
    }

    setLogs(prev => [...prev, `[FireLab] Deleting snapshot '${snapshotName}'...`]);
    
    const res = await fetch(`${API_URL}/api/snapshots/${projectId}/${snapshotName}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (res.ok) {
      setLogs(prev => [...prev, `[FireLab] ✅ Snapshot '${snapshotName}' deleted`]);
      loadSnapshots();
    } else {
      setLogs(prev => [...prev, `[FireLab] ❌ Failed to delete snapshot`]);
      alert('Failed to delete snapshot');
    }
  };

  const stopEmulator = async () => {
    setLogs(prev => [...prev, '[FireLab] Stopping emulator and creating auto-snapshot...']);
    await fetch(`${API_URL}/api/emulator/stop`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ projectId })
    });
    setIsRunning(false);
    setTimeout(() => {
      loadSnapshots();
    }, 3000);
  };

  const loadConfig = async () => {
    const res = await fetch(`${API_URL}/api/config/${projectId}`, { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      setConfig(data);
      setShowConfig(true);
      localStorage.setItem('lastConfig', JSON.stringify(data));
      
      const rulesRes = await fetch(`${API_URL}/api/rules/${projectId}`, { headers: getHeaders() });
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setAvailableRules(rulesData);
      }
      
      const exportRes = await fetch(`${API_URL}/api/export/${projectId}/exists`, { headers: getHeaders() });
      if (exportRes.ok) {
        const exportData = await exportRes.json();
        setHasExportData(exportData.exists);
      }
    }
  };

  const saveConfig = async () => {
    setLogs(prev => [...prev, '[FireLab] Saving configuration...']);
    await fetch(`${API_URL}/api/config/${projectId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(config)
    });
    setLogs(prev => [...prev, '[FireLab] ✅ Configuration saved']);
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
    const res = await fetch(`${API_URL}/api/rules/${projectId}/${type}`, { headers: getHeaders() });
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
    setLogs(prev => [...prev, `[FireLab] Saving ${rulesType} rules...`]);
    
    const res = await fetch(`${API_URL}/api/rules/${projectId}/${rulesType}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ rules: rulesContent })
    });
    
    if (res.ok) {
      setLogs(prev => [...prev, `[FireLab] ✅ ${rulesType} rules saved`]);
      alert('Rules saved successfully!');
    } else {
      setLogs(prev => [...prev, `[FireLab] ❌ Failed to save ${rulesType} rules`]);
      alert('Failed to save rules');
    }
  };

  const deployRules = async () => {
    if (!firebaseLoggedIn) {
      alert('⚠️ Firebase login required!\n\nTo deploy rules to production, run this command on the backend machine:\n\nfirebase login');
      return;
    }

    await saveRules();

    setLogs(prev => [...prev, `[FireLab] Deploying ${rulesType} rules to production...`]);
    
    const res = await fetch(`${API_URL}/api/deploy/${projectId}/${rulesType}`, {
      method: 'POST',
      headers: getHeaders()
    });

    if (res.ok) {
      setLogs(prev => [...prev, `[FireLab] ${rulesType} rules deployment started`]);
      alert('Deployment started! Check logs for progress.');
    } else {
      setLogs(prev => [...prev, `[FireLab] ❌ Failed to start deployment`]);
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
          <TokenAuth onTokenSet={setAccessToken} />

          {accessToken && (
            <>
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
                debugMode={debugMode}
                setDebugMode={setDebugMode}
                autoSnapshot={autoSnapshot}
                setAutoSnapshot={setAutoSnapshot}
                onStart={startEmulator}
                onStop={stopEmulator}
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

                  <DataManager
                    projectId={projectId}
                    isRunning={isRunning}
                    onRefreshSnapshots={loadSnapshots}
                  />

                  <ProjectActions projectId={projectId} />
                </>
              )}
            </>
          )}
        </div>

        <div className="main-content">
          {showRules ? (
            <RulesEditor
              rulesType={rulesType}
              rulesContent={rulesContent}
              setRulesContent={setRulesContent}
              onSave={saveRules}
              onDeploy={deployRules}
              onClose={() => setShowRules(false)}
              firebaseLoggedIn={firebaseLoggedIn}
              projectId={projectId}
            />
          ) : (
            <LogsViewer
              logs={logs}
              autoScroll={autoScroll}
              setAutoScroll={setAutoScroll}
              onClear={clearLogs}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
