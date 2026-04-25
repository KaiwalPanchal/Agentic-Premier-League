'use client';

import { useEffect, useState } from 'react';
import { useAlerts } from '@/hooks/use-alerts';
import { useDensity } from '@/hooks/use-density';

const ICONS_NORMAL = [
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234CAF50' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'%3E%3C/path%3E%3C/svg%3E`, // Shield
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234CAF50' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Ccircle cx='12' cy='12' r='3'%3E%3C/circle%3E%3C/svg%3E`, // Target
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234CAF50' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'%3E%3C/path%3E%3Ccircle cx='12' cy='13' r='4'%3E%3C/circle%3E%3C/svg%3E`, // Camera
];

const ICON_ALERT = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FF4B4B' stroke='%23FF4B4B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'%3E%3C/path%3E%3Cline x1='12' y1='9' x2='12' y2='13'%3E%3C/line%3E%3Cline x1='12' y1='17' x2='12.01' y2='17'%3E%3C/line%3E%3C/svg%3E`;
const ICON_WARNING = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/xml' viewBox='0 0 24 24' fill='%23FFC107' stroke='%23FFC107' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'%3E%3C/path%3E%3Cline x1='12' y1='9' x2='12' y2='13'%3E%3C/line%3E%3Cline x1='12' y1='17' x2='12.01' y2='17'%3E%3C/line%3E%3C/svg%3E`;

const ZONE_CAPACITIES: Record<string, number> = {
  'north-ring': 5000,
  'south-ring': 5000,
  'east-ring': 4000,
  'west-ring': 4000,
  'gate-a': 2000,
  'gate-b': 2000,
  'gate-c': 2000,
  'gate-d': 2000,
};

export default function FaviconManager() {
  const { alerts } = useAlerts();
  const { densities } = useDensity();
  const [defaultIcon] = useState(() => ICONS_NORMAL[Math.floor(Math.random() * ICONS_NORMAL.length)]);
  
  const hasActiveAlerts = alerts.length > 0 && alerts.some(a => !a.acknowledged);
  
  const highDensity = Object.entries(densities).some(([id, count]) => {
    const capacity = ZONE_CAPACITIES[id] || 5000;
    return (count / capacity) > 0.85; // Warning at 85% density
  });

  useEffect(() => {
    const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    const setIcon = (href: string) => {
      if (link) {
        link.href = href;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = href;
        document.head.appendChild(newLink);
      }
    };

    if (hasActiveAlerts) {
      setIcon(ICON_ALERT);
      document.title = `(${alerts.length}) ALERT - Stadium SOC`;
    } else if (highDensity) {
      setIcon(ICON_WARNING);
      document.title = `(!) CROWD WARNING - Stadium SOC`;
    } else {
      setIcon(defaultIcon);
      document.title = 'Stadium Security SOC';
    }
  }, [hasActiveAlerts, highDensity, alerts.length, defaultIcon]);

  return null;
}
