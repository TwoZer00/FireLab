import { useState, useEffect } from 'react';

function TokenAuth({ onTokenSet }) {
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(!!localStorage.getItem('accessToken'));

  useEffect(() => {
    const saved = localStorage.getItem('accessToken');
    if (saved) {
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/projects`, {
        headers: { 'Authorization': `Bearer ${saved}` }
      })
      .then(res => {
        if (res.status === 401) {
          localStorage.removeItem('accessToken');
        } else {
          setToken(saved);
          setIsAuthenticated(true);
          onTokenSet(saved);
        }
      })
      .catch(() => {
        setToken(saved);
        setIsAuthenticated(true);
        onTokenSet(saved);
      })
      .finally(() => setLoading(false));
    }
  }, [onTokenSet]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (token.trim()) {
      localStorage.setItem('accessToken', token.trim());
      setIsAuthenticated(true);
      onTokenSet(token.trim());
      // Force page reload to reconnect socket with token
      window.location.reload();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setToken('');
    setIsAuthenticated(false);
    onTokenSet(null);
  };

  if (loading) {
    return (
      <div className="section">
        <div style={{ fontSize: '12px', color: '#8b949e' }}>⏳ Checking credentials...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: '#58a6ff' }}>
            ✓ Authenticated
          </div>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <h3>🔐 Access Token Required</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter access token..."
          style={{ width: '100%', marginBottom: '8px' }}
        />
        <button type="submit" className="btn-primary" style={{ width: '100%' }}>
          Authenticate
        </button>
      </form>
      <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '8px' }}>
        Contact admin to get your access token
      </div>
    </div>
  );
}

export default TokenAuth;
