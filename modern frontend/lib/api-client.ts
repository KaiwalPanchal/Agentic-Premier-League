export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export interface Alert {
  id: number;
  timestamp: string;
  camera_id: string;
  alert_type: string;
  confidence: number;
  zone: string;
  snapshot_url?: string;
  acknowledged: boolean;
}

export async function fetchAlertHistory(): Promise<Alert[]> {
  const response = await fetch(`${API_BASE_URL}/alerts/history`);
  if (!response.ok) {
    throw new Error('Failed to fetch alert history');
  }
  return response.json();
}

export async function fetchCurrentDensity(): Promise<Record<string, number>> {
  const response = await fetch(`${API_BASE_URL}/crowd/current`);
  if (!response.ok) {
    throw new Error('Failed to fetch current density');
  }
  return response.json();
}

export function getStreamUrl(): string {
  return `${API_BASE_URL}/video/stream`;
}
