import React, { useEffect, useState } from 'react';
import { fetchCurrentDensity } from '../api/client';

interface VenueHeatmapProps {
  floorplanUrl: string;
}

export const VenueHeatmap: React.FC<VenueHeatmapProps> = ({ floorplanUrl }) => {
  const [density, setDensity] = useState<Record<string, number>>({});

  useEffect(() => {
    // Poll density every 5 seconds
    const interval = setInterval(async () => {
      const currentDensity = await fetchCurrentDensity();
      setDensity(currentDensity);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getColorForDensity = (count: number) => {
    if (count > 40) return 'rgba(255, 0, 0, 0.4)'; // Red (Crowded)
    if (count > 20) return 'rgba(255, 255, 0, 0.4)'; // Yellow
    return 'rgba(0, 255, 0, 0.4)'; // Green (Clear)
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '300px', background: '#1e1e1e', borderRadius: '8px', overflow: 'hidden' }}>
      <h3 style={{ position: 'absolute', top: 10, left: 10, margin: 0, zIndex: 10, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px' }}>Venue Heatmap</h3>
      
      {floorplanUrl ? (
        <img src={floorplanUrl} alt="Venue Map" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
          No floorplan loaded
        </div>
      )}

      {/* SVG Overlay for zones - hardcoded example zones for MVP */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {/* Example Zone A1 */}
        <polygon 
          points="10%,10% 40%,10% 40%,40% 10%,40%" 
          fill={getColorForDensity(density['A1'] || 0)} 
          stroke="white" strokeWidth="1" 
        />
        {/* Example Zone A2 */}
        <polygon 
          points="60%,10% 90%,10% 90%,40% 60%,40%" 
          fill={getColorForDensity(density['A2'] || 15)} 
          stroke="white" strokeWidth="1" 
        />
      </svg>
    </div>
  );
};
