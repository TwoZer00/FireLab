import { useState, useMemo } from 'react';
import AnsiToHtml from 'ansi-to-html';

const API_URL = import.meta.env.VITE_API_URL || '';
const ansiConverter = new AnsiToHtml({ fg: '#d4d4d4', bg: 'transparent' });

function sanitizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, 'data-removed=')
    .replace(/<iframe[\s\S]*?>/gi, '');
}

const DEBUG_FILTERS = [
  { value: 'all',          label: 'All Logs' },
  { value: 'allow',        label: '✅ ALLOW' },
  { value: 'deny',         label: '❌ DENY' },
  { value: 'rules',        label: '📋 Rules Eval' },
  { value: 'transaction',  label: '🔄 Transactions' },
  { value: 'read',         label: '👁 Reads' },
  { value: 'write',        label: '✏️ Writes' },
  { value: 'error',        label: '🚨 Errors' },
];

// Patterns that match debug-only noise — hidden unless a debug filter is active
const DEBUG_NOISE = [
  /^\s*\[debug\]/i,
  /firestore.*internal/i,
  /grpc.*channel/i,
  /\[.*\] >>>/,
  /^\s*>/,
];

function matchesDebugFilter(log, filter) {
  const l = log.toLowerCase();
  switch (filter) {
    case 'allow':       return l.includes('allow');
    case 'deny':        return l.includes('deny');
    case 'rules':       return l.includes('allow') || l.includes('deny') || l.includes('rules');
    case 'transaction': return l.includes('transaction') || l.includes('commit') || l.includes('batch');
    case 'read':        return l.includes(' read ') || l.includes('get(') || l.includes('list(');
    case 'write':       return l.includes(' write ') || l.includes('set(') || l.includes('update(') || l.includes('delete(') || l.includes('create(');
    case 'error':       return l.includes('error') || l.includes('failed') || l.includes('exception');
    default:            return true;
  }
}

function LogsViewer({ logs, autoScroll, setAutoScroll, onClear, projectId, getHeaders }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [debugFilter, setDebugFilter] = useState('all');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const lowerLog = log.toLowerCase();

      if (searchTerm && !lowerLog.includes(searchTerm.toLowerCase())) return false;

      if (serviceFilter !== 'all' && !lowerLog.includes(serviceFilter)) return false;

      if (debugFilter !== 'all') {
        return matchesDebugFilter(log, debugFilter);
      }

      // In 'all' mode, hide low-level debug noise
      if (DEBUG_NOISE.some(p => p.test(log))) return false;

      return true;
    });
  }, [logs, searchTerm, serviceFilter, debugFilter]);

  const downloadDebugLog = async () => {
    const res = await fetch(`${API_URL}/api/debug-log/${projectId}`, { headers: getHeaders() });
    if (!res.ok) { alert('No debug log available yet. Start the emulator first.'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectId}-debug.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="section" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
        <h2 style={{ marginBottom: 0 }}>Logs</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '12px' }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Auto-scroll
          </label>
          {projectId && (
            <button onClick={downloadDebugLog} style={{ fontSize: '11px', padding: '4px 8px', background: '#21262d', borderColor: '#30363d' }} title="Download full debug log">
              ⬇️ debug.log
            </button>
          )}
          <button onClick={onClear}>Clear</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: '120px', marginRight: 0, marginBottom: 0 }}
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
        <select
          value={debugFilter}
          onChange={(e) => setDebugFilter(e.target.value)}
          style={{ marginRight: 0, marginBottom: 0 }}
          title="Filter by debug event type"
        >
          {DEBUG_FILTERS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {debugFilter !== 'all' && (
        <div style={{ fontSize: '11px', color: '#e3b341', marginBottom: '8px', flexShrink: 0 }}>
          ⚠️ Debug filter active — showing only <strong>{DEBUG_FILTERS.find(f => f.value === debugFilter)?.label}</strong> events. Full log saved to <code style={{ color: '#58a6ff' }}>debug.log</code>.
        </div>
      )}

      <div className="logs" style={{ flex: 1 }}>
        {filteredLogs.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic' }}>
            {logs.length === 0 ? 'No logs yet. Start the emulator to see logs...' : 'No logs match the current filters.'}
          </div>
        ) : (
          filteredLogs.map((log, i) => {
            const htmlLog = sanitizeHtml(ansiConverter.toHtml(log));
            const l = log.toLowerCase();
            const isError   = l.includes('error') || l.includes('failed');
            const isWarning = l.includes('warn');
            const isSuccess = l.includes('emulator') && l.includes('started');
            const isAllow   = l.includes('allow');
            const isDeny    = l.includes('deny');

            return (
              <div
                key={i}
                className={`log-line ${
                  isDeny    ? 'log-deny' :
                  isAllow   ? 'log-allow' :
                  isError   ? 'log-error' :
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
