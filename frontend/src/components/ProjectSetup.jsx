import { useState } from 'react';

function ProjectSetup({ projectId, existingProjects, onSelectProject, onCreateProject }) {
  const [showNewInput, setShowNewInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [nameError, setNameError] = useState('');
  const [selectedServices, setSelectedServices] = useState({
    auth: false,
    firestore: false,
    database: false,
    storage: false,
    hosting: false,
    ui: false
  });

  const handleSelectChange = (value) => {
    if (value === '__create_new__') {
      setShowNewInput(true);
      setNewProjectName('');
      // Reset to minimal defaults when creating new
      setSelectedServices({
        auth: false,
        firestore: false,
        database: false,
        storage: false,
        hosting: false,
        ui: false
      });
    } else {
      setShowNewInput(false);
      onSelectProject(value);
    }
  };

  const handleCreate = () => {
    if (!newProjectName.trim()) {
      setNameError('Project name is required');
      return;
    }
    
    setNameError('');
    onCreateProject(newProjectName.trim(), selectedServices);
    setShowNewInput(false);
    setNewProjectName('');
    setSelectedServices({
      auth: false,
      firestore: false,
      database: false,
      storage: false,
      hosting: false,
      ui: false
    });
  };

  const toggleService = (service) => {
    setSelectedServices(prev => ({ ...prev, [service]: !prev[service] }));
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
            onChange={(e) => { setNewProjectName(e.target.value); setNameError(''); }}
            placeholder="Enter project name"
            style={{ 
              width: '100%', 
              marginRight: 0, 
              marginBottom: nameError ? '5px' : '10px',
              borderColor: nameError ? '#f85149' : '#30363d'
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          {nameError && (
            <div style={{ color: '#f85149', fontSize: '12px', marginBottom: '10px' }}>
              {nameError}
            </div>
          )}
          
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px' }}>Select services to enable:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                <input type="checkbox" checked={selectedServices.auth} onChange={() => toggleService('auth')} style={{ marginRight: '5px' }} />
                Authentication
              </label>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                <input type="checkbox" checked={selectedServices.firestore} onChange={() => toggleService('firestore')} style={{ marginRight: '5px' }} />
                Firestore
              </label>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                <input type="checkbox" checked={selectedServices.database} onChange={() => toggleService('database')} style={{ marginRight: '5px' }} />
                Realtime DB
              </label>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                <input type="checkbox" checked={selectedServices.storage} onChange={() => toggleService('storage')} style={{ marginRight: '5px' }} />
                Storage
              </label>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                <input type="checkbox" checked={selectedServices.hosting} onChange={() => toggleService('hosting')} style={{ marginRight: '5px' }} />
                Hosting
              </label>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                <input type="checkbox" checked={selectedServices.ui} onChange={() => toggleService('ui')} style={{ marginRight: '5px' }} />
                Emulator UI
              </label>
            </div>
          </div>
          
          <button onClick={handleCreate}>Create</button>
          <button onClick={() => setShowNewInput(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default ProjectSetup;
