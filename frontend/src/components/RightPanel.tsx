import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';


const InfoItem = ({ label, value }: { label: string, value: string }) => (
  <div className="info-item">
    <span className="info-label">{label}</span>
    <span className="info-value">{value}</span>
  </div>
);

const RightPanel: React.FC = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentModule, setCurrentModule] = useState('Dashboard');

  useEffect(() => {
    const path = location.pathname.split('/').pop() || 'dashboard';
    const formattedName = path
      .split('-')
      .map(word => word === 'ai' ? 'AI' : word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    setCurrentModule(formattedName);
  }, [location]);

  return (
    <aside className={`right-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <button className="right-panel-collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
      {!isCollapsed && (
        <div className="right-panel-content">
          <div className="panel-section">
            <h3 className="panel-title">Application Info</h3>
            <InfoItem label="Version" value="2.0.0-alpha" /> 
            <InfoItem label="Environment" value={process.env.NODE_ENV ?? "development"} />
            <InfoItem label="Current Module" value={currentModule} />
          </div>
          <div className="panel-section">
            <h3 className="panel-title">System Usage</h3>
            <InfoItem label="CPU Usage" value="12%" />
            <InfoItem label="Memory Usage" value="256 MB" />
          </div>
        </div>
      )}
    </aside>
  );
};

export default RightPanel;
