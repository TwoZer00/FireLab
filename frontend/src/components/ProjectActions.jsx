import { useState } from 'react';
import DangerZone from './DangerZone';
import { toProjectId } from '../utils/projectId';

const API_URL = import.meta.env.VITE_API_URL || '';

function ProjectActions({ projectId, getHeaders, onRenamed }) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');

  const handleRename = async () => {
    const sanitized = toProjectId(newName);
    if (!sanitized) { setNameError('Invalid name'); return; }
    if (sanitized === projectId) { setRenaming(false); return; }
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/rename`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ newName: sanitized })
      });
      const data = await res.json();
      if (res.ok) {
        setRenaming(false);
        onRenamed?.(sanitized);
      } else {
        setNameError(data.error);
      }
    } catch (err) {
      setNameError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!projectId || projectId === '') {
      alert('No project selected');
      return;
    }

    if (!confirm(`⚠️ Delete project '${projectId}'?\n\nThis will delete ALL data, snapshots, and configuration.\n\nThis cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (res.ok) {
        alert('✅ Project deleted!');
        window.location.reload();
      } else {
        alert('❌ Failed to delete project');
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  if (!projectId || projectId === '' || projectId === '__create_new__') {
    return null;
  }

  return (
    <div className="section">
      <h2>Project Actions</h2>

      {renaming ? (
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={newName}
            onChange={e => { setNewName(e.target.value); setNameError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleRename()}
            placeholder="New project name"
            style={{ width: '100%', marginRight: 0, marginBottom: 4, borderColor: nameError ? '#f85149' : '#30363d' }}
            autoFocus
          />
          {newName.trim() && (
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>
              ID: <code style={{ color: '#58a6ff' }}>{toProjectId(newName) || '—'}</code>
            </div>
          )}
          {nameError && <div style={{ color: '#f85149', fontSize: 12, marginBottom: 6 }}>{nameError}</div>}
          <button onClick={handleRename} disabled={!newName.trim()}>Rename</button>
          <button onClick={() => { setRenaming(false); setNewName(''); setNameError(''); }}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => { setNewName(projectId); setRenaming(true); }} style={{ marginBottom: 8 }}>
          ✏️ Rename Project
        </button>
      )}

      <DangerZone>
        <button 
          onClick={handleDelete}
          style={{ background: '#da3633', borderColor: '#f85149', width: '100%', fontSize: '11px' }}
        >
          🗑️ Delete Project
        </button>
      </DangerZone>
    </div>
  );
}

export default ProjectActions;
