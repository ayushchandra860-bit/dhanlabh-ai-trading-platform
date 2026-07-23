import React, { useEffect, useRef } from 'react';
import { useWorkspaceV6 } from '../../context/WorkspaceV6Context';
import { WIDGET_REGISTRY } from '../../registry/WidgetRegistry';
import { Lock, Unlock, Eye, EyeOff, RotateCcw } from 'lucide-react';

export const WidgetContextMenu: React.FC = () => {
  const {
    contextMenu,
    closeContextMenu,
    widgets,
    toggleWidgetVisibility,
    toggleWidgetLock,
    setWidgetOpacity,
    resetAllPositions,
  } = useWorkspaceV6();

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    if (contextMenu.isOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
    }
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [contextMenu.isOpen, closeContextMenu]);

  if (!contextMenu.isOpen) return null;

  const targetId = contextMenu.targetWidgetId;
  const targetWidget = targetId ? widgets[targetId] : null;

  return (
    <div
      ref={menuRef}
      className="v6-context-menu"
      style={{
        left: Math.min(contextMenu.x, window.innerWidth - 220),
        top: Math.min(contextMenu.y, window.innerHeight - 300),
      }}
    >
      <div className="v6-cm-header">WORKSPACE CONTROLS</div>

      {targetWidget && (
        <>
          <div
            className="v6-cm-item"
            onClick={() => {
              toggleWidgetLock(targetWidget.id);
              closeContextMenu();
            }}
          >
            {targetWidget.isLocked ? <Unlock size={14} /> : <Lock size={14} />}
            <span>{targetWidget.isLocked ? 'Unlock Position' : 'Lock Position'}</span>
          </div>

          <div className="v6-cm-slider-row">
            <span>Opacity</span>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.05"
              value={targetWidget.opacity}
              onChange={(e) => setWidgetOpacity(targetWidget.id, parseFloat(e.target.value))}
            />
            <span>{Math.round(targetWidget.opacity * 100)}%</span>
          </div>

          <div className="v6-cm-divider" />
        </>
      )}

      <div className="v6-cm-label">WIDGET VISIBILITY</div>
      {Object.values(WIDGET_REGISTRY).map((def) => {
        const isVisible = !widgets[def.id]?.isHidden;
        return (
          <div
            key={def.id}
            className="v6-cm-item"
            onClick={() => {
              toggleWidgetVisibility(def.id);
            }}
          >
            {isVisible ? <Eye size={14} className="text-buy" /> : <EyeOff size={14} className="text-muted" />}
            <span>{def.title}</span>
            <span className={`v6-cm-badge ${isVisible ? 'on' : 'off'}`}>{isVisible ? 'ON' : 'OFF'}</span>
          </div>
        );
      })}

      <div className="v6-cm-divider" />

      <div
        className="v6-cm-item danger"
        onClick={() => {
          resetAllPositions();
          closeContextMenu();
        }}
      >
        <RotateCcw size={14} />
        <span>Reset Layout Positions</span>
      </div>
    </div>
  );
};
