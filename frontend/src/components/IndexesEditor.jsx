import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

function IndexesEditor({ projectId, getHeaders, onClose, firebaseLoggedIn }) {
  const [content, setContent] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [fetching, setFetching] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || '';

  const validate = () => {
    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed.indexes) && !Array.isArray(parsed.fieldOverrides)) {
        setValidationError('Must contain "indexes" or "fieldOverrides" array');
        return false;
      }
      setValidationError(null);
      return true;
    } catch (e) {
      setValidationError(e.message);
      return false;
    }
  };

  const loadIndexes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/indexes/${projectId}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setContent(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error('Failed to load indexes:', err);
    }
  };

  useEffect(() => {
    loadIndexes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (content) {
      const timer = setTimeout(() => validate(), 500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const handleSave = async () => {
    if (!validate()) {
      alert(`Validation Error: ${validationError}`);
      return;
    }
    const res = await fetch(`${API_URL}/api/indexes/${projectId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ indexes: content })
    });
    if (res.ok) alert('Indexes saved!');
    else alert('Failed to save indexes');
  };

  const handleDeploy = async () => {
    if (!validate()) {
      alert(`Validation Error: ${validationError}`);
      return;
    }
    if (!confirm('Deploy Firestore indexes to production?')) return;
    await handleSave();
    const res = await fetch(`${API_URL}/api/deploy-indexes/${projectId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (res.ok) alert('Index deployment started! Check logs for progress.');
    else alert('Failed to start deployment');
  };

  return (
    <div className="section" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <h2>Firestore Indexes</h2>
      <p style={{ fontSize: '12px', color: '#8b949e', margin: '0 0 10px', flexShrink: 0 }}>
        Define composite indexes and field overrides. The emulator logs warnings when queries need indexes.
      </p>

      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', flexShrink: 0 }}>
        <button
          onClick={async () => {
            if (!confirm('Fetch production indexes? This will replace your current editor content.')) return;
            setFetching(true);
            try {
              const res = await fetch(`${API_URL}/api/fetch-indexes/${projectId}`, { headers: getHeaders() });
              if (res.ok) {
                const data = await res.json();
                setContent(typeof data.indexes === 'string' ? data.indexes : JSON.stringify(data.indexes, null, 2));
              } else {
                alert('Failed to fetch indexes. Make sure you are logged into Firebase.');
              }
            } catch (err) {
              alert('Failed to fetch indexes: ' + err.message);
            }
            setFetching(false);
          }}
          disabled={!firebaseLoggedIn || fetching}
          style={{ padding: '4px 8px', fontSize: '12px', background: firebaseLoggedIn ? '#1f6feb' : '#21262d' }}
          title={!firebaseLoggedIn ? 'Firebase login required' : 'Fetch deployed indexes from production'}
        >
          {fetching ? '⏳ Fetching...' : '⬇️ Fetch from Firebase'} {!firebaseLoggedIn && '🔒'}
        </button>
      </div>

      <div style={{ border: '1px solid #30363d', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px', flex: 1 }}>
        <Editor
          height="100%"
          language="json"
          theme="vs-dark"
          value={content}
          onChange={(value) => setContent(value || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on'
          }}
        />
      </div>

      <div className="validation-status" style={{ flexShrink: 0 }}>
        {validationError ? (
          <span className="error-message">❌ {validationError}</span>
        ) : content ? (
          <span className="success-message">✅ Valid JSON</span>
        ) : null}
      </div>

      <div style={{ flexShrink: 0 }}>
        <button onClick={handleSave}>Save Indexes</button>
        <button
          onClick={handleDeploy}
          style={{ background: firebaseLoggedIn ? '#4caf50' : '#21262d' }}
          disabled={!firebaseLoggedIn}
          title={!firebaseLoggedIn ? 'Firebase login required. Run: firebase login' : 'Deploy to production'}
        >
          Deploy to Production {!firebaseLoggedIn && '🔒'}
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default IndexesEditor;
