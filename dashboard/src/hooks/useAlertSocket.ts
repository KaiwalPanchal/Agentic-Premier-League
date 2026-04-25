import { useState, useEffect } from 'react';
import type { Alert } from '../api/client';

export const useAlertSocket = (url: string = 'ws://localhost:8000/alerts/ws') => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Connected to alert websocket');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'NEW_ALERT') {
          setAlerts((prev) => [payload.data, ...prev]);
        }
      } catch (err) {
        console.error('Error parsing websocket message', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from alert websocket');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  return { alerts, setAlerts, isConnected };
};
