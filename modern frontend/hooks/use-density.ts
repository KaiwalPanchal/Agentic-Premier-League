'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchCurrentDensity } from '@/lib/api-client';

export function useDensity() {
  const [densities, setDensities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDensity = useCallback(async () => {
    try {
      const data = await fetchCurrentDensity();
      setDensities(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load density', err);
      // Don't set error state to avoid UI flicker if it's just a transient failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDensity();
    const interval = setInterval(loadDensity, 3000);
    return () => clearInterval(interval);
  }, [loadDensity]);

  return { densities, loading, error };
}
