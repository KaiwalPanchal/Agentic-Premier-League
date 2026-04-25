'use client';

import { useState, useEffect, useRef } from 'react';
import { getStreamUrl } from '@/lib/api-client';

interface CameraOption {
  id: string;
  name: string;
  location: string;
}

export default function LiveCameraFeed() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedCamera, setSelectedCamera] = useState('cam-1');
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [fps, setFps] = useState(30);

  const cameras: CameraOption[] = [
    { id: 'cam-1', name: 'Camera 1', location: 'North Gate (REAL)' },
    { id: 'cam-2', name: 'Camera 2', location: 'South Gate (MOCK)' },
    { id: 'cam-3', name: 'Camera 3', location: 'East Ring (MOCK)' },
    { id: 'cam-4', name: 'Camera 4', location: 'West Ring (MOCK)' },
  ];

  const selectedCameraData = cameras.find(c => c.id === selectedCamera);
  const isRealStream = selectedCamera === 'cam-1';

  useEffect(() => {
    // Simulate alert occasionally for visual feedback if not real
    if (!isRealStream) {
      const alertInterval = setInterval(() => {
        setIsAlertActive(true);
        const alertDuration = 3000 + Math.random() * 3000;
        setTimeout(() => setIsAlertActive(false), alertDuration);
      }, 15000);
      return () => clearInterval(alertInterval);
    }
  }, [isRealStream]);

  // Mock drawing logic for other cameras
  useEffect(() => {
    if (isRealStream) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastFpsUpdate = Date.now();
    let framesSinceUpdate = 0;

    const drawFrame = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas with dark gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(0.5, '#16213e');
      gradient.addColorStop(1, '#0f3460');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Add grid pattern overlay
      ctx.strokeStyle = 'rgba(76, 175, 80, 0.1)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let i = 0; i < width; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let i = 0; i < height; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      // Camera status text
      ctx.fillStyle = '#4CAF50';
      ctx.font = '12px monospace';
      ctx.fillText('MOCK FEED', 10, 20);
      ctx.fillText(`FPS: ${fps}`, 10, 35);

      // Timestamp
      ctx.fillStyle = '#2196F3';
      const timestamp = new Date();
      const timeStr = timestamp.toLocaleTimeString('en-US', { hour12: false });
      ctx.fillText(timeStr, width - 120, height - 10);

      // Scanlines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < height; i += 2) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      framesSinceUpdate++;
      const now = Date.now();
      if (now - lastFpsUpdate > 1000) {
        setFps(framesSinceUpdate);
        framesSinceUpdate = 0;
        lastFpsUpdate = now;
      }

      animationId = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    return () => cancelAnimationFrame(animationId);
  }, [isRealStream, fps]);

  return (
    <div className="h-full bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 bg-card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-2">
              Live Feed
            </h3>
            <select
              value={selectedCamera}
              onChange={e => setSelectedCamera(e.target.value)}
              className="w-full px-2 py-1 bg-input border border-border rounded text-sm text-foreground font-mono"
            >
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id}>
                  {cam.name} - {cam.location}
                </option>
              ))}
            </select>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  isAlertActive || isRealStream ? 'bg-primary animate-pulse' : 'bg-secondary'
                }`}
              />
              <span className="text-xs font-mono text-muted-foreground">
                {isRealStream ? 'LIVE' : (isAlertActive ? 'ALERT' : 'IDLE')}
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {selectedCameraData?.location}
            </span>
          </div>
        </div>
      </div>

      {/* Feed Container */}
      <div className={`flex-1 relative overflow-hidden ${isAlertActive ? 'animate-pulse-border' : ''}`}>
        {isRealStream ? (
          <img
            src={getStreamUrl()}
            alt="Live Stream"
            className="w-full h-full object-contain bg-black"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/800x450?text=Camera+Offline";
            }}
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            className="w-full h-full object-contain"
          />
        )}
        
        {isAlertActive && (
          <div className="absolute inset-0 pointer-events-none border-2 border-primary animate-pulse" />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2 bg-card text-xs font-mono text-muted-foreground flex justify-between">
        <span>{isRealStream ? 'MJPEG REAL-TIME' : 'SIMULATED FEED'}</span>
        <span>{isRealStream ? 'BITRATE: 4.2 Mbps' : 'BITRATE: 0.0 Mbps'}</span>
      </div>
    </div>
  );
}
