import { useState } from 'react';

function ProjectSetup({ projectId, existingProjects, onSelectProject, onCreateProject }) {
  const [showNewInput, setShowNewInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleSelectChange = (value) => {
    if (value === '__create_new__') {
      setShowNewInput(true);
      setNewProjectName('');
    } else {
      setShowNewInput(false);
      onSelectProject(value);
    }
  };

  const handleCreate = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim());
      setShowNewInput(false);
      setNewProjectName('');
    }
  };

  return (
    <div className="section">
      <h2>Project</h2>
      
      {!showNewInput ? (
        <>
          <select 
            value={projectId}
            onChange={(e) => handleSelectChange(e.target.value)}
            style={{ width: '100%', marginRight: 0 }}
          >
            <option value="">-- Select Project --</option>
            {existingProjects.map(proj => (
              <option key={proj} value={proj}>{proj}</option>
            ))}
            <option value="__create_new__">+ Create New Project</option>
          </select>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#8b949e', lineHeight: '1.5' }}>
            💡 <strong>Import existing:</strong> Copy folder to <code style={{ background: '#0d1117', padding: '2px 6px', borderRadius: '3px', color: '#58a6ff' }}>firebase-projects/</code><br/>
            ☁️ <strong>Import from cloud:</strong> Requires <code style={{ background: '#0d1117', padding: '2px 6px', borderRadius: '3px', color: '#58a6ff' }}>firebase login</code> (not yet supported)
          </div>
        </>
      ) : (
        <div>
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Enter project name"
            style={{ width: '100%', marginRight: 0 }}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <button onClick={handleCreate}>Create</button>
          <button onClick={() => setShowNewInput(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default ProjectSetup;
