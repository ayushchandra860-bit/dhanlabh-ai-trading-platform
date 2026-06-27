import { useEffect, useRef, useState } from 'react';
import { api, wsUrl } from '../lib/api.js';

export function useMarketStream(symbol, timeframe) {
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const reconnectRef = useRef(null);
  const pollRef = useRef(null);
  const lastMessageRef = useRef(0);

  useEffect(() => {
    let stopped = false;
    let attempts = 0;

    async function loadFallback(mode = 'polling') {
      try {
        const next = await api.analysis(symbol, timeframe);
        if (stopped) return;
        setAnalysis(next);
        setStatus(mode);
        setError('');
      } catch (err) {
        if (stopped) return;
        setError(err.message);
        setStatus('offline');
      }
    }

    function connect() {
      if (stopped) return;
      setStatus('connecting');
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
      }
      const socket = new WebSocket(wsUrl(symbol, timeframe));
      socketRef.current = socket;
      socket.onopen = () => {
        if (socketRef.current !== socket || stopped) return;
        attempts = 0;
        setStatus('live');
        setError('');
        lastMessageRef.current = Date.now();
      };
      socket.onmessage = (event) => {
        if (socketRef.current !== socket || stopped) return;
        try {
          const message = JSON.parse(event.data);
          if (message.type !== 'analysis') return;
          lastMessageRef.current = Date.now();
          setStatus('live');
          setAnalysis(message.data);
          setError('');
        } catch {
          setError('Live stream sent an unreadable message.');
          loadFallback('live-polling');
        }
      };
      socket.onerror = () => {
        if (socketRef.current !== socket || stopped) return;
        setStatus('reconnecting');
      };
      socket.onclose = () => {
        if (socketRef.current !== socket) return;
        if (stopped) return;
        attempts += 1;
        const delay = Math.min(1500 * attempts, 9000);
        reconnectRef.current = setTimeout(connect, delay);
        if (attempts === 1) loadFallback();
      };
    }

    connect();
    const online = () => {
      attempts = 0;
      loadFallback('polling');
      connect();
    };
    const offline = () => setStatus('offline');
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    pollRef.current = setInterval(() => {
      if (stopped) return;
      const socket = socketRef.current;
      const quietFor = Date.now() - lastMessageRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        loadFallback('polling');
        return;
      }
      if (quietFor > 4500) {
        loadFallback('live-polling');
      }
    }, 3500);
    return () => {
      stopped = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      if (socketRef.current) socketRef.current.close();
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [symbol, timeframe]);

  return {
    analysis,
    status,
    error,
    refresh: () => api.analysis(symbol, timeframe).then((next) => {
      setAnalysis(next);
      setError('');
    }).catch((err) => {
      setError(err.message);
      setStatus('offline');
    })
  };
}
