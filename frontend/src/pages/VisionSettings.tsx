import React, { useState, useEffect } from 'react';
import '../styles/ControlPanel.css';
import { AlertTriangle, Save } from 'lucide-react';

const dependencies: Record<string, string[]> = {
  trend: ['bos', 'choch', 'confluence', 'tradeDecision'],
  supportResistance: ['confluence', 'tradeDecision'],
  confluence: ['tradeDecision'],
};

const VisionSettings: React.FC = () => {
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({
    trend: true,
    supportResistance: true,
    bos: true,
    choch: true,
    confluence: true,
    tradeDecision: true,
    liquidity: true,
    orderBlock: true,
    fvg: true,
  });
  const [intervalMs, setIntervalMs] = useState(2000);
  const [visionEnabled, setVisionEnabled] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      if ((window as any).electronAPI?.settings) {
        const settings = await (window as any).electronAPI.settings.get();
        if (settings?.vision) {
          if (settings.vision.enabledModules) {
            setEnabledModules(prev => ({ ...prev, ...settings.vision.enabledModules }));
          }
          setIntervalMs(settings.vision.captureInterval || 2000);
          setVisionEnabled(settings.vision.enabled !== false);
        }
      }
    };
    loadSettings();
  }, []);

  const handleToggle = (module: string) => {
    setEnabledModules(prev => {
      const nextState = !prev[module];
      const newState = { ...prev, [module]: nextState };
      
      if (!nextState && dependencies[module]) {
        dependencies[module].forEach(dep => {
          newState[dep] = false;
        });
      }
      return newState;
    });
  };

  const handleSave = async () => {
    if ((window as any).electronAPI?.settings) {
      await (window as any).electronAPI.settings.set({
        vision: { enabled: visionEnabled, captureInterval: intervalMs, enabledModules }
      });
      alert('Vision settings saved successfully.');
    }
  };

  const modulesList = [
    { id: 'trend', label: 'Trend Detection' },
    { id: 'supportResistance', label: 'Support & Resistance' },
    { id: 'bos', label: 'Break of Structure (BOS)' },
    { id: 'choch', label: 'Change of Character (CHoCH)' },
    { id: 'confluence', label: 'Confluence Engine' },
    { id: 'tradeDecision', label: 'Trade Decision Logic' },
    { id: 'liquidity', label: 'Liquidity Pools' },
    { id: 'orderBlock', label: 'Order Blocks' },
    { id: 'fvg', label: 'Fair Value Gaps' }
  ];

  return (
    <div className="cp-page">
      <h1 className="cp-title">Vision Settings</h1>

      <div className="cp-card">
        <h2 className="cp-card-title">General Engine</h2>
        <div className="cp-toggle-row">
          <span className="cp-slider-label">Enable Vision Engine</span>
          <label className="cp-toggle">
            <input type="checkbox" checked={visionEnabled} onChange={(e) => setVisionEnabled(e.target.checked)} />
            <span className="cp-toggle-slider"></span>
          </label>
        </div>
        <div className="cp-slider-row" style={{ marginTop: '16px' }}>
          <span className="cp-slider-label">Analysis Interval</span>
          <input 
            type="range" 
            min="500" 
            max="10000" 
            step="100"
            value={intervalMs}
            onChange={(e) => setIntervalMs(parseInt(e.target.value))}
          />
          <span className="cp-slider-val">{intervalMs}ms</span>
        </div>
      </div>

      <div className="cp-card">
        <h2 className="cp-card-title">AI Modules</h2>
        {modulesList.map(mod => {
          const deps = dependencies[mod.id] || [];
          const cascadeWarning = !enabledModules[mod.id] && deps.length > 0;
          return (
            <div key={mod.id} style={{ marginBottom: '16px' }}>
              <div className="cp-toggle-row" style={{ paddingBottom: '0' }}>
                <span className="cp-slider-label" style={{ color: '#e0e0e0', width: 'auto' }}>{mod.label}</span>
                <label className="cp-toggle">
                  <input 
                    type="checkbox" 
                    checked={enabledModules[mod.id]} 
                    onChange={() => handleToggle(mod.id)} 
                  />
                  <span className="cp-toggle-slider"></span>
                </label>
              </div>
              {cascadeWarning && (
                <div className="cp-dep-warning">
                  <AlertTriangle size={12} />
                  Cascading disable: {deps.join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="cp-btn primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Save size={16} />
        Save Settings
      </button>
    </div>
  );
};

export default VisionSettings;
