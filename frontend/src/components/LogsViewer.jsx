import { useState, useMemo } from 'react';
import AnsiToHtml from 'ansi-to-html';

const ansiConverter = new AnsiToHtml({ fg: '#d4d4d4', bg: '#1e1e1e' });

function LogsViewer({ logs, autoScroll, setAutoScroll, onClear }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const lowerLog = log.toLowerCase();
      
      // Search filter
      if (searchTerm && !lowerLog.includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Service filter
      if (serviceFilter !== 'all') {
        const hasService = lowerLog.includes(serviceFilter);
        if (!hasService) return false;
      }
      
      return true;
    });
  }, [logs, searchTerm, serviceFilter]);

  return (
    <div className="section" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
        <h2 style={{ marginBottom: 0 }}>Logs</h2>
        <div>
          <label style={{ marginRight: '15px' }}>
            <input 
              type="checkbox" 
              checked={autoScroll} 
              onChange={(e) => setAutoScroll(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Auto-scroll
          </label>
          <button onClick={onClear}>Clear Logs</button>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexShrink: 0 }}>
        <input
          type="text"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, marginRight: 0, marginBottom: 0 }}
        />
        <select 
          value={serviceFilter} 
          onChange={(e) => setServiceFilter(e.target.value)}
          style={{ marginRight: 0, marginBottom: 0 }}
        >
          <option value="all">All Services</option>
          <option value="firelab">FireLab</option>
          <option value="auth">Auth</option>
          <option value="firestore">Firestore</option>
          <option value="database">Database</option>
          <option value="storage">Storage</option>
          <option value="hosting">Hosting</option>
          <option value="functions">Functions</option>
        </select>
      </div>

      <div className="logs" style={{ flex: 1 }}>
        {filteredLogs.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic' }}>
            {logs.length === 0 ? 'No logs yet. Start the emulator to see logs...' : 'No logs match the current filters.'}
          </div>
        ) : (
          filteredLogs.map((log, i) => {
            const htmlLog = ansiConverter.toHtml(log);
            const isError = log.toLowerCase().includes('error') || log.toLowerCase().includes('failed');
            const isWarning = log.toLowerCase().includes('warn');
            const isSuccess = log.toLowerCase().includes('emulator') && log.toLowerCase().includes('started');
            
            return (
              <div 
                key={i} 
                className={`log-line ${
                  isError ? 'log-error' : 
                  isWarning ? 'log-warning' : 
                  isSuccess ? 'log-success' : ''
                }`}
                dangerouslySetInnerHTML={{ __html: htmlLog }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

export default LogsViewer;
