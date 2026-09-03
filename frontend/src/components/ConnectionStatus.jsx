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
          <div key={service.key} className="service-row">
            <div className="service-info">
              <span className="service-dot">●</span>
              <span className="service-name">{service.name}</span>
              <code className="service-port">:{service.port}</code>
            </div>
            <button className="btn-icon btn-secondary" onClick={() => copyToClipboard(url)} title="Copy URL">📋</button>
          </div>
        );
      })}
    </div>
  );
}

export default ConnectionStatus;
