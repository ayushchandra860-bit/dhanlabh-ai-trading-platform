import { useState, useEffect, useRef, useCallback } from 'react';


interface OverlayDataState {
  visionResult: any | null;
  windowState:  any | null;

  isAIActive: boolean;
  aiStatus: string;
  signalHistory: SignalHistoryEntry[];
}

export interface SignalHistoryEntry {
  time:       string;
  signal:     'BUY' | 'SELL' | 'WAIT';
  confidence: number;
  id:         string;
  outcome?:   'WIN' | 'LOSS' | 'WAITING';
  expiry?:    string;
}

const MAX_HISTORY = 20;

/**
 * useOverlayData — single hook for the overlay renderer.
 *
 * Subscribes to:
 *  - overlay:onVisionResult   (vision analysis results)
 *  - overlay:onWindowState    (broker window bounds)

 *
 * Returns combined state + signal history.
 * Exactly ONE listener per IPC channel registered — cleaned up on unmount.
 */
export function useOverlayData(): OverlayDataState {
  const [visionResult, setVisionResult]     = useState<any | null>(null);
  const [windowState,  setWindowState]      = useState<any | null>(null);

  const [isAIActive, setIsAIActive] = useState(false);
  const [aiStatus, setAiStatus] = useState('OFF');
  const [signalHistory, setSignalHistory]   = useState<SignalHistoryEntry[]>([]);

  const lastSignalRef = useRef<string | null>(null);

  const handleVisionResult = useCallback((result: any) => {
    setVisionResult(result);

    // Append to signal history when decision changes
    const decision = result?.aiDecisionData ?? result?.decision;
    const sig = decision?.signal;
    if (sig && sig !== lastSignalRef.current) {
      lastSignalRef.current = sig;
      if (sig === 'BUY' || sig === 'SELL' || sig === 'WAIT') {
        const entry: SignalHistoryEntry = {
          id:         `${Date.now()}`,
          time:       new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          signal:     sig,
          confidence: decision.confidence ?? 0,
        };
        setSignalHistory(prev => [entry, ...prev].slice(0, MAX_HISTORY));
      }
    }
  }, []);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.overlay) return;

    const unsubVision   = api.overlay.onVisionResult?.(handleVisionResult);
    const unsubWindow   = api.overlay.onWindowState?.((s: any) => setWindowState(s));

    const unsubStatus = api.ai?.onStatusChange?.((status: any) => { setIsAIActive(!!status?.running); setAiStatus(status?.state || 'OFF'); });

    // Fetch initial states immediately upon mounting
    api.ai?.status?.().then((status: any) => { setIsAIActive(!!status?.running); setAiStatus(status?.state || 'OFF'); });
    api.windowTracking?.getCurrentState?.().then((s: any) => setWindowState(s));


    return () => {
      unsubVision?.();
      unsubWindow?.();

      unsubStatus?.();
    };
  }, [handleVisionResult]);

  return { visionResult, windowState, isAIActive, aiStatus, signalHistory };
}
