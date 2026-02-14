import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const EMULATOR_HOST = API_URL.replace(':3001', ':4000');
const socket = io(API_URL);

function App() {
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
  const [validationError, setValidationError] = useState(null);
  const [hasExportData, setHasExportData] = useState(false);
  const [importOnStart, setImportOnStart] = useState(false);

  useEffect(() => {
    localStorage.setItem('projectId', projectId);
  }, [projectId]);

  useEffect(() => {
    localStorage.setItem('logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    socket.on('logs', (log) => {
      setLogs((prev) => [...prev, log]);
    });

    checkStatus();
    loadExistingProjects();
    
    // Restore last config
    const savedConfig = localStorage.getItem('lastConfig');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
      setShowConfig(true);
    }
    
    return () => socket.off('logs');
  }, []);

  useEffect(() => {
    if (autoScroll) {
      const logsDiv = document.querySelector('.logs');
      if (logsDiv) logsDiv.scrollTop = logsDiv.scrollHeight;
    }
  }, [logs, autoScroll]);

  const loadExistingProjects = async () => {
    const res = await fetch(`${API_URL}/api/projects`);
    const data = await res.json();
    setExistingProjects(data);
    
    // Auto-select saved project if it exists
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

  const initProject = async () => {
    const res = await fetch(`${API_URL}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId })
    });
    const data = await res.json();
    alert(data.success ? 'Project initialized!' : data.error);
    loadConfig();
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

  const exportData = async () => {
    if (!isRunning) {
      alert('Emulator must be running to export data');
      return;
    }

    const res = await fetch(`${API_URL}/api/export/${projectId}`, {
      method: 'POST'
    });

    if (res.ok) {
      alert('Export started! Check logs for progress.');
      setTimeout(() => {
        setHasExportData(true);
      }, 2000);
    } else {
      alert('Failed to start export');
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
      
      // Load available rules files
      const rulesRes = await fetch(`${API_URL}/api/rules/${projectId}`);
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setAvailableRules(rulesData);
      }
      
      // Check if export data exists
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
      setValidationError(null);
    } else {
      alert('Rules file not found');
    }
  };

  const validateRules = () => {
    if (!rulesContent.trim()) {
      setValidationError(null);
      return { valid: true };
    }

    try {
      if (rulesType === 'database') {
        JSON.parse(rulesContent);
        setValidationError(null);
        return { valid: true };
      }
      // Basic syntax check for firestore/storage rules
      if (rulesContent.trim().length > 20) {
        if (!rulesContent.includes('rules_version')) {
          setValidationError('Missing rules_version declaration');
          return { valid: false, error: 'Missing rules_version declaration' };
        }
        if (!rulesContent.includes('service')) {
          setValidationError('Missing service declaration');
          return { valid: false, error: 'Missing service declaration' };
        }
      }
      setValidationError(null);
      return { valid: true };
    } catch (error) {
      setValidationError(error.message);
      return { valid: false, error: error.message };
    }
  };

  const handleRulesChange = (e) => {
    setRulesContent(e.target.value);
  };

  useEffect(() => {
    if (rulesContent && showRules) {
      const timer = setTimeout(() => {
        validateRules();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [rulesContent, rulesType, showRules]);

  const saveRules = async () => {
    const validation = validateRules();
    if (!validation.valid) {
      alert(`Validation Error: ${validation.error}`);
      return;
    }

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
    const validation = validateRules();
    if (!validation.valid) {
      alert(`Validation Error: ${validation.error}\nPlease fix errors before deploying.`);
      return;
    }

    if (!confirm(`Deploy ${rulesType} rules to Firebase production?`)) {
      return;
    }

    // Save first
    await saveRules();

    // Then deploy
    const res = await fetch(`${API_URL}/api/deploy/${projectId}/${rulesType}`, {
      method: 'POST'
    });

    if (res.ok) {
      alert('Deployment started! Check logs for progress.');
    } else {
      alert('Failed to start deployment');
    }
  };

  return (
    <div className="app">
      <h1>🔥 FireLab</h1>

      <div className="section">
        <h2>Project Setup</h2>
        <input
          type="text"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="Project ID"
        />
        <button onClick={initProject}>Initialize Project</button>
        <button onClick={loadConfig}>Load Config</button>
        
        {existingProjects.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            <label>Or select existing project:</label>
            <select 
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{ marginLeft: '10px', padding: '8px' }}
            >
              <option value="">-- Select --</option>
              {existingProjects.map(proj => (
                <option key={proj} value={proj}>{proj}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="section">
        <h2>Emulator Controls</h2>
        <div className="status">
          Status: <span className={isRunning ? 'running' : 'stopped'}>
            {isRunning ? '🟢 Running' : '🔴 Stopped'}
          </span>
        </div>
        {hasExportData && !isRunning && (
          <div style={{ marginBottom: '10px' }}>
            <label>
              <input 
                type="checkbox" 
                checked={importOnStart} 
                onChange={(e) => setImportOnStart(e.target.checked)}
                style={{ marginRight: '5px' }}
              />
              Import previous data on start
            </label>
          </div>
        )}
        <button onClick={startEmulator} disabled={isRunning}>
          Start Emulator
        </button>
        <button onClick={stopEmulator} disabled={!isRunning}>
          Stop Emulator
        </button>
        <button onClick={exportData} disabled={!isRunning}>
          Export Data
        </button>
        {isRunning && (
          <a href={EMULATOR_HOST} target="_blank" rel="noopener noreferrer">
            <button>Open Emulator UI</button>
          </a>
        )}
      </div>

      {showConfig && config && (
        <div className="section">
          <h2>Configuration</h2>
          <div className="config-grid">
            {Object.entries(config.emulators).map(([service, settings]) => (
              service !== 'ui' && (
                <div key={service} className="config-item">
                  <label>{service.toUpperCase()}</label>
                  <input
                    type="number"
                    value={settings.port}
                    onChange={(e) => updatePort(service, e.target.value)}
                  />
                </div>
              )
            ))}
          </div>
          <button onClick={saveConfig}>Save Configuration</button>
          {availableRules.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <label>Edit Rules: </label>
              {availableRules.map(rule => (
                <button key={rule} onClick={() => loadRules(rule)}>
                  {rule.charAt(0).toUpperCase() + rule.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showRules && (
        <div className="section">
          <h2>Edit {rulesType.charAt(0).toUpperCase() + rulesType.slice(1)} Rules</h2>
          <div className="editor-container">
            <div className="line-numbers">
              {rulesContent.split('\n').map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              value={rulesContent}
              onChange={handleRulesChange}
              className={`rules-editor ${validationError ? 'rules-error' : 'rules-valid'}`}
              rows="15"
              onScroll={(e) => {
                const lineNumbers = e.target.previousSibling;
                lineNumbers.scrollTop = e.target.scrollTop;
              }}
            />
          </div>
          <div className="validation-status">
            {validationError ? (
              <span className="error-message">❌ {validationError}</span>
            ) : rulesContent ? (
              <span className="success-message">✅ Valid syntax</span>
            ) : null}
          </div>
          <div style={{ marginBottom: '10px', color: '#888', fontSize: '12px' }}>
            {rulesType === 'database' ? '⚠️ Must be valid JSON' : '⚠️ Must include rules_version and service declarations'}
          </div>
          <button onClick={saveRules}>Save Rules</button>
          <button onClick={deployRules} style={{ background: '#4caf50' }}>Deploy to Production</button>
          <button onClick={() => setShowRules(false)}>Close</button>
        </div>
      )}

      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Logs</h2>
          <div>
            <label style={{ marginRight: '15px' }}>
              <input 
                type="checkbox" 
                checked={autoScroll} 
                onChange={(e) => setAutoScroll(e.target.checked)}
                style={{ marginRight: '5px' }}
              />
              Auto-scroll
            </label>
            <button onClick={() => {
              setLogs([]);
              localStorage.removeItem('logs');
            }}>Clear Logs</button>
          </div>
        </div>
        <div className="logs">
          {logs.length === 0 ? (
            <div style={{ color: '#888', fontStyle: 'italic' }}>No logs yet. Start the emulator to see logs...</div>
          ) : (
            logs.map((log, i) => {
              const isError = log.toLowerCase().includes('error') || log.toLowerCase().includes('failed');
              const isWarning = log.toLowerCase().includes('warn');
              const isSuccess = log.toLowerCase().includes('emulator') && log.toLowerCase().includes('started');
              
              return (
                <div 
                  key={i} 
                  className={`log-line ${
                    isError ? 'log-error' : 
                    isWarning ? 'log-warning' : 
                    isSuccess ? 'log-success' : ''
                  }`}
                >
                  {log}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
