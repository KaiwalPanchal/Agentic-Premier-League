import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export const fetchAlertHistory = async (): Promise<Alert[]> => {
  const response = await apiClient.get<Alert[]>('/alerts/history');
  return response.data;
};

export const acknowledgeAlert = async (id: number): Promise<Alert> => {
  // Assuming there's an endpoint to acknowledge an alert
  const response = await apiClient.post<Alert>(`/alerts/${id}/acknowledge`);
  return response.data;
};

export const fetchCurrentDensity = async (): Promise<Record<string, number>> => {
  // To be implemented on the backend side soon
  try {
    const response = await apiClient.get<Record<string, number>>('/crowd/current');
    return response.data;
  } catch {
    return {};
  }
};
