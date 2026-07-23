import React, { useState, useEffect, useRef } from 'react';
import '../styles/ControlPanel.css';
import { Trash2 } from 'lucide-react';

interface LogEntry {
  id: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  timestamp: string;
}

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsubscribe: any;
    const toLogEntry = (line: string, index: number): LogEntry => {
      const levelMatch = line.match(/\[(INFO|WARN|ERROR|DEBUG)\]/);
      return {
        id: Date.now() + index,
        level: (levelMatch?.[1] as LogEntry['level']) ?? 'INFO',
        message: line.replace(/\[(INFO|WARN|ERROR|DEBUG)\]\s*/, ''),
        timestamp: new Date().toISOString(),
      };
    };
    if ((window as any).electronAPI?.logs?.onUpdate) {
      (window as any).electronAPI.logs.get?.().then((lines: string[]) => {
        setLogs((lines ?? []).map(toLogEntry));
      });
      unsubscribe = (window as any).electronAPI.logs.onUpdate((newLog: string | LogEntry) => {
        const entry = typeof newLog === 'string' ? toLogEntry(newLog, 0) : newLog;
        setLogs(prev => [...prev.slice(-499), entry]);
      });
    }
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, filter]);

  const filteredLogs = logs.filter(log => filter === 'ALL' || log.level === filter);

  return (
    <div className="cp-page">
      <h1 className="cp-title">System Logs</h1>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'INFO', 'WARN', 'ERROR'].map(f => (
            <button 
              key={f}
              className={`cp-badge ${filter === f ? 'primary' : 'ghost'}`}
              style={{ border: filter === f ? '1px solid #00aaff' : '1px solid rgba(255,255,255,0.1)', background: filter === f ? 'rgba(0,170,255,0.1)' : 'transparent', color: filter === f ? '#00aaff' : '#8b949e', cursor: 'pointer' }}
              onClick={() => setFilter(f as any)}
            >
              {f}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label className="cp-toggle-row" style={{ padding: 0 }}>
            <span className="cp-slider-label" style={{ width: 'auto', marginRight: '8px' }}>Auto-scroll</span>
            <label className="cp-toggle">
              <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
              <span className="cp-toggle-slider"></span>
            </label>
          </label>
          <button className="cp-btn danger" onClick={() => { (window as any).electronAPI?.logs?.clear?.(); setLogs([]); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px' }}>
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      <div 
        ref={logContainerRef}
        style={{ height: '500px', overflowY: 'auto', background: '#0d1117', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {filteredLogs.map(log => (
          <div key={log.id} className={`cp-log-line ${log.level}`}>
            <span style={{ color: '#8b949e', marginRight: '8px' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
            <span style={{ fontWeight: 'bold', marginRight: '8px' }}>[{log.level}]</span>
            {log.message}
          </div>
        ))}
        {filteredLogs.length === 0 && (
          <div style={{ color: '#8b949e', textAlign: 'center', marginTop: '20px' }}>No logs to display.</div>
        )}
      </div>
    </div>
  );
};

export default Logs;
