import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';
const ALL_SERVICES = ['auth', 'firestore', 'database', 'storage', 'hosting', 'ui'];
const SERVICE_LABELS = { auth: 'Authentication', firestore: 'Firestore', database: 'Realtime DB', storage: 'Storage', hosting: 'Hosting', ui: 'Emulator UI' };

function EnvEditor({ projectId, getHeaders }) {
  const [vars, setVars] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || vars !== null) return;
    fetch(`${API_URL}/api/env/${projectId}`, { headers: getHeaders() })
      .then(r => r.json()).then(setVars).catch(() => setVars({}));
  }, [open, projectId, getHeaders, vars]);

  const setVar = (idx, field, value) => {
    setVars(prev => {
      const entries = Object.entries(prev);
      entries[idx] = field === 'key'
        ? [value, entries[idx][1]]
        : [entries[idx][0], value];
      return Object.fromEntries(entries);
    });
  };

  const addVar = () => setVars(prev => ({ ...prev, '': '' }));

  const removeVar = (key) => setVars(prev => {
    const next = { ...prev };
    delete next[key];
    return next;
  });

  const save = async () => {
    setSaving(true);
    await fetch(`${API_URL}/api/env/${projectId}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(vars)
    });
    setSaving(false);
  };

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={() => setOpen(v => !v)} className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}>
        {open ? '▼' : '▶'} 🔧 Environment Variables
      </button>
      {open && vars !== null && (
        <div style={{ marginTop: 8, background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: 10 }}>
          {Object.entries(vars).map(([k, v], idx) => (
            <div key={idx} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <input
                type="text"
                value={k}
                onChange={e => setVar(idx, 'key', e.target.value)}
                placeholder="KEY"
                style={{ flex: 1, margin: 0, fontFamily: 'monospace', fontSize: 12 }}
              />
              <input
                type="text"
                value={v}
                onChange={e => setVar(idx, 'value', e.target.value)}
                placeholder="value"
                style={{ flex: 2, margin: 0, fontSize: 12 }}
              />
              <button onClick={() => removeVar(k)} className="btn-danger btn-icon" style={{ margin: 0, flexShrink: 0 }}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button onClick={addVar} className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px', margin: 0 }}>+ Add</button>
            <button onClick={save} disabled={saving} style={{ fontSize: 11, padding: '3px 8px', margin: 0 }}>
              {saving ? 'Saving...' : '💾 Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigEditor({ config, availableRules, onUpdatePort, onUpdateHost, onSave, onLoadRules, onLoadIndexes, onLoadDataViewer, projectId, getHeaders, onServicesUpdated }) {
  const [showServices, setShowServices] = useState(false);
  const [pendingServices, setPendingServices] = useState({});
  const [saving, setSaving] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [firebaseProjects, setFirebaseProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedFirebaseId, setSelectedFirebaseId] = useState('');
  const [linkSaving, setLinkSaving] = useState(false);

  if (!config?.emulators) return null;

  const currentHost = Object.values(config.emulators).find(s => s.host)?.host || '127.0.0.1';

  const openLink = async () => {
    setSelectedFirebaseId(config.firebaseProjectId || '');
    setShowLink(true);
    setLoadingProjects(true);
    try {
      const res = await fetch(`${API_URL}/api/firebase-projects`, { headers: getHeaders() });
      if (res.ok) setFirebaseProjects(await res.json());
      else setFirebaseProjects([]);
    } catch {
      setFirebaseProjects([]);
    }
    setLoadingProjects(false);
  };

  const saveLink = async () => {
    setLinkSaving(true);
    const res = await fetch(`${API_URL}/api/link/${projectId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ firebaseProjectId: selectedFirebaseId })
    });
    setLinkSaving(false);
    if (res.ok) {
      onServicesUpdated({ ...config, firebaseProjectId: selectedFirebaseId || undefined });
      setShowLink(false);
    } else {
      alert('Failed to save link');
    }
  };

  const openServices = () => {
    const current = {};
    ALL_SERVICES.forEach(s => { current[s] = !!config.emulators[s]; });
    setPendingServices(current);
    setShowServices(true);
  };

  const saveServices = async () => {
    setSaving(true);
    const res = await fetch(`${API_URL}/api/services/${projectId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ services: pendingServices })
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      onServicesUpdated(data.config);
      setShowServices(false);
    } else {
      alert('Failed to update services');
    }
  };

  return (
    <div className="section">
      <h2>Configuration</h2>
      <div className="config-item" style={{ marginBottom: '10px' }}>
        <label>Host</label>
        <select value={currentHost} onChange={(e) => onUpdateHost(e.target.value)}>
          <option value="0.0.0.0">0.0.0.0 (accessible externally)</option>
          <option value="127.0.0.1">127.0.0.1 (localhost only)</option>
        </select>
      </div>
      <div className="config-grid">
        {Object.entries(config.emulators).map(([service, settings]) => (
          service !== 'ui' && (
            <div key={service} className="config-item">
              <label>{service.toUpperCase()}</label>
              <input
                type="number"
                value={settings.port}
                onChange={(e) => onUpdatePort(service, e.target.value)}
              />
            </div>
          )
        ))}
      </div>
      <button onClick={onSave}>Save Configuration</button>
      <button onClick={openLink} style={{ marginLeft: '8px' }}>
        {config.firebaseProjectId ? `🔗 ${config.firebaseProjectId}` : '🔗 Link Firebase Project'}
      </button>

      {showLink && (
        <div style={{ marginTop: '12px', padding: '12px', background: '#161b22', borderRadius: '6px', border: '1px solid #30363d' }}>
          <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px' }}>Select Firebase project to link:</div>
          {loadingProjects ? (
            <div style={{ fontSize: '12px', color: '#8b949e' }}>Loading projects...</div>
          ) : firebaseProjects.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#f85149' }}>No projects found. Make sure you're logged in to Firebase.</div>
          ) : (
            <select
              value={selectedFirebaseId}
              onChange={(e) => setSelectedFirebaseId(e.target.value)}
              style={{ width: '100%', marginBottom: '10px' }}
            >
              <option value="">-- None (local only) --</option>
              {firebaseProjects.map(p => (
                <option key={p.projectId} value={p.projectId}>
                  {p.displayName ? `${p.displayName} (${p.projectId})` : p.projectId}
                </option>
              ))}
            </select>
          )}
          <button onClick={saveLink} disabled={linkSaving || loadingProjects}>{linkSaving ? 'Saving...' : 'Save'}</button>
          <button onClick={() => setShowLink(false)} style={{ marginLeft: '8px' }}>Cancel</button>
        </div>
      )}

      <button onClick={openServices} style={{ marginLeft: '8px' }}>⚙️ Manage Services</button>

      {showServices && (
        <div style={{ marginTop: '12px', padding: '12px', background: '#161b22', borderRadius: '6px', border: '1px solid #30363d' }}>
          <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px' }}>Enable / disable services:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            {ALL_SERVICES.map(svc => (
              <label key={svc} style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={!!pendingServices[svc]}
                  onChange={() => setPendingServices(prev => ({ ...prev, [svc]: !prev[svc] }))}
                  style={{ marginRight: '5px' }}
                />
                {SERVICE_LABELS[svc]}
              </label>
            ))}
          </div>
          <button onClick={saveServices} disabled={saving}>{saving ? 'Saving...' : 'Apply'}</button>
          <button onClick={() => setShowServices(false)} style={{ marginLeft: '8px' }}>Cancel</button>
        </div>
      )}

      {availableRules.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <label>Edit Rules: </label>
          {availableRules.map(rule => (
            <button key={rule} onClick={() => onLoadRules(rule)}>
              {rule.charAt(0).toUpperCase() + rule.slice(1)}
            </button>
          ))}
        </div>
      )}
      {config.emulators?.firestore && (
        <div style={{ marginTop: '10px' }}>
          <label>Indexes: </label>
          <button onClick={onLoadIndexes}>📇 Firestore Indexes</button>
        </div>
      )}
      {(config.emulators?.firestore || config.emulators?.auth || config.emulators?.database) && (
        <div style={{ marginTop: '10px' }}>
          <button onClick={onLoadDataViewer}>🗄️ Data Viewer</button>
        </div>
      )}

      <EnvEditor projectId={projectId} getHeaders={getHeaders} />
    </div>
  );
}

export default ConfigEditor;
