import React, { useState, useEffect } from 'react';
import '../styles/ControlPanel.css';
import { Save } from 'lucide-react';

const OcrSettings: React.FC = () => {
  const [language, setLanguage] = useState('eng');
  const [intervalMs, setIntervalMs] = useState(1000);

  useEffect(() => {
    const loadSettings = async () => {
      if ((window as any).electronAPI?.settings) {
        const currentSettings = await (window as any).electronAPI.settings.get();
        if (currentSettings?.ocr) {
          setLanguage(currentSettings.ocr.language || 'eng');
          setIntervalMs(currentSettings.ocr.captureInterval || 1000);
        }
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    if ((window as any).electronAPI?.settings) {
      await (window as any).electronAPI.settings.set({
        ocr: { language, captureInterval: intervalMs }
      });
      alert('OCR settings saved successfully.');
    }
  };

  return (
    <div className="cp-page">
      <h1 className="cp-title">OCR Configuration</h1>
      
      <div className="cp-card">
        <h2 className="cp-card-title">General Settings</h2>
        
        <div className="cp-form-row" style={{ display: 'flex', flexDirection: 'column' }}>
          <label className="cp-section-label" style={{ margin: '0 0 8px 0' }}>OCR Language</label>
          <select 
            className="cp-input" 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="eng">English</option>
            <option value="rus">Russian</option>
            <option value="spa">Spanish</option>
            <option value="por">Portuguese</option>
          </select>
        </div>

        <div className="cp-slider-row" style={{ marginTop: '24px' }}>
          <span className="cp-slider-label">Capture Interval</span>
          <input 
            type="range" 
            min="1000" 
            max="10000" 
            step="100"
            value={intervalMs}
            onChange={(e) => setIntervalMs(parseInt(e.target.value))}
          />
          <span className="cp-slider-val">{intervalMs}ms</span>
        </div>
      </div>

      <button className="cp-btn primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Save size={16} />
        Save Settings
      </button>
    </div>
  );
};

export default OcrSettings;
