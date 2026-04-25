'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  generateHistoricalGateFlow,
  CrowdDensity,
} from '@/lib/mock-data';
import StadiumHeatmap from './StadiumHeatmap';
import { useDensity } from '@/hooks/use-density';

const ZONE_CAPACITIES: Record<string, { name: string, capacity: number }> = {
  'north-ring': { name: 'North Ring', capacity: 5000 },
  'south-ring': { name: 'South Ring', capacity: 5000 },
  'east-ring': { name: 'East Ring', capacity: 4000 },
  'west-ring': { name: 'West Ring', capacity: 4000 },
  'gate-a': { name: 'Gate A Area', capacity: 2000 },
  'gate-b': { name: 'Gate B Area', capacity: 2000 },
  'gate-c': { name: 'Gate C Area', capacity: 2000 },
  'gate-d': { name: 'Gate D Area', capacity: 2000 },
};

export default function CrowdAnalytics() {
  const { densities: apiDensities } = useDensity();
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // Map API densities to frontend CrowdDensity objects
  const densities = useMemo(() => {
    return Object.entries(ZONE_CAPACITIES).map(([id, info]) => {
      const current = apiDensities[id] || 0;
      return {
        zoneId: id,
        zoneName: info.name,
        current: current,
        capacity: info.capacity,
        density: (current / info.capacity) * 100,
        timestamp: new Date(),
      };
    });
  }, [apiDensities]);

  useEffect(() => {
    setChartData(generateHistoricalGateFlow());

    // Update chart data every 10 seconds (still using mock for flow history for now)
    const chartInterval = setInterval(() => {
      setChartData(prev => {
        const newData = [...prev.slice(1), generateHistoricalGateFlow(1)[0]];
        return newData;
      });
    }, 10000);

    return () => {
      clearInterval(chartInterval);
    };
  }, []);

  const selectedZoneData = densities.find(d => d.zoneId === selectedZone);

  return (
    <div className="h-full bg-card border border-border rounded-lg overflow-hidden flex flex-col">
...
      <div className="flex flex-col lg:flex-row gap-4 h-full">
        {/* Heatmap - Left Side */}
        <div className="lg:w-1/2 flex flex-col">
          <StadiumHeatmap
            densities={densities}
            selectedZone={selectedZone || undefined}
            onZoneSelect={setSelectedZone}
          />
        </div>

        {/* Flow Chart & Stats - Right Side */}
        <div className="lg:w-1/2 flex flex-col border-l border-border">
          {/* Header */}
          <div className="border-b border-border px-4 py-3 bg-card">
            <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
              Gate Flow Analysis
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Entry/Exit trends (last 60 minutes)
            </p>
          </div>

          {/* Zone Details */}
          {selectedZoneData && (
            <div className="border-b border-border px-4 py-3 bg-input text-xs font-mono space-y-1">
              <div className="font-bold text-foreground">{selectedZoneData.zoneName}</div>
              <div className="flex justify-between text-muted-foreground">
                <span>Occupancy:</span>
                <span className="text-foreground">
                  {selectedZoneData.current}/{selectedZoneData.capacity}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Density:</span>
                <span className="text-foreground">
                  {selectedZoneData.density.toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="flex-1 overflow-auto">
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 100, 100, 0.2)" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: 'rgba(232, 232, 232, 0.6)', fontSize: 12 }}
                  stroke="rgba(100, 100, 100, 0.2)"
                  style={{ fontSize: '11px', fontFamily: 'monospace' }}
                />
                <YAxis
                  tick={{ fill: 'rgba(232, 232, 232, 0.6)', fontSize: 12 }}
                  stroke="rgba(100, 100, 100, 0.2)"
                  style={{ fontSize: '11px', fontFamily: 'monospace' }}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a2e',
                    border: '1px solid rgba(255, 75, 75, 0.5)',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                  }}
                  labelStyle={{ color: '#e8e8e8' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                  iconType="line"
                />
                <Line
                  type="monotone"
                  dataKey="gateA"
                  stroke="#2196F3"
                  dot={false}
                  strokeWidth={2}
                  name="Gate A"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="gateB"
                  stroke="#4CAF50"
                  dot={false}
                  strokeWidth={2}
                  name="Gate B"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="gateC"
                  stroke="#FFC107"
                  dot={false}
                  strokeWidth={2}
                  name="Gate C"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="gateD"
                  stroke="#FF4B4B"
                  dot={false}
                  strokeWidth={2}
                  name="Gate D"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gate Stats */}
          <div className="border-t border-border px-4 py-3 bg-input">
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {densities
                .filter(d => d.zoneId.startsWith('gate-'))
                .map(gate => (
                  <div
                    key={gate.zoneId}
                    className="flex justify-between text-muted-foreground"
                  >
                    <span>{gate.zoneName}:</span>
                    <span className="text-foreground">
                      {gate.current} / {gate.capacity}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
