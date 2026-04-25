import React from 'react';
import type { Alert } from '../api/client';

interface AlertFeedProps {
  alerts: Alert[];
  onAcknowledge: (id: number) => void;
}

export const AlertFeed: React.FC<AlertFeedProps> = ({ alerts, onAcknowledge }) => {
  const getAlertColor = (type: string) => {
    switch (type) {
      case 'medical_emergency': return '#ff4444'; // Red
      case 'theft_suspicious': return '#ffaa00'; // Orange
      case 'lost_person': return '#33b5e5'; // Blue
      case 'general_alert': return '#ffeb3b'; // Yellow
      default: return '#ccc';
    }
  };

  return (
    <div style={{ background: '#1e1e1e', color: '#fff', padding: '16px', borderRadius: '8px', height: '100%', overflowY: 'auto' }}>
      <h2 style={{ marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '8px' }}>Alert Feed</h2>
      
      {alerts.length === 0 ? (
        <p style={{ color: '#aaa' }}>No alerts recorded yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {alerts.map((alert) => (
            <li key={alert.id} style={{ 
              background: '#2d2d2d', 
              marginBottom: '12px', 
              padding: '12px', 
              borderRadius: '6px',
              borderLeft: `4px solid ${getAlertColor(alert.alert_type)}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '1.1em', textTransform: 'uppercase' }}>
                    {alert.alert_type.replace('_', ' ')}
                  </strong>
                  <span style={{ fontSize: '0.85em', color: '#aaa' }}>
                    {new Date(alert.timestamp).toLocaleString()} | Cam: {alert.camera_id} | Zone: {alert.zone}
                  </span>
                </div>
                {!alert.acknowledged ? (
                  <button 
                    onClick={() => onAcknowledge(alert.id)}
                    style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Acknowledge
                  </button>
                ) : (
                  <span style={{ color: '#4CAF50', fontSize: '0.9em' }}>✓ Ack'd</span>
                )}
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.9em' }}>
                Confidence: {(alert.confidence * 100).toFixed(1)}%
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
