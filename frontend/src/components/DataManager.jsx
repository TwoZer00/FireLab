import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function DataManager({ projectId, isRunning, onRefreshSnapshots }) {
  const [showSeedEditor, setShowSeedEditor] = useState(false);
  const [seedScript, setSeedScript] = useState(`// Example seed script
// Use Firebase Admin SDK or REST API to populate data

const admin = require('firebase-admin');
admin.initializeApp({ projectId: '${projectId}' });

const db = admin.firestore();

async function seed() {
  // Add test users
  await db.collection('users').doc('user1').set({
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date()
  });
  
  console.log('Seed completed!');
}

seed().catch(console.error);
`);

  const clearAllData = async () => {
    if (!confirm('⚠️ Clear ALL emulator data?\\n\\nThis will delete all data from Firestore, Auth, Storage, etc.\\n\\nThis cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/emulator/clear/${projectId}`, {
        method: 'POST'
      });

      if (res.ok) {
        alert('✅ All data cleared!');
        onRefreshSnapshots();
      } else {
        alert('❌ Failed to clear data');
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  const runSeedScript = async () => {
    if (!isRunning) {
      alert('⚠️ Emulator must be running to seed data');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/seed/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: seedScript })
      });

      if (res.ok) {
        alert('✅ Seed script started! Check logs for output.');
        setShowSeedEditor(false);
      } else {
        alert('❌ Failed to run seed script');
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  const downloadSnapshot = (snapshotName) => {
    window.open(`${API_URL}/api/snapshots/${projectId}/${snapshotName}/download`, '_blank');
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
          onClick={() => setShowSeedEditor(!showSeedEditor)}
          disabled={!isRunning}
          title={!isRunning ? 'Start emulator first' : 'Run seed script'}
        >
          🌱 {showSeedEditor ? 'Hide' : 'Seed Data'}
        </button>
      </div>

      {showSeedEditor && (
        <div style={{ marginTop: '15px' }}>
          <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px' }}>
            Write a Node.js script to populate test data. Use Firebase Admin SDK or REST API.
          </div>
          <textarea
            value={seedScript}
            onChange={(e) => setSeedScript(e.target.value)}
            style={{
              width: '100%',
              height: '300px',
              fontFamily: 'monospace',
              fontSize: '12px',
              background: '#0d1117',
              color: '#c9d1d9',
              border: '1px solid #30363d',
              borderRadius: '6px',
              padding: '10px',
              marginBottom: '10px'
            }}
          />
          <button onClick={runSeedScript}>▶️ Run Seed Script</button>
          <button onClick={() => setShowSeedEditor(false)}>Cancel</button>
        </div>
      )}

      <div style={{ fontSize: '11px', color: '#6e7681', marginTop: '10px' }}>
        💡 Tip: Create snapshot after seeding to save test data
      </div>
    </div>
  );
}

export default DataManager;
