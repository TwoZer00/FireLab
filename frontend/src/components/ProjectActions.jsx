import DangerZone from './DangerZone';

const API_URL = import.meta.env.VITE_API_URL || '';

function ProjectActions({ projectId, getHeaders }) {
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
