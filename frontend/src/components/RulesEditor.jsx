import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

function RulesEditor({ 
  rulesType, 
  rulesContent, 
  setRulesContent,
  onSave, 
  onDeploy, 
  onClose,
  firebaseLoggedIn,
  projectId,
  getHeaders
}) {
  const [validationError, setValidationError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showTester, setShowTester] = useState(false);
  const [testPath, setTestPath] = useState('');
  const [testOperation, setTestOperation] = useState('read');
  const [testAuth, setTestAuth] = useState('');
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadHistory();
  }, [projectId, rulesType]);

  const loadHistory = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/rules-history/${projectId}/${rulesType}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const saveToHistory = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/rules-history/${projectId}/${rulesType}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ rules: rulesContent })
      });
      loadHistory();
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  };

  const restoreFromHistory = (rules) => {
    if (confirm('Restore this version? Current changes will be lost.')) {
      setRulesContent(rules);
      setShowHistory(false);
    }
  };

  const testRules = () => {
    // Simple client-side simulation
    const isAuthenticated = testAuth.trim() !== '';
    let result = { allowed: false, reason: 'Unknown' };

    if (rulesType === 'firestore') {
      if (rulesContent.includes('allow read, write: if true')) {
        result = { allowed: true, reason: 'Rule allows all operations' };
      } else if (rulesContent.includes('allow read, write: if request.auth != null') && isAuthenticated) {
        result = { allowed: true, reason: 'User is authenticated' };
      } else if (rulesContent.includes('allow read, write: if request.auth != null') && !isAuthenticated) {
        result = { allowed: false, reason: 'Authentication required' };
      } else if (rulesContent.includes('allow read, write: if false')) {
        result = { allowed: false, reason: 'Rule denies all operations' };
      } else {
        result = { allowed: false, reason: 'No matching rule found' };
      }
    } else if (rulesType === 'storage') {
      if (rulesContent.includes('allow read, write: if true')) {
        result = { allowed: true, reason: 'Rule allows all operations' };
      } else if (rulesContent.includes('allow read, write: if request.auth != null') && isAuthenticated) {
        result = { allowed: true, reason: 'User is authenticated' };
      } else if (rulesContent.includes('allow read, write: if request.auth != null') && !isAuthenticated) {
        result = { allowed: false, reason: 'Authentication required' };
      } else {
        result = { allowed: false, reason: 'No matching rule found' };
      }
    } else if (rulesType === 'database') {
      try {
        const rules = JSON.parse(rulesContent);
        if (rules.rules && rules.rules['.read'] === true) {
          result = { allowed: true, reason: 'Rule allows all reads' };
        } else {
          result = { allowed: false, reason: 'Rule denies operation' };
        }
      } catch (e) {
        result = { allowed: false, reason: 'Invalid JSON' };
      }
    }

    setTestResult(result);
  };

  const validateRules = () => {
    if (!rulesContent.trim()) {
      setValidationError(null);
      return { valid: true };
    }

    try {
      if (rulesType === 'database') {
        JSON.parse(rulesContent);
        setValidationError(null);
        return { valid: true };
      }
      if (rulesContent.trim().length > 20) {
        if (!rulesContent.includes('rules_version')) {
          setValidationError('Missing rules_version declaration');
          return { valid: false, error: 'Missing rules_version declaration' };
        }
        if (!rulesContent.includes('service')) {
          setValidationError('Missing service declaration');
          return { valid: false, error: 'Missing service declaration' };
        }
      }
      setValidationError(null);
      return { valid: true };
    } catch (error) {
      setValidationError(error.message);
      return { valid: false, error: error.message };
    }
  };

  useEffect(() => {
    if (rulesContent) {
      const timer = setTimeout(() => validateRules(), 1000);
      return () => clearTimeout(timer);
    }
  }, [rulesContent, rulesType]);

  const handleSave = async () => {
    const validation = validateRules();
    if (!validation.valid) {
      alert(`Validation Error: ${validation.error}`);
      return;
    }
    await saveToHistory();
    onSave();
  };

  const handleDeploy = () => {
    const validation = validateRules();
    if (!validation.valid) {
      alert(`Validation Error: ${validation.error}\nPlease fix errors before deploying.`);
      return;
    }
    if (!confirm(`Deploy ${rulesType} rules to Firebase production?`)) {
      return;
    }
    onDeploy();
  };

  return (
    <div className="section" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <h2>Edit {rulesType.charAt(0).toUpperCase() + rulesType.slice(1)} Rules</h2>
      
      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', flexShrink: 0 }}>
        <button onClick={() => setShowHistory(!showHistory)} style={{ padding: '4px 8px', fontSize: '12px' }}>
          {showHistory ? 'Hide' : 'Show'} History ({history.length})
        </button>
        <button onClick={() => setShowTester(!showTester)} style={{ padding: '4px 8px', fontSize: '12px' }}>
          {showTester ? 'Hide' : 'Show'} Tester
        </button>
      </div>

      {showHistory && (
        <div style={{ marginBottom: '15px', maxHeight: '150px', overflow: 'auto', background: '#0d1117', padding: '10px', borderRadius: '6px', border: '1px solid #30363d' }}>
          <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px' }}>Version History</div>
          {history.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#8b949e', fontStyle: 'italic' }}>No history yet</div>
          ) : (
            history.map((item, idx) => (
              <div key={idx} style={{ marginBottom: '8px', padding: '8px', background: '#161b22', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#8b949e' }}>
                  {new Date(item.timestamp).toLocaleString()}
                </span>
                <button onClick={() => restoreFromHistory(item.rules)} style={{ padding: '2px 6px', fontSize: '11px' }}>
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {showTester && (
        <div style={{ marginBottom: '15px', background: '#0d1117', padding: '10px', borderRadius: '6px', border: '1px solid #30363d' }}>
          <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px' }}>Rules Tester (Basic Simulation)</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Path (e.g., /users/123)" 
              value={testPath}
              onChange={(e) => setTestPath(e.target.value)}
              style={{ flex: 1, minWidth: '150px' }}
            />
            <select value={testOperation} onChange={(e) => setTestOperation(e.target.value)} style={{ padding: '8px' }}>
              <option value="read">Read</option>
              <option value="write">Write</option>
            </select>
            <input 
              type="text" 
              placeholder="Auth UID (optional)" 
              value={testAuth}
              onChange={(e) => setTestAuth(e.target.value)}
              style={{ flex: 1, minWidth: '120px' }}
            />
            <button onClick={testRules} style={{ padding: '8px 12px' }}>Test</button>
          </div>
          {testResult && (
            <div style={{ padding: '8px', background: testResult.allowed ? '#1a3a1a' : '#3a1a1a', borderRadius: '4px', border: `1px solid ${testResult.allowed ? '#2ea043' : '#f85149'}` }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: testResult.allowed ? '#2ea043' : '#f85149' }}>
                {testResult.allowed ? '✅ ALLOW' : '❌ DENY'}
              </div>
              <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '4px' }}>{testResult.reason}</div>
              <div style={{ fontSize: '10px', color: '#6e7681', marginTop: '4px', fontStyle: 'italic' }}>Note: This is a basic simulation. Real rules may behave differently.</div>
            </div>
          )}
        </div>
      )}

      <div style={{ border: '1px solid #30363d', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px', flex: 1 }}>
        <Editor
          height="100%"
          language={rulesType === 'database' ? 'jsonc' : 'plaintext'}
          theme="vs-dark"
          value={rulesContent}
          onChange={(value) => setRulesContent(value || '')}
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
        ) : rulesContent ? (
          <span className="success-message">✅ Valid syntax</span>
        ) : null}
      </div>
      <div style={{ marginBottom: '10px', color: '#888', fontSize: '12px', flexShrink: 0 }}>
        {rulesType === 'database' ? '⚠️ Must be valid JSON' : '⚠️ Must include rules_version and service declarations'}
      </div>
      <div style={{ flexShrink: 0 }}>
      <button onClick={handleSave}>Save Rules</button>
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

export default RulesEditor;
