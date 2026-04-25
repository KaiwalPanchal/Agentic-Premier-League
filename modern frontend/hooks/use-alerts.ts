'use client';

import { useState, useEffect, useCallback } from 'react';
import { Alert, fetchAlertHistory, WS_BASE_URL } from '@/lib/api-client';

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const history = await fetchAlertHistory();
      setAlerts(history);
      setError(null);
    } catch (err) {
      setError('Failed to load alert history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();

    const ws = new WebSocket(`${WS_BASE_URL}/alerts/ws`);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'NEW_ALERT') {
          setAlerts((prev) => [message.data, ...prev].slice(0, 100));
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error', err);
    };

    return () => {
      ws.close();
    };
  }, [loadHistory]);

  return { alerts, loading, error, refresh: loadHistory };
}
