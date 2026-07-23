// =============================================================================
// AI Module Registry
//
// Defines every independent AI analysis module, its dependencies, and
// which overlay UI elements and chart drawings it controls.
// VisionManager skips disabled modules entirely. The overlay hides
// all UI elements associated with disabled modules.
// =============================================================================

export type AIModuleId =
  | 'trend'
  | 'supportResistance'
  | 'liquidity'
  | 'fvg'
  | 'orderBlocks'
  | 'bos'
  | 'choch'
  | 'confluence'
  | 'tradeDecision';

export interface AIModuleDefinition {
  id: AIModuleId;
  displayName: string;
  description: string;
  /** Modules that must be enabled for this module to run */
  dependsOn: AIModuleId[];
  /** Chart drawing layer IDs hidden when this module is disabled */
  affectsDrawings: string[];
  /** Overlay widget section IDs hidden when this module is disabled */
  affectsWidgets: string[];
}

export const AI_MODULE_REGISTRY: AIModuleDefinition[] = [
  {
    id: 'trend',
    displayName: 'Trend Detection',
    description: 'Detects current market trend direction and strength',
    dependsOn: [],
    affectsDrawings: ['trend_label'],
    affectsWidgets: [],
  },
  {
    id: 'supportResistance',
    displayName: 'Support & Resistance',
    description: 'Detects key support and resistance price levels',
    dependsOn: [],
    affectsDrawings: ['sr_lines'],
    affectsWidgets: ['right_panel_sr_section'],
  },
  {
    id: 'liquidity',
    displayName: 'Liquidity Zones',
    description: 'Detects liquidity pools and sweep events',
    dependsOn: [],
    affectsDrawings: ['liquidity_zones'],
    affectsWidgets: [],
  },
  {
    id: 'fvg',
    displayName: 'Fair Value Gaps',
    description: 'Detects 3-candle fair value gap imbalances',
    dependsOn: [],
    affectsDrawings: ['fvg_zones'],
    affectsWidgets: [],
  },
  {
    id: 'orderBlocks',
    displayName: 'Order Blocks',
    description: 'Detects institutional bullish and bearish order blocks',
    dependsOn: [],
    affectsDrawings: ['ob_zones'],
    affectsWidgets: [],
  },
  {
    id: 'bos',
    displayName: 'Break of Structure (BOS)',
    description: 'Detects confirmed breaks of market structure',
    dependsOn: ['trend'],
    affectsDrawings: ['bos_markers'],
    affectsWidgets: [],
  },
  {
    id: 'choch',
    displayName: 'Change of Character (CHOCH)',
    description: 'Detects character changes indicating potential trend reversal',
    dependsOn: ['trend'],
    affectsDrawings: ['choch_markers'],
    affectsWidgets: [],
  },
  {
    id: 'confluence',
    displayName: 'Confluence Engine',
    description: 'Combines all active signals into a weighted confluence score',
    dependsOn: ['trend', 'supportResistance'],
    affectsDrawings: [],
    affectsWidgets: ['right_panel_checklist'],
  },
  {
    id: 'tradeDecision',
    displayName: 'Trade Decision',
    description: 'Generates final BUY / SELL / WAIT decision from confluence',
    dependsOn: ['confluence'],
    affectsDrawings: ['entry_arrow'],
    affectsWidgets: ['left_panel', 'right_panel_reasoning', 'status_pills_signal'],
  },
];

/** Index map for O(1) lookup by module ID */
const MODULE_MAP = new Map<AIModuleId, AIModuleDefinition>(
  AI_MODULE_REGISTRY.map(m => [m.id, m]),
);

export function getModuleDefinition(id: AIModuleId): AIModuleDefinition | undefined {
  return MODULE_MAP.get(id);
}

/**
 * Given a set of enabled modules, compute the full set of modules that
 * should actually run — disabling any module that has an unmet dependency.
 *
 * Example: if 'trend' is disabled, 'bos', 'choch', 'confluence', 'tradeDecision'
 * are also effectively disabled even if the user toggled them on.
 */
export function resolveEnabledModules(
  userEnabled: Set<AIModuleId>,
): Set<AIModuleId> {
  const resolved = new Set<AIModuleId>();

  function canEnable(id: AIModuleId): boolean {
    if (!userEnabled.has(id)) return false;
    const def = MODULE_MAP.get(id);
    if (!def) return false;
    return def.dependsOn.every(dep => canEnable(dep));
  }

  for (const id of AI_MODULE_REGISTRY.map(m => m.id)) {
    if (canEnable(id)) resolved.add(id);
  }
  return resolved;
}

/**
 * Returns the IDs of modules that would become disabled if `targetId`
 * were turned off (cascade effect).
 */
export function getCascadeDisabled(targetId: AIModuleId): AIModuleId[] {
  return AI_MODULE_REGISTRY
    .filter(m => m.dependsOn.includes(targetId) || getCascadeDisabled_inner(m.id, targetId))
    .map(m => m.id);
}

function getCascadeDisabled_inner(moduleId: AIModuleId, disabledId: AIModuleId): boolean {
  const def = MODULE_MAP.get(moduleId);
  if (!def) return false;
  return def.dependsOn.some(dep => dep === disabledId || getCascadeDisabled_inner(dep, disabledId));
}

/** Default enabled modules (all on) */
export const DEFAULT_ENABLED_MODULES: Set<AIModuleId> = new Set(
  AI_MODULE_REGISTRY.map(m => m.id),
);
