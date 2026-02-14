import { useState, useEffect } from 'react';

function RulesEditor({ 
  rulesType, 
  rulesContent, 
  setRulesContent,
  onSave, 
  onDeploy, 
  onClose,
  firebaseLoggedIn
}) {
  const [validationError, setValidationError] = useState(null);

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

  const handleSave = () => {
    const validation = validateRules();
    if (!validation.valid) {
      alert(`Validation Error: ${validation.error}`);
      return;
    }
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
    <div className="section">
      <h2>Edit {rulesType.charAt(0).toUpperCase() + rulesType.slice(1)} Rules</h2>
      <div className="editor-container">
        <div className="line-numbers">
          {rulesContent.split('\n').map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          value={rulesContent}
          onChange={(e) => setRulesContent(e.target.value)}
          className={`rules-editor ${validationError ? 'rules-error' : 'rules-valid'}`}
          rows="15"
          onScroll={(e) => {
            const lineNumbers = e.target.previousSibling;
            lineNumbers.scrollTop = e.target.scrollTop;
          }}
        />
      </div>
      <div className="validation-status">
        {validationError ? (
          <span className="error-message">❌ {validationError}</span>
        ) : rulesContent ? (
          <span className="success-message">✅ Valid syntax</span>
        ) : null}
      </div>
      <div style={{ marginBottom: '10px', color: '#888', fontSize: '12px' }}>
        {rulesType === 'database' ? '⚠️ Must be valid JSON' : '⚠️ Must include rules_version and service declarations'}
      </div>
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
  );
}

export default RulesEditor;
