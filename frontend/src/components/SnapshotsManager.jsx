import { useState, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

function SnapshotsManager({ projectId, snapshots, onExport, onRestore, onDelete, onRefresh, isRunning, getHeaders }) {
  const [snapshotName, setSnapshotName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const snapshotName = file.name.replace(/\.zip$/i, '');
    setUploading(true);
    try {
      const headers = getHeaders();
      delete headers['Content-Type']; // let browser set it as octet-stream
      const res = await fetch(`${API_URL}/api/snapshots/${projectId}/upload`, {
        method: 'POST',
        headers: { ...headers, 'x-snapshot-name': snapshotName },
        body: file
      });
      if (res.ok) {
        onRefresh?.();
      } else {
        const data = await res.json();
        alert(`Upload failed: ${data.error}`);
      }
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
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

      <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
        {showNameInput ? (
          <>
            <input
              type="text"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              placeholder="Snapshot name (optional)"
              style={{ flex: 1, minWidth: 0 }}
              onKeyDown={(e) => e.key === 'Enter' && handleExport()}
              autoFocus
            />
            <button onClick={handleExport} disabled={!isRunning}>Create</button>
            <button onClick={() => { setShowNameInput(false); setSnapshotName(''); }}>Cancel</button>
          </>
        ) : (
          <>
            <button onClick={handleExport} disabled={!isRunning}>📸 Create Snapshot</button>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Upload snapshot ZIP">
              {uploading ? '⏳' : '📤 Upload'}
            </button>
            <input ref={fileInputRef} type="file" accept=".zip" style={{ display: 'none' }} onChange={handleUpload} />
          </>
        )}
      </div>

      {snapshots.length > 0 ? (
        <div>
          <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px' }}>
            {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} available
          </div>
          {snapshots.map(snapshot => (
            <div key={snapshot} className="snapshot-row">
              <span className="snapshot-name">
                {snapshot === 'pre-seed' ? '🔒 ' : ''}{snapshot}
              </span>
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
