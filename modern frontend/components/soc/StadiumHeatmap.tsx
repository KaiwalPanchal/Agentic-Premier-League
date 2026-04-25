'use client';

import { useEffect, useRef, useState } from 'react';
import { CrowdDensity, getDensityColor } from '@/lib/mock-data';
import { getAllZones } from '@/lib/stadium-config';

interface StadiumHeatmapProps {
  densities: CrowdDensity[];
  selectedZone?: string;
  onZoneSelect?: (zoneId: string) => void;
}

export default function StadiumHeatmap({
  densities,
  selectedZone,
  onZoneSelect,
}: StadiumHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const zones = getAllZones();

  const getDensityForZone = (zoneId: string): CrowdDensity | undefined => {
    return densities.find(d => d.zoneId === zoneId);
  };

  const handleZoneClick = (zoneId: string) => {
    onZoneSelect?.(zoneId);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Title */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
          Stadium Heatmap
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Real-time crowd density visualization
        </p>
      </div>

      {/* SVG Heatmap Container */}
      <div className="flex-1 overflow-auto bg-black/20 flex items-center justify-center p-4">
        <svg
          ref={svgRef}
          viewBox="0 0 800 600"
          className="w-full h-full max-w-full max-h-full"
          style={{ aspectRatio: '800/600' }}
        >
          {/* Background */}
          <rect width="800" height="600" fill="#1a1a2e" />

          {/* Grid pattern */}
          <defs>
            <pattern
              id="grid"
              width="50"
              height="50"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="rgba(76, 175, 80, 0.05)"
                strokeWidth="1"
              />
            </pattern>

            {/* Gradient for zone fills */}
            <linearGradient id="heatGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2196F3" />
              <stop offset="50%" stopColor="#FFC107" />
              <stop offset="100%" stopColor="#FF4B4B" />
            </linearGradient>
          </defs>

          {/* Grid */}
          <rect width="800" height="600" fill="url(#grid)" />

          {/* Seating Zones */}
          {zones.map(zone => {
            const density = getDensityForZone(zone.id);
            const densityPercent = density?.density ?? 0;
            const color = getDensityColor(densityPercent);
            const isSelected = selectedZone === zone.id;
            const isHovered = hoveredZone === zone.id;

            return (
              <g
                key={zone.id}
                onClick={() => handleZoneClick(zone.id)}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                className="cursor-pointer transition-opacity"
              >
                {/* Zone Rect */}
                <rect
                  x={zone.bounds.x}
                  y={zone.bounds.y}
                  width={zone.bounds.width}
                  height={zone.bounds.height}
                  fill={color}
                  opacity={0.6}
                  stroke={
                    isSelected
                      ? '#FF4B4B'
                      : isHovered
                        ? '#FFC107'
                        : 'rgba(100, 100, 100, 0.3)'
                  }
                  strokeWidth={isSelected || isHovered ? 2 : 1}
                  rx="4"
                />

                {/* Zone Label */}
                {isHovered || isSelected ? (
                  <g>
                    <text
                      x={zone.bounds.x + zone.bounds.width / 2}
                      y={zone.bounds.y + zone.bounds.height / 2 - 10}
                      textAnchor="middle"
                      fill={color}
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="monospace"
                      pointerEvents="none"
                    >
                      {zone.name.split(' ')[0]}
                    </text>
                    {density && (
                      <text
                        x={zone.bounds.x + zone.bounds.width / 2}
                        y={zone.bounds.y + zone.bounds.height / 2 + 5}
                        textAnchor="middle"
                        fill={color}
                        fontSize="11"
                        fontFamily="monospace"
                        pointerEvents="none"
                      >
                        {density.density.toFixed(0)}%
                      </text>
                    )}
                    {density && (
                      <text
                        x={zone.bounds.x + zone.bounds.width / 2}
                        y={zone.bounds.y + zone.bounds.height / 2 + 18}
                        textAnchor="middle"
                        fill={color}
                        fontSize="10"
                        fontFamily="monospace"
                        pointerEvents="none"
                      >
                        {density.current}/{density.capacity}
                      </text>
                    )}
                  </g>
                ) : null}
              </g>
            );
          })}

          {/* Watermark */}
          <text
            x="400"
            y="30"
            textAnchor="middle"
            fill="rgba(255, 75, 75, 0.2)"
            fontSize="16"
            fontWeight="bold"
            fontFamily="monospace"
            pointerEvents="none"
          >
            STADIUM SURVEILLANCE
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="border-t border-border px-4 py-3 bg-card">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#2196F3' }} />
              <span className="text-muted-foreground">0-25%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FFC107' }} />
              <span className="text-muted-foreground">25-50%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FF9800' }} />
              <span className="text-muted-foreground">50-75%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FF4B4B' }} />
              <span className="text-muted-foreground">75-100%</span>
            </div>
          </div>
          <span className="text-muted-foreground">Click zone for details</span>
        </div>
      </div>
    </div>
  );
}
