import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

function JsonTree({ data, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(depth > 1);
  if (data === null) return <span style={{ color: '#8b949e' }}>null</span>;
  if (typeof data !== 'object') {
    const color = typeof data === 'string' ? '#a5d6ff' : typeof data === 'boolean' ? '#ff7b72' : '#79c0ff';
    return <span style={{ color }}>{JSON.stringify(data)}</span>;
  }
  const entries = Object.entries(data);
  if (entries.length === 0) return <span style={{ color: '#8b949e' }}>{Array.isArray(data) ? '[]' : '{}'}</span>;
  return (
    <span>
      <span style={{ cursor: 'pointer', color: '#e3b341' }} onClick={() => setCollapsed(v => !v)}>
        {collapsed ? '▶' : '▼'} {Array.isArray(data) ? `[${entries.length}]` : `{${entries.length}}`}
      </span>
      {!collapsed && (
        <div style={{ paddingLeft: 16 }}>
          {entries.map(([k, v]) => (
            <div key={k}>
              <span style={{ color: '#79c0ff' }}>{k}</span>
              <span style={{ color: '#8b949e' }}>: </span>
              <JsonTree data={v} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

function FirestoreTab({ projectId, getHeaders, config }) {
  const [collections, setCollections] = useState(null);
  const [selectedCol, setSelectedCol] = useState(null);
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/api/data/${projectId}/firestore`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Extract collection IDs from document paths or collectionIds field
      const cols = data.collectionIds || (data.documents || []).map(d => d.name?.split('/')[6]).filter(Boolean);
      setCollections([...new Set(cols)]);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [projectId, getHeaders]);

  const loadCollection = useCallback(async (col) => {
    setSelectedCol(col); setDocs(null); setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/api/data/${projectId}/firestore?collection=${col}`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocs(data.documents || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [projectId, getHeaders]);

  const parseDoc = (doc) => {
    const fields = doc.fields || {};
    const parsed = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v.stringValue !== undefined) parsed[k] = v.stringValue;
      else if (v.integerValue !== undefined) parsed[k] = Number(v.integerValue);
      else if (v.doubleValue !== undefined) parsed[k] = v.doubleValue;
      else if (v.booleanValue !== undefined) parsed[k] = v.booleanValue;
      else if (v.nullValue !== undefined) parsed[k] = null;
      else if (v.timestampValue !== undefined) parsed[k] = v.timestampValue;
      else if (v.mapValue !== undefined) parsed[k] = '{ ... }';
      else if (v.arrayValue !== undefined) parsed[k] = `[ ${(v.arrayValue.values || []).length} items ]`;
      else parsed[k] = v;
    }
    return parsed;
  };

  if (!collections) return (
    <div>
      {error && <div style={{ color: '#f85149', marginBottom: 8, fontSize: 12 }}>{error}</div>}
      <button onClick={load} disabled={loading}>{loading ? '⏳ Loading...' : '🔍 Load Collections'}</button>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%' }}>
      <div style={{ width: 160, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6 }}>COLLECTIONS ({collections.length})</div>
        {collections.length === 0 && <div style={{ fontSize: 12, color: '#8b949e', fontStyle: 'italic' }}>No collections</div>}
        {collections.map(col => (
          <div
            key={col}
            onClick={() => loadCollection(col)}
            style={{
              padding: '5px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
              background: selectedCol === col ? '#1f6feb' : 'transparent',
              color: selectedCol === col ? '#fff' : '#c9d1d9',
              marginBottom: 2
            }}
          >
            📁 {col}
          </div>
        ))}
        <button onClick={load} style={{ marginTop: 8, fontSize: 11, padding: '3px 8px' }}>↻ Refresh</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading && <div style={{ color: '#8b949e', fontSize: 12 }}>⏳ Loading...</div>}
        {error && <div style={{ color: '#f85149', fontSize: 12 }}>{error}</div>}
        {docs && !loading && (
          <>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 8 }}>{docs.length} document{docs.length !== 1 ? 's' : ''}</div>
            {docs.length === 0 && <div style={{ fontSize: 12, color: '#8b949e', fontStyle: 'italic' }}>No documents</div>}
            {docs.map(doc => {
              const id = doc.name?.split('/').pop();
              return (
                <div key={doc.name} style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: '#79c0ff', marginBottom: 6, fontFamily: 'monospace' }}>/{selectedCol}/{id}</div>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', lineHeight: 1.6 }}>
                    <JsonTree data={parseDoc(doc)} />
                  </div>
                </div>
              );
            })}
          </>
        )}
        {!docs && !loading && selectedCol && <div style={{ fontSize: 12, color: '#8b949e' }}>Select a collection</div>}
      </div>
    </div>
  );
}

function AuthTab({ projectId, getHeaders }) {
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/api/data/${projectId}/auth`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.userInfo || data.users || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [projectId, getHeaders]);

  if (!users) return (
    <div>
      {error && <div style={{ color: '#f85149', marginBottom: 8, fontSize: 12 }}>{error}</div>}
      <button onClick={load} disabled={loading}>{loading ? '⏳ Loading...' : '🔍 Load Users'}</button>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: '#8b949e' }}>{users.length} user{users.length !== 1 ? 's' : ''}</div>
        <button onClick={load} style={{ fontSize: 11, padding: '3px 8px' }}>↻ Refresh</button>
      </div>
      {users.length === 0 && <div style={{ fontSize: 12, color: '#8b949e', fontStyle: 'italic' }}>No users</div>}
      {users.map(u => (
        <div key={u.localId} style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: 10, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
            <span style={{ color: '#79c0ff', fontFamily: 'monospace' }}>{u.localId}</span>
            {u.email && <span style={{ color: '#a5d6ff' }}>{u.email}</span>}
            {u.displayName && <span style={{ color: '#c9d1d9' }}>{u.displayName}</span>}
            {u.disabled && <span style={{ color: '#f85149' }}>disabled</span>}
            {u.emailVerified && <span style={{ color: '#3fb950' }}>✓ verified</span>}
          </div>
          {u.providerUserInfo?.length > 0 && (
            <div style={{ fontSize: 11, color: '#8b949e', marginTop: 4 }}>
              providers: {u.providerUserInfo.map(p => p.providerId).join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DatabaseTab({ projectId, getHeaders }) {
  const [dbPath, setDbPath] = useState('/');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/api/data/${projectId}/database?path=${encodeURIComponent(dbPath)}`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [projectId, getHeaders, dbPath]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={dbPath}
          onChange={e => setDbPath(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="/"
          style={{ flex: 1, margin: 0 }}
        />
        <button onClick={load} disabled={loading} style={{ margin: 0 }}>{loading ? '⏳' : '🔍 Load'}</button>
      </div>
      {error && <div style={{ color: '#f85149', fontSize: 12, marginBottom: 8 }}>{error}</div>}
      {result !== null && result !== undefined && (
        <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: 12, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}>
          <JsonTree data={result} />
        </div>
      )}
      {result === null && !loading && !error && (
        <div style={{ fontSize: 12, color: '#8b949e', fontStyle: 'italic' }}>No data at this path</div>
      )}
    </div>
  );
}

function DataViewer({ projectId, config, getHeaders, onClose }) {
  const services = config?.emulators || {};
  const tabs = [
    services.firestore && 'firestore',
    services.auth && 'auth',
    services.database && 'database',
  ].filter(Boolean);

  const [activeTab, setActiveTab] = useState(tabs[0] || 'firestore');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#161b22', border: '1px solid #30363d', borderRadius: 6, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>🗄️ Data Viewer</h2>
        <button onClick={onClose} className="btn-secondary" style={{ margin: 0, padding: '4px 10px', fontSize: 12 }}>✕ Close</button>
      </div>

      {tabs.length === 0 && (
        <div style={{ color: '#8b949e', fontSize: 13 }}>No data services configured (Firestore, Auth, or Database).</div>
      )}

      {tabs.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #30363d', paddingBottom: 8 }}>
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  margin: 0, padding: '5px 14px', fontSize: 12,
                  background: activeTab === tab ? '#1f6feb' : '#21262d',
                  borderColor: activeTab === tab ? '#388bfd' : '#30363d'
                }}
              >
                {tab === 'firestore' ? '🔥 Firestore' : tab === 'auth' ? '👤 Auth' : '🗃️ Database'}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {activeTab === 'firestore' && <FirestoreTab projectId={projectId} getHeaders={getHeaders} config={config} />}
            {activeTab === 'auth' && <AuthTab projectId={projectId} getHeaders={getHeaders} />}
            {activeTab === 'database' && <DatabaseTab projectId={projectId} getHeaders={getHeaders} />}
          </div>
        </>
      )}
    </div>
  );
}

export default DataViewer;
