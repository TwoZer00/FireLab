import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

function SnapshotsManager({ projectId, snapshots, onExport, onRestore, onDelete, isRunning, getHeaders }) {
  const [snapshotName, setSnapshotName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  const handleExport = () => {
    if (showNameInput) {
      onExport(snapshotName.trim() || null);
      setSnapshotName('');
      setShowNameInput(false);
    } else {
      setShowNameInput(true);
    }
  };

  const downloadSnapshot = async (snapshot) => {
    const res = await fetch(`${API_URL}/api/snapshots/${projectId}/${snapshot}/download`, { headers: getHeaders() });
    if (!res.ok) { alert('Failed to download snapshot'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="section">
      <h2>Snapshots</h2>
      
      {!isRunning && (
        <div style={{ color: '#8b949e', fontSize: '12px', marginBottom: '10px' }}>
          Start emulator to create snapshots
        </div>
      )}

      {showNameInput ? (
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            placeholder="Snapshot name (optional)"
            style={{ width: '100%', marginRight: 0, marginBottom: '8px' }}
            onKeyDown={(e) => e.key === 'Enter' && handleExport()}
            autoFocus
          />
          <button onClick={handleExport} disabled={!isRunning}>
            Create
          </button>
          <button onClick={() => { setShowNameInput(false); setSnapshotName(''); }}>
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={handleExport} disabled={!isRunning} style={{ marginBottom: '15px' }}>
          📸 Create Snapshot
        </button>
      )}

      {snapshots.length > 0 ? (
        <div>
          <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px' }}>
            {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} available
          </div>
          {snapshots.map(snapshot => (
            <div key={snapshot} className="snapshot-row">
              <span className="snapshot-name">{snapshot}</span>
              <div className="snapshot-actions">
                <button className="btn-icon" onClick={() => downloadSnapshot(snapshot)} title="Download as ZIP">⬇️</button>
                <button className="btn-icon" onClick={() => onRestore(snapshot)} title="Restore this snapshot">↻ Restore</button>
                <button className="btn-icon btn-danger" onClick={() => onDelete(snapshot)} title="Delete this snapshot">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: '#8b949e', fontSize: '12px', fontStyle: 'italic' }}>
          No snapshots yet. Create one to save emulator data.
        </div>
      )}
    </div>
  );
}

export default SnapshotsManager;
