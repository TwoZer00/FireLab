import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import TokenAuth from './components/TokenAuth';
import ProjectSetup from './components/ProjectSetup';
import ProjectActions from './components/ProjectActions';
import EmulatorControls from './components/EmulatorControls';
import ConfigEditor from './components/ConfigEditor';
import RulesEditor from './components/RulesEditor';
import IndexesEditor from './components/IndexesEditor';
import LogsViewer from './components/LogsViewer';
import SnapshotsManager from './components/SnapshotsManager';
import ConnectionStatus from './components/ConnectionStatus';
import DataManager from './components/DataManager';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || '';
const EMULATOR_HOST = (API_URL || window.location.origin).replace(':3001', ':4000');

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
  const [showIndexes, setShowIndexes] = useState(false);
  const [rulesType, setRulesType] = useState('firestore');
  const [rulesContent, setRulesContent] = useState('');
  const [availableRules, setAvailableRules] = useState([]);
  const [hasExportData, setHasExportData] = useState(false);
  const [importOnStart, setImportOnStart] = useState(false);
  const [autoSnapshot, setAutoSnapshot] = useState(() => {
    const saved = localStorage.getItem('autoSnapshot');
    return saved === null ? true : saved === 'true';
  });
  const [backendConnected, setBackendConnected] = useState(false);
  const [firebaseLoggedIn, setFirebaseLoggedIn] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [loginUrl, setLoginUrl] = useState(null);
  const [loginPending, setLoginPending] = useState(false);
  const [loginCiToken, setLoginCiToken] = useState(null);
  const [loginAuthCode, setLoginAuthCode] = useState('');

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
  }), [accessToken]);

  const loadSnapshots = useCallback(async (pid) => {
    const id = pid || projectId;
    const res = await fetch(`${API_URL}/api/snapshots/${id}`, { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      setSnapshots(data);
    }
  }, [projectId, getHeaders]);

  const loadConfigForProject = useCallback(async (selectedProjectId) => {
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
      }
      
      const exportRes = await fetch(`${API_URL}/api/export/${selectedProjectId}/exists`, { headers: getHeaders() });
      if (exportRes.ok) {
        const exportData = await exportRes.json();
        setHasExportData(exportData.exists);
      }

      loadSnapshots(selectedProjectId);
    }
  }, [getHeaders, loadSnapshots]);

  const loadExistingProjects = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/projects`, { headers: getHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data)) return;
    setExistingProjects(data);
    
    const savedProject = localStorage.getItem('projectId');
    if (savedProject && data.includes(savedProject)) {
      setProjectId(savedProject);
    } else if (savedProject && !data.includes(savedProject)) {
      // Project was deleted, clear stale state
      localStorage.removeItem('projectId');
      localStorage.removeItem('lastConfig');
      setProjectId('');
      setConfig(null);
      setShowConfig(false);
    }
  }, [getHeaders]);

  const checkStatus = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/emulator/status`, { headers: getHeaders() });
    const data = await res.json();
    setIsRunning(data.running);
  }, [getHeaders]);

  const checkFirebaseAuth = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/status`, { headers: getHeaders() });
      const data = await res.json();
      setFirebaseLoggedIn(data.loggedIn);
    } catch {
      setFirebaseLoggedIn(false);
    }
  }, [getHeaders]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    localStorage.removeItem('logs');
  }, []);

  const saveConfig = useCallback(async () => {
    setLogs(prev => [...prev, '[FireLab] Saving configuration...']);
    await fetch(`${API_URL}/api/config/${projectId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(config)
    });
    setLogs(prev => [...prev, '[FireLab] ✅ Configuration saved']);
    alert('Config saved!');
  }, [projectId, config, getHeaders]);

  const saveRules = useCallback(async () => {
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
  }, [projectId, rulesType, rulesContent, getHeaders]);

  const checkAndFixPorts = useCallback(async (actionLabel) => {
    if (!config) return true;
    const ports = [];
    const portMap = {};
    const services = ['auth', 'firestore', 'database', 'storage', 'hosting', 'ui'];
    services.forEach(svc => {
      if (config.emulators?.[svc]?.port) {
        ports.push(config.emulators[svc].port);
        portMap[config.emulators[svc].port] = svc;
      }
    });
    if (ports.length === 0) return true;

    setLogs(prev => [...prev, '[FireLab] Checking port availability...']);
    const checkRes = await fetch(`${API_URL}/api/ports/check`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ports })
    });
    if (!checkRes.ok) return true;

    const { conflicts, suggestions } = await checkRes.json();
    if (conflicts.length === 0) {
      setLogs(prev => [...prev, '[FireLab] ✅ All ports available']);
      return true;
    }

    const portList = conflicts.map(c => c.port).join(', ');
    setLogs(prev => [...prev, `[FireLab] ⚠️ Port conflicts detected: ${portList}`]);
    const suggestionText = suggestions.map(s => `  • Port ${s.port} → ${s.alternative || 'N/A'}`).join('\n');
    const choice = confirm(
      `⚠️ Port Conflict Detected!\n\nPorts in use: ${portList}\n\nSuggested alternatives:\n${suggestionText}\n\nClick OK to auto-fix ports and ${actionLabel}\nClick Cancel to abort`
    );
    if (!choice) {
      setLogs(prev => [...prev, `[FireLab] ${actionLabel} cancelled by user`]);
      return false;
    }

    const newConfig = { ...config, emulators: { ...config.emulators } };
    const changes = [];
    suggestions.forEach(s => {
      if (s.alternative && portMap[s.port]) {
        newConfig.emulators[portMap[s.port]] = { ...newConfig.emulators[portMap[s.port]], port: s.alternative };
        changes.push(`${s.port}→${s.alternative}`);
      }
    });
    await fetch(`${API_URL}/api/config/${projectId}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(newConfig)
    });
    setConfig(newConfig);
    localStorage.setItem('lastConfig', JSON.stringify(newConfig));
    setLogs(prev => [...prev, `[FireLab] ✅ Auto-fixed ports: ${changes.join(', ')}`]);
    return true;
  }, [config, projectId, getHeaders]);

  const startEmulator = useCallback(async () => {
    if (!projectId) return;
    try {
      const ok = await checkAndFixPorts('start');
      if (!ok) return;
      setLogs(prev => [...prev, '[FireLab] Starting emulator...']);
      const res = await fetch(`${API_URL}/api/emulator/start`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ projectId, importData: importOnStart, autoSnapshot })
      });
      const data = await res.json();
      if (data.success) {
        setIsRunning(true);
        setAutoScroll(true);
      } else {
        setLogs(prev => [...prev, '[FireLab] ❌ Failed to start emulator']);
      }
    } catch (err) {
      setLogs(prev => [...prev, `[FireLab] ❌ Error starting emulator: ${err.message}`]);
    }
  }, [projectId, checkAndFixPorts, importOnStart, autoSnapshot, getHeaders]);

  const stopEmulator = useCallback(async () => {
    try {
      setLogs(prev => [...prev, '[FireLab] Stopping emulator and creating auto-snapshot...']);
      await fetch(`${API_URL}/api/emulator/stop`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ projectId })
      });
      setIsRunning(false);
      setTimeout(() => loadSnapshots(), 3000);
    } catch (err) {
      setLogs(prev => [...prev, `[FireLab] ❌ Error stopping emulator: ${err.message}`]);
      setIsRunning(false);
    }
  }, [projectId, getHeaders, loadSnapshots]);

  const restoreSnapshot = useCallback(async (snapshotName) => {
    if (isRunning) { alert('Stop the emulator before restoring a snapshot'); return; }
    if (!confirm(`Restore snapshot '${snapshotName}'?\n\nThis will start the emulator with this snapshot's data.`)) return;
    setLogs(prev => [...prev, `[FireLab] Restoring snapshot '${snapshotName}'...`]);
    try {
      const ok = await checkAndFixPorts('restore');
      if (!ok) return;
      const res = await fetch(`${API_URL}/api/emulator/start`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ projectId, importData: true, snapshotName, autoSnapshot })
      });
      const data = await res.json();
      if (data.success) {
        setIsRunning(true);
        setAutoScroll(true);
      } else {
        setLogs(prev => [...prev, '[FireLab] ❌ Failed to restore snapshot']);
      }
    } catch (err) {
      setLogs(prev => [...prev, `[FireLab] ❌ Error restoring snapshot: ${err.message}`]);
    }
  }, [isRunning, projectId, checkAndFixPorts, autoSnapshot, getHeaders]);

  useEffect(() => {
    localStorage.setItem('projectId', projectId);
  }, [projectId]);

  useEffect(() => {
    localStorage.setItem('autoSnapshot', autoSnapshot);
  }, [autoSnapshot]);

  useEffect(() => {
    try {
      localStorage.setItem('logs', JSON.stringify(logs.slice(-500)));
    } catch {
      // QuotaExceededError: trim older logs and retry
      try { localStorage.setItem('logs', JSON.stringify(logs.slice(-100))); } catch { /* ignore */ }
    }
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
      setLoginPending(false);
      setLoginUrl(null);
    });

    socket.on('logs', (log) => {
      setLogs((prev) => [...prev, log]);
    });

    socket.on('firebase-login-url', (url) => {
      setLoginUrl(url);
    });

    socket.on('firebase-login-token', (token) => {
      setLoginCiToken(token);
      setLoginUrl(null);
      setLoginPending(false);
    });

    socket.on('firebase-login-success', () => {
      setLoginPending(false);
      setLoginUrl(null);
      setFirebaseLoggedIn(true);
      checkFirebaseAuth();
    });

    socket.on('firebase-login-error', () => {
      setLoginPending(false);
      setLoginUrl(null);
    });

    if (accessToken) {
      checkStatus();
      checkFirebaseAuth();
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
      socket.off('firebase-login-url');
      socket.off('firebase-login-token');
      socket.off('firebase-login-success');
      socket.off('firebase-login-error');
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (isRunning) {
          stopEmulator();
        } else if (projectId) {
          startEmulator();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        clearLogs();
      }
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
  }, [isRunning, projectId, showRules, config, stopEmulator, startEmulator, clearLogs, saveRules, saveConfig]);

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

  const handleSelectProject = (selectedProjectId) => {
    setProjectId(selectedProjectId);
    if (selectedProjectId) {
      setLogs(prev => [...prev, `[FireLab] Project '${selectedProjectId}' selected`]);
      loadConfigForProject(selectedProjectId);
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

  const updatePort = (service, port) => {
    setConfig({
      ...config,
      emulators: {
        ...config.emulators,
        [service]: { ...config.emulators[service], port: parseInt(port) }
      }
    });
  };

  const startFirebaseLogin = async () => {
    setLoginPending(true);
    setLoginUrl(null);
    setLoginCiToken(null);
    setLoginAuthCode('');
    await fetch(`${API_URL}/api/auth/login`, { method: 'POST', headers: getHeaders() });
  };

  const submitAuthCode = async () => {
    if (!loginAuthCode.trim()) return;
    await fetch(`${API_URL}/api/auth/login/code`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code: loginAuthCode.trim() })
    });
    setLoginAuthCode('');
  };

  const updateHost = async (host) => {
    const updated = { ...config, emulators: { ...config.emulators } };
    Object.keys(updated.emulators).forEach(service => {
      updated.emulators[service] = { ...updated.emulators[service], host };
    });
    setConfig(updated);
    localStorage.setItem('lastConfig', JSON.stringify(updated));
    await fetch(`${API_URL}/api/config/${projectId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updated)
    });
    setLogs(prev => [...prev, `[FireLab] ✅ Host updated to ${host}`]);
  };

  const loadRules = async (type) => {
    const res = await fetch(`${API_URL}/api/rules/${projectId}/${type}`, { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      setRulesContent(data.rules);
      setRulesType(type);
      setShowRules(true);
      setShowIndexes(false);
      checkFirebaseAuth();
    } else {
      alert('Rules file not found');
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

  return (
    <>
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
                <div className="section" style={{ padding: '8px 12px' }}>
                  <button
                    onClick={startFirebaseLogin}
                    disabled={loginPending}
                    style={{ width: '100%', fontSize: '11px', background: '#1f6feb', borderColor: '#388bfd' }}
                  >
                    {loginPending ? '⏳ Waiting for login...' : '🔑 Login to Firebase'}
                  </button>
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
                    onUpdateHost={updateHost}
                    onSave={saveConfig}
                    onLoadRules={loadRules}
                    onLoadIndexes={() => { setShowIndexes(true); setShowRules(false); checkFirebaseAuth(); }}
                    projectId={projectId}
                    getHeaders={getHeaders}
                    onServicesUpdated={(newConfig) => {
                      setConfig(newConfig);
                      localStorage.setItem('lastConfig', JSON.stringify(newConfig));
                      loadConfigForProject(projectId);
                    }}
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
                    getHeaders={getHeaders}
                  />

                  <DataManager
                    projectId={projectId}
                    isRunning={isRunning}
                    onRefreshSnapshots={loadSnapshots}
                    getHeaders={getHeaders}
                  />

                  <ProjectActions projectId={projectId} getHeaders={getHeaders} />
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
              getHeaders={getHeaders}
            />
          ) : showIndexes ? (
            <IndexesEditor
              projectId={projectId}
              getHeaders={getHeaders}
              onClose={() => setShowIndexes(false)}
              firebaseLoggedIn={firebaseLoggedIn}
            />
          ) : (
            <LogsViewer
              logs={logs}
              autoScroll={autoScroll}
              setAutoScroll={setAutoScroll}
              onClear={clearLogs}
              projectId={projectId}
              getHeaders={getHeaders}
            />
          )}
        </div>
      </div>
    </div>
    {loginUrl && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '24px', maxWidth: '500px', width: '90%' }}>
          <h3 style={{ margin: '0 0 12px' }}>🔑 Firebase Login</h3>
          <p style={{ color: '#8b949e', fontSize: '13px', margin: '0 0 8px' }}>
            1. Open this URL and sign in:
          </p>
          <a
            href={loginUrl}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'block', wordBreak: 'break-all', color: '#58a6ff', fontSize: '12px', marginBottom: '16px' }}
          >
            {loginUrl}
          </a>
          <p style={{ color: '#8b949e', fontSize: '13px', margin: '0 0 8px' }}>
            2. Paste the authorization code here:
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              value={loginAuthCode}
              onChange={e => setLoginAuthCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitAuthCode()}
              placeholder="Paste auth code..."
              style={{ flex: 1, background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', padding: '6px 10px', color: '#e6edf3', fontSize: '12px' }}
            />
            <button onClick={submitAuthCode} style={{ fontSize: '11px' }} disabled={!loginAuthCode.trim()}>
              Submit
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigator.clipboard.writeText(loginUrl)}
              style={{ flex: 1, fontSize: '11px' }}
            >
              📋 Copy URL
            </button>
            <button
              onClick={() => { setLoginUrl(null); setLoginPending(false); }}
              style={{ flex: 1, fontSize: '11px', background: '#21262d', borderColor: '#30363d' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    {loginCiToken && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '24px', maxWidth: '500px', width: '90%' }}>
          <h3 style={{ margin: '0 0 12px' }}>✅ Firebase CI Token</h3>
          <p style={{ color: '#8b949e', fontSize: '13px', margin: '0 0 8px' }}>
            Set this as the <code>FIREBASE_TOKEN</code> environment variable on your backend, then restart the server:
          </p>
          <code style={{ display: 'block', wordBreak: 'break-all', background: '#0d1117', padding: '10px', borderRadius: '4px', fontSize: '12px', marginBottom: '16px', color: '#58a6ff' }}>
            {loginCiToken}
          </code>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { navigator.clipboard.writeText(loginCiToken); }}
              style={{ flex: 1, fontSize: '11px' }}
            >
              📋 Copy Token
            </button>
            <button
              onClick={() => setLoginCiToken(null)}
              style={{ flex: 1, fontSize: '11px', background: '#21262d', borderColor: '#30363d' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default App;
