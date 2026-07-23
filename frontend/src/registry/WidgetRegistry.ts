import React from 'react';

export interface WidgetDefinition {
  id: string;
  title: string;
  icon: string;
  defaultGeometry: { x: number; y: number; w: number; h: number };
  minSize: { w: number; h: number };
  defaultHidden?: boolean;
}

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  'ai-signal': {
    id: 'ai-signal',
    title: 'AI SIGNAL',
    icon: 'zap',
    defaultGeometry: { x: 24, y: 24, w: 280, h: 320 },
    minSize: { w: 240, h: 260 },
    defaultHidden: false,
  },
  'market': {
    id: 'market',
    title: 'MARKET',
    icon: 'bar-chart-2',
    defaultGeometry: { x: 1040, y: 24, w: 290, h: 260 },
    minSize: { w: 250, h: 220 },
    defaultHidden: false,
  },
  'trade-log': {
    id: 'trade-log',
    title: 'TRADE LOG',
    icon: 'history',
    defaultGeometry: { x: 24, y: 480, w: 320, h: 240 },
    minSize: { w: 260, h: 180 },
    defaultHidden: true, // Hidden by default as requested
  },
};
