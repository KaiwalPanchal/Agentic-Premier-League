// Stadium Layout Configuration
// Defines zones, gates, and camera positions from SVG

export interface StadiumZone {
  id: string;
  name: string;
  type: 'seating' | 'gate' | 'field' | 'concourse';
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  capacity: number;
}

export interface CameraPosition {
  id: string;
  name: string;
  position: 'north' | 'south' | 'east' | 'west';
  x: number;
  y: number;
  viewRadius: number;
}

export interface StadiumConfig {
  width: number;
  height: number;
  zones: StadiumZone[];
  cameras: CameraPosition[];
  gates: StadiumZone[];
}

// Stadium configuration extracted from SVG
export const stadiumConfig: StadiumConfig = {
  width: 800,
  height: 600,
  
  zones: [
    // Seating rings/sections
    {
      id: 'north-ring',
      name: 'North Seating Ring',
      type: 'seating',
      bounds: { x: 250, y: 50, width: 300, height: 100 },
      capacity: 5000,
    },
    {
      id: 'south-ring',
      name: 'South Seating Ring',
      type: 'seating',
      bounds: { x: 250, y: 450, width: 300, height: 100 },
      capacity: 5000,
    },
    {
      id: 'east-ring',
      name: 'East Seating Ring',
      type: 'seating',
      bounds: { x: 550, y: 150, width: 100, height: 300 },
      capacity: 4000,
    },
    {
      id: 'west-ring',
      name: 'West Seating Ring',
      type: 'seating',
      bounds: { x: 150, y: 150, width: 100, height: 300 },
      capacity: 4000,
    },
    // Field
    {
      id: 'field',
      name: 'Field',
      type: 'field',
      bounds: { x: 300, y: 200, width: 200, height: 200 },
      capacity: 0,
    },
  ],

  gates: [
    {
      id: 'gate-a',
      name: 'Gate A',
      type: 'gate',
      bounds: { x: 50, y: 100, width: 50, height: 50 },
      capacity: 2000,
    },
    {
      id: 'gate-b',
      name: 'Gate B',
      type: 'gate',
      bounds: { x: 700, y: 100, width: 50, height: 50 },
      capacity: 2000,
    },
    {
      id: 'gate-c',
      name: 'Gate C',
      type: 'gate',
      bounds: { x: 700, y: 450, width: 50, height: 50 },
      capacity: 2000,
    },
    {
      id: 'gate-d',
      name: 'Gate D',
      type: 'gate',
      bounds: { x: 50, y: 450, width: 50, height: 50 },
      capacity: 2000,
    },
  ],

  cameras: [
    {
      id: 'cam-1',
      name: 'Camera 1',
      position: 'north',
      x: 400,
      y: 80,
      viewRadius: 150,
    },
    {
      id: 'cam-2',
      name: 'Camera 2',
      position: 'south',
      x: 400,
      y: 520,
      viewRadius: 150,
    },
    {
      id: 'cam-3',
      name: 'Camera 3',
      position: 'east',
      x: 650,
      y: 300,
      viewRadius: 150,
    },
    {
      id: 'cam-4',
      name: 'Camera 4',
      position: 'west',
      x: 50,
      y: 300,
      viewRadius: 150,
    },
  ],
};

// Get zone by ID
export function getZoneById(id: string): StadiumZone | undefined {
  return stadiumConfig.zones.find(z => z.id === id);
}

// Get gate by ID
export function getGateById(id: string): StadiumZone | undefined {
  return stadiumConfig.gates.find(g => g.id === id);
}

// Get camera by ID
export function getCameraById(id: string): CameraPosition | undefined {
  return stadiumConfig.cameras.find(c => c.id === id);
}

// Get all zones including gates for heatmap
export function getAllZones(): StadiumZone[] {
  return [...stadiumConfig.zones, ...stadiumConfig.gates];
}
