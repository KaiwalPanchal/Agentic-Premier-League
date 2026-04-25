import React from 'react';
import type { Alert } from '../api/client';

interface CameraFeedProps {
  cameraId: string;
  streamUrl: string; // The URL for the MJPEG stream or video source
  activeAlerts: Alert[];
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ cameraId, streamUrl, activeAlerts }) => {
  const hasActiveAlert = activeAlerts.length > 0;
  
  return (
    <div style={{ position: 'relative', border: hasActiveAlert ? '4px solid red' : '4px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
      <img src={streamUrl} alt={`Feed for ${cameraId}`} style={{ width: '100%', display: 'block', backgroundColor: '#000' }} />
      
      {/* Overlay Badge */}
      <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '14px' }}>
        {cameraId}
      </div>

      {hasActiveAlert && (
        <div style={{ position: 'absolute', top: 10, right: 10, background: 'red', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', animation: 'blink 1s infinite' }}>
          🚨 ACTIVE ALERT
        </div>
      )}
      
      <style>
        {`
          @keyframes blink {
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};
