import React from 'react';
import { useWorkspaceV6 } from '../../context/WorkspaceV6Context';
import { Lock, Unlock, Minus, Square, X } from 'lucide-react';

interface WidgetHeaderProps {
  id: string;
  title: string;
  isLocked: boolean;
  isCollapsed: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}

export const WidgetHeader: React.FC<WidgetHeaderProps> = ({
  id,
  title,
  isLocked,
  isCollapsed,
  onPointerDown,
}) => {
  const { toggleWidgetCollapse, toggleWidgetLock, toggleWidgetVisibility } = useWorkspaceV6();

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWidgetCollapse(id);
  };

  return (
    <div
      className="v6-widget-header widget-drag-handle"
      onPointerDown={onPointerDown}
      onDoubleClick={handleDoubleClick}
    >
      <div className="v6-header-title">
        <span className="v6-header-dot"></span>
        <span>{title}</span>
      </div>

      <div className="v6-header-controls" onPointerDown={(e) => e.stopPropagation()}>
        <button
          className={`v6-header-btn ${isLocked ? 'active' : ''}`}
          onClick={() => toggleWidgetLock(id)}
          title={isLocked ? 'Unlock Position' : 'Lock Position'}
        >
          {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>

        <button
          className="v6-header-btn"
          onClick={() => toggleWidgetCollapse(id)}
          title={isCollapsed ? 'Expand Widget' : 'Collapse Widget'}
        >
          {isCollapsed ? <Square size={11} /> : <Minus size={12} />}
        </button>

        <button
          className="v6-header-btn close-btn"
          onClick={() => toggleWidgetVisibility(id)}
          title="Hide Widget"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
