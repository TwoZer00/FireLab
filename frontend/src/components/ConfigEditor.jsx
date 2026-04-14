function ConfigEditor({ config, availableRules, onUpdatePort, onSave, onLoadRules, onLoadIndexes }) {
  if (!config?.emulators) return null;

  return (
    <div className="section">
      <h2>Configuration</h2>
      <div className="config-grid">
        {Object.entries(config.emulators).map(([service, settings]) => (
          service !== 'ui' && (
            <div key={service} className="config-item">
              <label>{service.toUpperCase()}</label>
              <input
                type="number"
                value={settings.port}
                onChange={(e) => onUpdatePort(service, e.target.value)}
              />
            </div>
          )
        ))}
      </div>
      <button onClick={onSave}>Save Configuration</button>
      {availableRules.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <label>Edit Rules: </label>
          {availableRules.map(rule => (
            <button key={rule} onClick={() => onLoadRules(rule)}>
              {rule.charAt(0).toUpperCase() + rule.slice(1)}
            </button>
          ))}
        </div>
      )}
      {config.emulators?.firestore && (
        <div style={{ marginTop: '10px' }}>
          <label>Indexes: </label>
          <button onClick={onLoadIndexes}>📇 Firestore Indexes</button>
        </div>
      )}
    </div>
  );
}

export default ConfigEditor;
