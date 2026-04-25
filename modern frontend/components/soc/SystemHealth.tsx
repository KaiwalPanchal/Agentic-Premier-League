'use client';

import { useState, useEffect } from 'react';

interface CameraStatus {
  id: string;
  name: string;
  status: 'active' | 'standby' | 'offline';
}

export default function SystemHealth() {
  const [wsConnected, setWsConnected] = useState(true);
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(3);
  const [inferenceTime, setInferenceTime] = useState(145);
  const [cameras, setCameras] = useState<CameraStatus[]>([
    { id: 'cam-1', name: 'Cam 1', status: 'active' },
    { id: 'cam-2', name: 'Cam 2', status: 'active' },
    { id: 'cam-3', name: 'Cam 3', status: 'standby' },
    { id: 'cam-4', name: 'Cam 4', status: 'active' },
  ]);

  useEffect(() => {
    // Simulate inference time changes
    const inferenceInterval = setInterval(() => {
      setInferenceTime(prev => {
        const variation = Math.floor(Math.random() * 60) - 30;
        return Math.max(100, Math.min(300, prev + variation));
      });
    }, 3000);

    // Simulate occasional camera status changes
    const cameraInterval = setInterval(() => {
      setCameras(prev =>
        prev.map(cam => ({
          ...cam,
          status:
            Math.random() > 0.95
              ? cam.status === 'active'
                ? 'standby'
                : 'active'
              : cam.status,
        }))
      );
    }, 8000);

    return () => {
      clearInterval(inferenceInterval);
      clearInterval(cameraInterval);
    };
  }, []);

  const getCameraStatusColor = (status: CameraStatus['status']) => {
    switch (status) {
      case 'active':
        return 'text-secondary';
      case 'standby':
        return 'text-accent';
      case 'offline':
        return 'text-primary';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-card border-b border-border backdrop-blur-sm">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm font-mono">
          {/* WebSocket Status */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected
                  ? 'bg-secondary animate-heartbeat'
                  : 'bg-primary'
              }`}
            />
            <span className="text-muted-foreground">SYSTEM</span>
            <span className={wsConnected ? 'text-secondary' : 'text-primary'}>
              {wsConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>

          {/* Camera Status Grid */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">CAMERAS</span>
            <div className="flex gap-1">
              {cameras.map(camera => (
                <div
                  key={camera.id}
                  className="flex flex-col items-center"
                  title={`${camera.name}: ${camera.status}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${getCameraStatusColor(
                      camera.status
                    )}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* AI Inference Time */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">AI</span>
            <span className="text-foreground">{inferenceTime}ms</span>
          </div>
        </div>

        {/* Alert Count Badge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-mono">
            <span className="text-muted-foreground">ALERTS</span>
            {unacknowledgedCount > 0 ? (
              <div className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-bold animate-pulse">
                {unacknowledgedCount}
              </div>
            ) : (
              <span className="text-secondary">0</span>
            )}
          </div>

          {/* Time */}
          <div className="text-xs text-muted-foreground font-mono">
            {new Date().toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </div>
      </div>
    </div>
  );
}
