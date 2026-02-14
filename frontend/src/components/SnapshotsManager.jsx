import { useState } from 'react';

function SnapshotsManager({ projectId, snapshots, onExport, onRestore, onDelete, isRunning }) {
  const [snapshotName, setSnapshotName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  const handleExport = () => {
    if (showNameInput && snapshotName.trim()) {
      onExport(snapshotName.trim());
      setSnapshotName('');
      setShowNameInput(false);
    } else if (!showNameInput) {
      setShowNameInput(true);
    }
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
            onKeyPress={(e) => e.key === 'Enter' && handleExport()}
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
            <div 
              key={snapshot} 
              style={{ 
                background: '#0d1117', 
                padding: '10px', 
                marginBottom: '8px', 
                borderRadius: '6px',
                border: '1px solid #30363d',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: '13px', fontFamily: 'monospace' }}>{snapshot}</span>
              <div>
                <button 
                  onClick={() => onRestore(snapshot)}
                  style={{ padding: '4px 8px', fontSize: '11px', marginRight: '4px' }}
                  title="Restore this snapshot"
                >
                  ↻ Restore
                </button>
                <button 
                  onClick={() => onDelete(snapshot)}
                  style={{ 
                    padding: '4px 8px', 
                    fontSize: '11px', 
                    background: '#da3633',
                    borderColor: '#f85149'
                  }}
                  title="Delete this snapshot"
                >
                  🗑️
                </button>
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
