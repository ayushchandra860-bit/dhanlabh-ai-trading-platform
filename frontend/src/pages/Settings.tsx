import React, { useState, useEffect } from 'react';
import '../styles/Settings.css';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000/api';

const Settings: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if ((window as any).electronAPI && (window as any).electronAPI.settings) {
          const loadedConfig = await (window as any).electronAPI.settings.get();
          setConfig(loadedConfig);
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if ((window as any).electronAPI && (window as any).electronAPI.settings) {
        await (window as any).electronAPI.settings.set(config);
        
        // Also save to backend
        await fetch(`${API_BASE_URL}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'app_config', value: JSON.stringify(config) })
        });
      }
      alert('Settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings', err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (category: string, key: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  if (loading) return <div className="settings-container"><p>Loading settings...</p></div>;
  if (!config) return <div className="settings-container"><p>Failed to load settings.</p></div>;

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Application Settings</h2>
        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="settings-content">
        <section className="settings-section">
          <h3>Vision & AI Engine</h3>
          <div className="form-group">
            <label>Capture Interval (ms)</label>
            <input 
              type="number" 
              value={config.vision?.captureIntervalMs || 5000} 
              onChange={(e) => handleChange('vision', 'captureIntervalMs', parseInt(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>OCR Language</label>
            <select 
              value={config.vision?.ocrLanguage || 'eng'}
              onChange={(e) => handleChange('vision', 'ocrLanguage', e.target.value)}
            >
              <option value="eng">English</option>
              <option value="rus">Russian</option>
              <option value="spa">Spanish</option>
            </select>
          </div>
        </section>

        <section className="settings-section">
          <h3>AI Decision Thresholds</h3>
          <div className="form-group">
            <label>Min Trade Score for Decision</label>
            <input 
              type="number" 
              value={config.aiDecision?.minTradeScoreForDecision || 70} 
              onChange={(e) => handleChange('aiDecision', 'minTradeScoreForDecision', parseInt(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Min Confidence for Trade (%)</label>
            <input 
              type="number" 
              value={config.aiDecision?.minConfidenceForTrade || 60} 
              onChange={(e) => handleChange('aiDecision', 'minConfidenceForTrade', parseInt(e.target.value))}
            />
          </div>
        </section>

        <section className="settings-section">
          <h3>Confluence Weights</h3>
          {Object.entries(config.confluenceWeights || {}).map(([key, val]) => (
            <div className="form-group" key={key}>
              <label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} Weight</label>
              <input 
                type="number" 
                step="0.1"
                value={val as number} 
                onChange={(e) => handleChange('confluenceWeights', key, parseFloat(e.target.value))}
              />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default Settings;
