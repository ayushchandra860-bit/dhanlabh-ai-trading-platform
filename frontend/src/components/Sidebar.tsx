import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Bot, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Monitor, 
  Eye, 
  Activity, 
  Cpu, 
  FileText, 
  Database 
} from 'lucide-react';
import '../styles/Sidebar.css';

const navGroups = [
  {
    title: 'Control',
    items: [
      { to: '/control-panel', icon: <Activity size={20} />, label: 'Home' },
      { to: '/ai', icon: <Bot size={20} />, label: 'AI' },
    ]
  },
  {
    title: 'Engines',
    items: [
      { to: '/vision-settings', icon: <Cpu size={20} />, label: 'Vision' },
      { to: '/ocr-settings', icon: <Eye size={20} />, label: 'OCR' },
    ]
  },
  {
    title: 'System',
    items: [
      { to: '/logs', icon: <FileText size={20} />, label: 'Logs' },
      { to: '/database', icon: <Database size={20} />, label: 'Database' },
      { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
    ]
  }
];

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{ background: '#0f1318' }}>
      <div className="sidebar-header">
        {!isCollapsed && <span className="sidebar-title">DhanLabh AI</span>}
        <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      
      <nav className="sidebar-nav">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="nav-group">
            {!isCollapsed && <div className="nav-group-title" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#8b949e', margin: '16px 0 8px 16px', fontWeight: 600 }}>{group.title}</div>}
            {isCollapsed && <div style={{ height: '16px' }} />}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                style={({ isActive }) => isActive ? { background: 'rgba(0,170,255,0.1)', color: '#00aaff', borderRight: '2px solid #00aaff' } : {}}
              >
                <div className="nav-icon" style={{ opacity: 0.8 }}>{item.icon}</div>
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
