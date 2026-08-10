import { useState } from 'react';

const ALL_SERVICES = ['auth', 'firestore', 'database', 'storage', 'hosting', 'ui'];
const SERVICE_LABELS = { auth: 'Authentication', firestore: 'Firestore', database: 'Realtime DB', storage: 'Storage', hosting: 'Hosting', ui: 'Emulator UI' };

function ConfigEditor({ config, availableRules, onUpdatePort, onUpdateHost, onSave, onLoadRules, onLoadIndexes, projectId, getHeaders, onServicesUpdated }) {
  const [showServices, setShowServices] = useState(false);
  const [pendingServices, setPendingServices] = useState({});
  const [saving, setSaving] = useState(false);

  if (!config?.emulators) return null;

  const currentHost = Object.values(config.emulators).find(s => s.host)?.host || '127.0.0.1';

  const openServices = () => {
    const current = {};
    ALL_SERVICES.forEach(s => { current[s] = !!config.emulators[s]; });
    setPendingServices(current);
    setShowServices(true);
  };

  const saveServices = async () => {
    setSaving(true);
    const API_URL = import.meta.env.VITE_API_URL || '';
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
    </div>
  );
}

export default ConfigEditor;
