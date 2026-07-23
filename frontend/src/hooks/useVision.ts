import { useState, useEffect } from 'react';

export const useVision = () => {
  const [visionResult, setVisionResult] = useState<any | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [aiState, setAiState] = useState('OFF');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let unsubscribeStatus: (() => void) | undefined;
    if ((window as any).electronAPI && (window as any).electronAPI.vision) {
      unsubscribe = (window as any).electronAPI.vision.onResultUpdate((result: any) => {
        setVisionResult(result);
      });
    }
    if ((window as any).electronAPI?.ai) {
      (window as any).electronAPI.ai.status().then((status: any) => {
        setIsActive(!!status?.running);
        setAiState(status?.state ?? 'OFF');
      });
      unsubscribeStatus = (window as any).electronAPI.ai.onStatusChange?.((status: any) => {
        setIsActive(!!status?.running);
        setAiState(status?.state ?? 'OFF');
      });
    }
    return () => {
      unsubscribe?.();
      unsubscribeStatus?.();
    };
  }, []);

  const startVision = async () => {
    if ((window as any).electronAPI?.ai) {
      const status = await (window as any).electronAPI.ai.start();
      setIsActive(!!status?.running);
      setAiState(status?.state ?? 'RUNNING');
    }
  };

  const stopVision = async () => {
    if ((window as any).electronAPI?.ai) {
      const status = await (window as any).electronAPI.ai.stop();
      setIsActive(!!status?.running);
      setAiState(status?.state ?? 'OFF');
    }
  };

  return { visionResult, isActive, aiState, startVision, stopVision };
};
