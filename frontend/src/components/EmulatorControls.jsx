function EmulatorControls({ 
  isRunning, 
  hasExportData, 
  importOnStart, 
  setImportOnStart,
  onStart, 
  onStop, 
  onExport,
  emulatorHost 
}) {
  return (
    <div className="section">
      <h2>Emulator Controls</h2>
      <div className="status">
        Status: <span className={isRunning ? 'running' : 'stopped'}>
          {isRunning ? '🟢 Running' : '🔴 Stopped'}
        </span>
      </div>
      {hasExportData && !isRunning && (
        <div style={{ marginBottom: '10px' }}>
          <label>
            <input 
              type="checkbox" 
              checked={importOnStart} 
              onChange={(e) => setImportOnStart(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Import previous data on start
          </label>
        </div>
      )}
      <button onClick={onStart} disabled={isRunning}>
        Start Emulator
      </button>
      <button onClick={onStop} disabled={!isRunning}>
        Stop Emulator
      </button>
      <button onClick={onExport} disabled={!isRunning}>
        Export Data
      </button>
      {isRunning && (
        <a href={emulatorHost} target="_blank" rel="noopener noreferrer">
          <button>Open Emulator UI</button>
        </a>
      )}
    </div>
  );
}

export default EmulatorControls;
