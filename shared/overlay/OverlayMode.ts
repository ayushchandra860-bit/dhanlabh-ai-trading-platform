// =============================================================================
// OverlayMode — Four visibility modes for the overlay.
// The active mode is set from the Control Panel or via hotkey.
// The Layout Engine skips placement for panels hidden by the active mode.
// The Rendering Engine skips drawing layers below the mode's priority floor.
// =============================================================================

export type OverlayModeId = 'minimal' | 'normal' | 'advanced' | 'debug';

export interface OverlayModeDefinition {
  id: OverlayModeId;
  displayName: string;
  /** Short description shown in Control Panel */
  description: string;
  /** Show the left AI signal panel */
  showLeftPanel: boolean;
  /** Show the right analysis panel */
  showRightPanel: boolean;
  /** Show the bottom history panel */
  showBottomPanel: boolean;
  /** Always true — status pills are never hidden */
  showStatusPills: boolean;
  /**
   * Only render chart drawing layers with priority >= this value.
   * See Drawing Priority System in the implementation plan.
   *   1 = all drawings
   *   2 = S&R and above (hides liquidity / FVG / OB in busy modes)
   *   3 = entry arrow and above
   *   4 = signal badge and above (only the most critical)
   */
  chartDrawingMinPriority: number;
  /** Show debug overlay (chartRect border, zone grid, FPS, confidence) */
  showDebugOverlay: boolean;
  /** Whether panels can be dragged (lock/unlock interaction visible) */
  panelDragEnabled: boolean;
}

export const OVERLAY_MODES: Record<OverlayModeId, OverlayModeDefinition> = {
  minimal: {
    id: 'minimal',
    displayName: 'Minimal',
    description: 'Status pills and signal badge only. Maximum chart visibility.',
    showLeftPanel:          false,
    showRightPanel:         false,
    showBottomPanel:        false,
    showStatusPills:        true,
    chartDrawingMinPriority: 4,
    showDebugOverlay:       false,
    panelDragEnabled:       false,
  },
  normal: {
    id: 'normal',
    displayName: 'Normal',
    description: 'Signal panel + status pills. Clean chart view.',
    showLeftPanel:          true,
    showRightPanel:         false,
    showBottomPanel:        false,
    showStatusPills:        true,
    chartDrawingMinPriority: 3,
    showDebugOverlay:       false,
    panelDragEnabled:       false,
  },
  advanced: {
    id: 'advanced',
    displayName: 'Advanced',
    description: 'All panels + full chart drawings. Complete AI analysis visible.',
    showLeftPanel:          true,
    showRightPanel:         true,
    showBottomPanel:        true,
    showStatusPills:        true,
    chartDrawingMinPriority: 2,
    showDebugOverlay:       false,
    panelDragEnabled:       true,
  },
  debug: {
    id: 'debug',
    displayName: 'Debug',
    description: 'All panels + debug overlay: chartRect, zones, FPS, confidence.',
    showLeftPanel:          true,
    showRightPanel:         true,
    showBottomPanel:        true,
    showStatusPills:        true,
    chartDrawingMinPriority: 1,
    showDebugOverlay:       true,
    panelDragEnabled:       true,
  },
};

/** Ordered list of modes for cycling via hotkey */
export const MODE_CYCLE_ORDER: OverlayModeId[] = ['minimal', 'normal', 'advanced', 'debug'];

export const DEFAULT_OVERLAY_MODE: OverlayModeId = 'normal';

/** Returns the next mode in the hotkey cycle */
export function cycleMode(current: OverlayModeId): OverlayModeId {
  const idx = MODE_CYCLE_ORDER.indexOf(current);
  return MODE_CYCLE_ORDER[(idx + 1) % MODE_CYCLE_ORDER.length];
}
