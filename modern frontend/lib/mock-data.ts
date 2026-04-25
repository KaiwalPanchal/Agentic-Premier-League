// Mock data generators for SOC Dashboard

export interface Alert {
  id: string;
  type: 'security' | 'medical' | 'theft';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  location: string;
  confidence: number; // 0-100
  acknowledged: boolean;
  details?: string;
}

export interface CrowdDensity {
  zoneId: string;
  zoneName: string;
  current: number;
  capacity: number;
  density: number; // 0-100
  timestamp: Date;
}

export interface GateFlow {
  gateId: string;
  gateName: string;
  entriesPerMinute: number;
  exitsPerMinute: number;
  timestamp: Date;
}

// Alert type descriptions
const alertMessages = {
  security: [
    'Suspicious activity detected near Gate A',
    'Unauthorized person in restricted area',
    'Package left unattended in concourse',
    'Crowd surge detected in North section',
    'Security perimeter breach attempt',
  ],
  medical: [
    'Medical emergency in East seating',
    'First aid requested at Gate B',
    'Multiple casualties reported',
    'Person collapsed in concourse',
    'Medical team needed at Field',
  ],
  theft: [
    'Pickpocketing incident in South ring',
    'Stolen merchandise reported',
    'Bag theft in East concourse',
    'Unauthorized item removal detected',
    'Vendor theft in North gate',
  ],
};

export function generateMockAlert(): Alert {
  const types = ['security', 'medical', 'theft'] as const;
  const severities = ['low', 'medium', 'high', 'critical'] as const;
  const locations = [
    'North Ring',
    'South Ring',
    'East Ring',
    'West Ring',
    'Gate A',
    'Gate B',
    'Gate C',
    'Gate D',
    'Field',
    'Concourse',
  ];

  const type = types[Math.floor(Math.random() * types.length)];
  const severity = severities[Math.floor(Math.random() * severities.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];
  const messages = alertMessages[type];
  const message = messages[Math.floor(Math.random() * messages.length)];

  return {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    severity,
    message,
    timestamp: new Date(),
    location,
    confidence: Math.floor(Math.random() * 40) + 60, // 60-100
    acknowledged: false,
  };
}

export function generateMockCrowdDensity(): CrowdDensity[] {
  const zones = [
    { id: 'north-ring', name: 'North Ring', capacity: 5000 },
    { id: 'south-ring', name: 'South Ring', capacity: 5000 },
    { id: 'east-ring', name: 'East Ring', capacity: 4000 },
    { id: 'west-ring', name: 'West Ring', capacity: 4000 },
    { id: 'gate-a', name: 'Gate A Area', capacity: 2000 },
    { id: 'gate-b', name: 'Gate B Area', capacity: 2000 },
    { id: 'gate-c', name: 'Gate C Area', capacity: 2000 },
    { id: 'gate-d', name: 'Gate D Area', capacity: 2000 },
  ];

  return zones.map(zone => {
    // Simulate realistic crowd patterns with variation
    const baseLoad = Math.random() * 0.7; // Base occupancy 0-70%
    const variation = Math.sin(Date.now() / 30000) * 0.15; // Slow oscillation
    const current = Math.floor(zone.capacity * (baseLoad + variation));
    const density = (current / zone.capacity) * 100;

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      current: Math.max(0, current),
      capacity: zone.capacity,
      density: Math.max(0, Math.min(100, density)),
      timestamp: new Date(),
    };
  });
}

export function generateMockGateFlow(): GateFlow[] {
  const gates = [
    { id: 'gate-a', name: 'Gate A' },
    { id: 'gate-b', name: 'Gate B' },
    { id: 'gate-c', name: 'Gate C' },
    { id: 'gate-d', name: 'Gate D' },
  ];

  return gates.map(gate => ({
    gateId: gate.id,
    gateName: gate.name,
    entriesPerMinute: Math.floor(Math.random() * 100) + 20,
    exitsPerMinute: Math.floor(Math.random() * 80) + 10,
    timestamp: new Date(),
  }));
}

// Generate historical gate flow data for charts
export function generateHistoricalGateFlow(minutes: number = 60) {
  const data = [];
  const now = Date.now();
  
  for (let i = minutes; i >= 0; i--) {
    const time = new Date(now - i * 60000);
    const timeStr = time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    data.push({
      time: timeStr,
      gateA: Math.floor(Math.random() * 100) + 30,
      gateB: Math.floor(Math.random() * 90) + 35,
      gateC: Math.floor(Math.random() * 80) + 40,
      gateD: Math.floor(Math.random() * 95) + 25,
    });
  }
  
  return data;
}

export function getDensityColor(density: number): string {
  if (density < 25) return '#2196F3'; // Blue - low
  if (density < 50) return '#FFC107'; // Amber - medium
  if (density < 75) return '#FF9800'; // Orange - high
  return '#FF4B4B'; // Red - critical
}

export function getSeverityColor(severity: Alert['severity']): string {
  switch (severity) {
    case 'low':
      return '#2196F3'; // Blue
    case 'medium':
      return '#FFC107'; // Amber
    case 'high':
      return '#FF9800'; // Orange
    case 'critical':
      return '#FF4B4B'; // Red
  }
}
