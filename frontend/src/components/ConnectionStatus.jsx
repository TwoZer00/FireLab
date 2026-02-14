function ConnectionStatus({ config, isRunning, emulatorHost }) {
  if (!config || !isRunning) return null;

  const services = [
    { name: 'Auth', port: config.emulators?.auth?.port, key: 'auth' },
    { name: 'Firestore', port: config.emulators?.firestore?.port, key: 'firestore' },
    { name: 'Database', port: config.emulators?.database?.port, key: 'database' },
    { name: 'Storage', port: config.emulators?.storage?.port, key: 'storage' },
    { name: 'Hosting', port: config.emulators?.hosting?.port, key: 'hosting' },
  ];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="section">
      <h2>Services</h2>
      <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '10px' }}>
        Running emulator services
      </div>
      {services.map(service => {
        if (!service.port) return null;
        const url = emulatorHost.replace(':4000', `:${service.port}`);
        return (
          <div 
            key={service.key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 10px',
              marginBottom: '6px',
              background: '#0d1117',
              borderRadius: '6px',
              border: '1px solid #30363d'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#3fb950', fontSize: '10px' }}>●</span>
              <span style={{ fontSize: '13px' }}>{service.name}</span>
              <code style={{ 
                fontSize: '11px', 
                color: '#8b949e',
                background: '#161b22',
                padding: '2px 6px',
                borderRadius: '3px'
              }}>
                :{service.port}
              </code>
            </div>
            <button
              onClick={() => copyToClipboard(url)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                background: '#21262d',
                borderColor: '#30363d'
              }}
              title="Copy URL"
            >
              📋
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ConnectionStatus;
