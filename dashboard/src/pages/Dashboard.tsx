import React, { useEffect, useState } from 'react';
import { CameraFeed } from '../components/CameraFeed';
import { VenueHeatmap } from '../components/VenueHeatmap';
import { AlertFeed } from '../components/AlertFeed';
import { EntryExitCounter } from '../components/EntryExitCounter';
import { useAlertSocket } from '../hooks/useAlertSocket';
import { fetchAlertHistory, acknowledgeAlert } from '../api/client';

export const Dashboard: React.FC = () => {
  const { alerts, setAlerts, isConnected } = useAlertSocket();

  // Mock data for the chart
  const [chartData] = useState([
    { time: '10:00', entry: 10, exit: 2 },
    { time: '10:10', entry: 45, exit: 5 },
    { time: '10:20', entry: 80, exit: 15 },
    { time: '10:30', entry: 120, exit: 30 },
    { time: '10:40', entry: 150, exit: 50 },
  ]);

  useEffect(() => {
    // Load initial history
    fetchAlertHistory().then(history => {
      setAlerts(history);
    }).catch(console.error);
  }, [setAlerts]);

  const handleAcknowledge = async (id: number) => {
    try {
      await acknowledgeAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    } catch (error) {
      console.error('Failed to acknowledge alert', error);
      // For demo purposes, optimistically update UI even if backend isn't fully ready
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    }
  };

  // Filter unacknowledged alerts for the camera badge
  const activeAlerts = alerts.filter(a => !a.acknowledged);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#121212', color: '#fff', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        <h1 style={{ margin: 0 }}>Agentic Premier League - Security Ops</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: isConnected ? '#4CAF50' : '#f44336' }} />
          <span>{isConnected ? 'Live' : 'Disconnected'}</span>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', height: 'calc(100vh - 100px)' }}>
        
        {/* Left Column: Visuals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ flex: '1 1 auto' }}>
            <CameraFeed 
              cameraId="cam_01" 
              streamUrl="https://upload.wikimedia.org/wikipedia/commons/b/b4/JPEG_example_flower.jpg" // Placeholder for MJPEG stream
              activeAlerts={activeAlerts.filter(a => a.camera_id === 'cam_01')} 
            />
          </div>
          
          <div style={{ flex: '1 1 auto' }}>
            <VenueHeatmap floorplanUrl="" />
          </div>
          
        </div>

        {/* Right Column: Feeds & Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ flex: '1 1 auto', overflow: 'hidden' }}>
            <AlertFeed alerts={alerts} onAcknowledge={handleAcknowledge} />
          </div>
          
          <div style={{ flex: '0 0 300px' }}>
            <EntryExitCounter data={chartData} />
          </div>
          
        </div>
      </div>
    </div>
  );
};
