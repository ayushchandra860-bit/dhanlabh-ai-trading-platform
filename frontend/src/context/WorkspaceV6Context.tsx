import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { WIDGET_REGISTRY, WidgetDefinition } from '../registry/WidgetRegistry';

export interface WidgetGeometry {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isCollapsed: boolean;
  isLocked: boolean;
  isHidden: boolean;
  opacity: number;
  zIndex: number;
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetWidgetId: string | null;
}

interface WorkspaceV6ContextType {
  widgets: Record<string, WidgetGeometry>;
  activeChartRegion: { x: number; y: number; w: number; h: number } | null;
  contextMenu: ContextMenuState;
  updateWidget: (id: string, update: Partial<WidgetGeometry>) => void;
  toggleWidgetVisibility: (id: string) => void;
  toggleWidgetLock: (id: string) => void;
  toggleWidgetCollapse: (id: string) => void;
  setWidgetOpacity: (id: string, opacity: number) => void;
  bringToFront: (id: string) => void;
  resetAllPositions: () => void;
  openContextMenu: (x: number, y: number, targetWidgetId?: string) => void;
  closeContextMenu: () => void;
  setActiveChartRegion: (region: { x: number; y: number; w: number; h: number } | null) => void;
}

const LOCAL_STORAGE_KEY = 'mars_v6_workspace';

const WorkspaceV6Context = createContext<WorkspaceV6ContextType | undefined>(undefined);

export const WorkspaceV6Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeChartRegion, setActiveChartRegion] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    targetWidgetId: null,
  });

  // Initializing widget states from registry + localStorage
  const [widgets, setWidgets] = useState<Record<string, WidgetGeometry>>(() => {
    const initial: Record<string, WidgetGeometry> = {};
    
    // Default values from registry
    Object.values(WIDGET_REGISTRY).forEach((def: WidgetDefinition) => {
      initial[def.id] = {
        id: def.id,
        x: def.defaultGeometry.x,
        y: def.defaultGeometry.y,
        w: def.defaultGeometry.w,
        h: def.defaultGeometry.h,
        isCollapsed: false,
        isLocked: false,
        isHidden: !!def.defaultHidden,
        opacity: 0.95,
        zIndex: 10,
      };
    });

    // Load persisted state if exists
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          Object.keys(parsed).forEach((id) => {
            if (initial[id]) {
              initial[id] = { ...initial[id], ...parsed[id] };
            }
          });
        }
      }
    } catch (e) {
      console.warn('[WorkspaceV6] Failed to load layout from storage:', e);
    }

    return initial;
  });

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(widgets));
    } catch (e) {
      console.warn('[WorkspaceV6] Failed to persist layout to storage:', e);
    }
  }, [widgets]);

  const updateWidget = useCallback((id: string, update: Partial<WidgetGeometry>) => {
    setWidgets((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], ...update },
      };
    });
  }, []);

  const bringToFront = useCallback((id: string) => {
    setWidgets((prev) => {
      const highestZ = Math.max(...Object.values(prev).map((w) => w.zIndex), 10);
      if (prev[id]?.zIndex === highestZ) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], zIndex: highestZ + 1 },
      };
    });
  }, []);

  const toggleWidgetVisibility = useCallback((id: string) => {
    setWidgets((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], isHidden: !prev[id].isHidden },
      };
    });
  }, []);

  const toggleWidgetLock = useCallback((id: string) => {
    setWidgets((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], isLocked: !prev[id].isLocked },
      };
    });
  }, []);

  const toggleWidgetCollapse = useCallback((id: string) => {
    setWidgets((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], isCollapsed: !prev[id].isCollapsed },
      };
    });
  }, []);

  const setWidgetOpacity = useCallback((id: string, opacity: number) => {
    setWidgets((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], opacity: Math.max(0.2, Math.min(1, opacity)) },
      };
    });
  }, []);

  const resetAllPositions = useCallback(() => {
    const resetState: Record<string, WidgetGeometry> = {};
    Object.values(WIDGET_REGISTRY).forEach((def: WidgetDefinition) => {
      resetState[def.id] = {
        id: def.id,
        x: def.defaultGeometry.x,
        y: def.defaultGeometry.y,
        w: def.defaultGeometry.w,
        h: def.defaultGeometry.h,
        isCollapsed: false,
        isLocked: false,
        isHidden: !!def.defaultHidden,
        opacity: 0.95,
        zIndex: 10,
      };
    });
    setWidgets(resetState);
  }, []);

  const openContextMenu = useCallback((x: number, y: number, targetWidgetId?: string) => {
    setContextMenu({
      isOpen: true,
      x,
      y,
      targetWidgetId: targetWidgetId || null,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <WorkspaceV6Context.Provider
      value={{
        widgets,
        activeChartRegion,
        contextMenu,
        updateWidget,
        toggleWidgetVisibility,
        toggleWidgetLock,
        toggleWidgetCollapse,
        setWidgetOpacity,
        bringToFront,
        resetAllPositions,
        openContextMenu,
        closeContextMenu,
        setActiveChartRegion,
      }}
    >
      {children}
    </WorkspaceV6Context.Provider>
  );
};

export const useWorkspaceV6 = () => {
  const ctx = useContext(WorkspaceV6Context);
  if (!ctx) throw new Error('useWorkspaceV6 must be used within WorkspaceV6Provider');
  return ctx;
};
