import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

const TEMPLATES = {
  firestore: (projectId) => `// Firestore seed
const admin = require('firebase-admin');
admin.initializeApp({ projectId: '${projectId}' });
const db = admin.firestore();

async function seed() {
  await db.collection('users').doc('user1').set({
    name: 'Alice',
    email: 'alice@example.com',
    role: 'admin',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log('Firestore seed completed!');
}
seed().catch(console.error);
`,
  auth: (projectId) => `// Auth seed
const admin = require('firebase-admin');
admin.initializeApp({ projectId: '${projectId}' });

async function seed() {
  await admin.auth().createUser({
    uid: 'user1',
    email: 'alice@example.com',
    password: 'password123',
    displayName: 'Alice'
  });
  console.log('Auth seed completed!');
}
seed().catch(console.error);
`,
  storage: (projectId) => `// Storage seed
const admin = require('firebase-admin');
admin.initializeApp({ projectId: '${projectId}' });
const bucket = admin.storage().bucket('${projectId}.appspot.com');

async function seed() {
  await bucket.file('hello.txt').save('Hello from FireLab!', {
    metadata: { contentType: 'text/plain' }
  });
  console.log('Storage seed completed!');
}
seed().catch(console.error);
`,
  database: (projectId) => `// Realtime Database seed
const admin = require('firebase-admin');
admin.initializeApp({
  projectId: '${projectId}',
  databaseURL: 'http://localhost:9000/?ns=${projectId}'
});

async function seed() {
  await admin.database().ref('users/user1').set({ name: 'Alice', online: false });
  console.log('Database seed completed!');
}
seed().catch(console.error);
`,
  full: (projectId) => `// Full seed — Firestore + Auth + Storage + Database
const admin = require('firebase-admin');
admin.initializeApp({
  projectId: '${projectId}',
  databaseURL: 'http://localhost:9000/?ns=${projectId}'
});

async function seed() {
  await admin.auth().createUser({ uid: 'user1', email: 'alice@example.com', password: 'password123' });
  await admin.firestore().collection('users').doc('user1').set({ name: 'Alice', email: 'alice@example.com' });
  await admin.database().ref('users/user1').set({ name: 'Alice', online: false });
  await admin.storage().bucket('${projectId}.appspot.com').file('welcome.txt').save('Welcome!', { metadata: { contentType: 'text/plain' } });
  console.log('Full seed completed!');
}
seed().catch(console.error);
`
};

const TEMPLATE_LABELS = {
  firestore: '🔥 Firestore',
  auth: '🔐 Auth',
  storage: '🗄️ Storage',
  database: '📡 Database',
  full: '⚡ Full Example'
};

function DataManager({ projectId, isRunning, onRefreshSnapshots, onRestore, getHeaders }) {
  const [showSeedEditor, setShowSeedEditor] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('firestore');
  const [seedScript, setSeedScript] = useState('');
  const [packages, setPackages] = useState([]);
  const [showPackages, setShowPackages] = useState(false);
  const [hasPreSeed, setHasPreSeed] = useState(false);

  const fetchPackages = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/seed/${projectId}/packages`, { headers: getHeaders() });
      if (res.ok) setPackages(await res.json());
    } catch { /* non-fatal */ }
  }, [projectId, getHeaders]);

  const checkPreSeed = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/snapshots/${projectId}`, { headers: getHeaders() });
      if (res.ok) {
        const list = await res.json();
        setHasPreSeed(list.includes('pre-seed'));
      }
    } catch { /* non-fatal */ }
  }, [projectId, getHeaders]);

  useEffect(() => { checkPreSeed(); }, [checkPreSeed]);

  useEffect(() => {
    if (showPackages) fetchPackages();
  }, [showPackages, fetchPackages]);

  const openEditor = () => {
    setSeedScript(TEMPLATES.firestore(projectId));
    setSelectedTemplate('firestore');
    setShowSeedEditor(true);
  };

  const applyTemplate = (key) => {
    setSelectedTemplate(key);
    setSeedScript(TEMPLATES[key](projectId));
  };

  const clearAllData = async () => {
    if (!confirm('⚠️ Clear ALL emulator data?\n\nThis will delete all data from Firestore, Auth, Storage, etc.\n\nThis cannot be undone.')) return;
    try {
      const res = await fetch(`${API_URL}/api/emulator/clear/${projectId}`, { method: 'POST', headers: getHeaders() });
      if (res.ok) { alert('✅ All data cleared!'); onRefreshSnapshots(); }
      else alert('❌ Failed to clear data');
    } catch (error) { alert('❌ Error: ' + error.message); }
  };

  const runSeedScript = async () => {
    if (!isRunning) { alert('⚠️ Emulator must be running to seed data'); return; }
    try {
      const res = await fetch(`${API_URL}/api/seed/${projectId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ script: seedScript })
      });
      if (res.ok) {
        alert('✅ Seed script started! Check logs for output.');
        setShowSeedEditor(false);
        // Refresh packages panel if open
        if (showPackages) setTimeout(fetchPackages, 3000);
        setTimeout(checkPreSeed, 4000);
      } else {
        const data = await res.json();
        alert('❌ Failed to run seed script: ' + (data.error || 'Unknown error'));
      }
    } catch (error) { alert('❌ Error: ' + error.message); }
  };

  const deletePackage = async (pkg) => {
    try {
      const res = await fetch(`${API_URL}/api/seed/${projectId}/packages/${encodeURIComponent(pkg)}`, {
        method: 'DELETE', headers: getHeaders()
      });
      if (res.ok) fetchPackages();
      else alert('❌ Failed to delete package');
    } catch (error) { alert('❌ Error: ' + error.message); }
  };

  const clearPackages = async () => {
    if (!confirm('Clear all cached seed packages?\n\nThey will be re-downloaded on next use.')) return;
    try {
      const res = await fetch(`${API_URL}/api/seed/${projectId}/packages`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) { setPackages([]); alert('✅ Package cache cleared'); }
      else alert('❌ Failed to clear packages');
    } catch (error) { alert('❌ Error: ' + error.message); }
  };

  return (
    <div className="section">
      <h2>Data Management</h2>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
        <button
          onClick={clearAllData}
          disabled={isRunning}
          style={{ background: '#da3633', borderColor: '#f85149' }}
          title={isRunning ? 'Stop emulator first' : 'Clear all emulator data'}
        >
          🗑️ Clear All Data
        </button>

        <button
          onClick={showSeedEditor ? () => setShowSeedEditor(false) : openEditor}
          disabled={!isRunning}
          title={!isRunning ? 'Start emulator first' : 'Run seed script'}
        >
          🌱 {showSeedEditor ? 'Hide' : 'Seed Data'}
        </button>

        {hasPreSeed && (
          <button
            onClick={() => onRestore('pre-seed')}
            style={{ background: '#1f6feb', borderColor: '#388bfd' }}
            title="Stop emulator, restore pre-seed snapshot and restart">
            ↩️ Reset to Pre-seed
          </button>
        )}

        <button
          onClick={() => setShowPackages(v => !v)}
          style={{ background: '#21262d', borderColor: '#30363d', fontSize: '12px' }}
          title="Manage cached seed packages"
        >
          📦 {showPackages ? 'Hide Packages' : 'Packages'}
        </button>
      </div>

      {showPackages && (
        <div style={{ marginBottom: '15px', padding: '10px', background: '#161b22', border: '1px solid #30363d', borderRadius: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#8b949e' }}>
              Cached seed packages — installed once, reused on every run
            </span>
            {packages.length > 0 && (
              <button onClick={clearPackages} style={{ fontSize: '11px', padding: '3px 8px', background: '#da3633', borderColor: '#f85149' }}>
                🗑️ Clear All
              </button>
            )}
          </div>
          {packages.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#6e7681' }}>No packages installed yet. They appear here after your first seed run.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {packages.map(pkg => (
                <span key={pkg} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#21262d', border: '1px solid #30363d', borderRadius: '4px', padding: '2px 8px', fontSize: '12px' }}>
                  {pkg}
                  <button
                    onClick={() => deletePackage(pkg)}
                    style={{ background: 'none', border: 'none', color: '#6e7681', cursor: 'pointer', padding: '0 2px', fontSize: '12px', lineHeight: 1 }}
                    title={`Remove ${pkg}`}
                  >×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {showSeedEditor && (
        <div style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => applyTemplate(key)}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  background: selectedTemplate === key ? '#1f6feb' : '#21262d',
                  borderColor: selectedTemplate === key ? '#1f6feb' : '#30363d',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px' }}>
            Uses <code>require('firebase-admin')</code> — emulator hosts pre-configured. Any other <code>require()</code> is auto-installed on first run and cached.
          </div>

          <textarea
            value={seedScript}
            onChange={(e) => setSeedScript(e.target.value)}
            style={{
              width: '100%',
              height: '320px',
              fontFamily: 'monospace',
              fontSize: '12px',
              background: '#0d1117',
              color: '#c9d1d9',
              border: '1px solid #30363d',
              borderRadius: '6px',
              padding: '10px',
              marginBottom: '10px',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={runSeedScript}>▶️ Run Seed Script</button>
            <button onClick={() => setShowSeedEditor(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ fontSize: '11px', color: '#6e7681', marginTop: '10px' }}>
        💡 Tip: Create a snapshot after seeding to save your test data
      </div>
    </div>
  );
}

export default DataManager;
