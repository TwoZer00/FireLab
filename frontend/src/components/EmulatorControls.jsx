function EmulatorControls({ 
  isRunning, 
  hasExportData, 
  importOnStart, 
  setImportOnStart,
  autoSnapshot,
  setAutoSnapshot,
  onStart, 
  onStop,
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
      {!isRunning && (
        <>
          {hasExportData && (
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
          <div style={{ marginBottom: '10px' }}>
            <label>
              <input 
                type="checkbox" 
                checked={autoSnapshot} 
                onChange={(e) => setAutoSnapshot(e.target.checked)}
                style={{ marginRight: '5px' }}
              />
              Auto-snapshot every 15 minutes
            </label>
          </div>
        </>
      )}
      <button onClick={onStart} disabled={isRunning}>
        Start Emulator
      </button>
      <button onClick={onStop} disabled={!isRunning}>
        Stop Emulator
      </button>
      {isRunning && (
        <a href={emulatorHost} target="_blank" rel="noopener noreferrer">
          <button>Open Emulator UI</button>
        </a>
      )}
      <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '8px' }}>
        🔍 Debug logging always active — full log saved to <code style={{ color: '#58a6ff' }}>debug.log</code>
      </div>
    </div>
  );
}

export default EmulatorControls;
