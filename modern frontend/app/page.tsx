'use client';

import { useState, useEffect } from 'react';
import LiveCameraFeed from '@/components/soc/LiveCameraFeed';
import AlertFeed from '@/components/soc/AlertFeed';
import CrowdAnalytics from '@/components/soc/CrowdAnalytics';
import SystemHealth from '@/components/soc/SystemHealth';

export default function SOCDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* System Health Bar */}
      <SystemHealth />

      {/* Main Dashboard Grid */}
      <div className="p-4 gap-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 auto-rows-[400px] lg:auto-rows-[500px]">
        {/* Live Camera Feed - Top Left */}
        <div className="lg:col-span-1 xl:col-span-2 2xl:col-span-2">
          <LiveCameraFeed />
        </div>

        {/* Alert Feed - Top Right */}
        <div className="lg:col-span-1 xl:col-span-1 2xl:col-span-1">
          <AlertFeed />
        </div>

        {/* Crowd Analytics - Bottom Left & Center */}
        <div className="lg:col-span-2 xl:col-span-2 2xl:col-span-2 lg:auto-rows-[600px]">
          <CrowdAnalytics />
        </div>

        {/* Additional Alerts/Status - Bottom Right (optional) */}
        <div className="lg:col-span-1 xl:col-span-1 2xl:col-span-1 bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">
            Status Overview
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">System Status</span>
              <span className="text-secondary animate-heartbeat">● OPERATIONAL</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Recording</span>
              <span className="text-primary">● ACTIVE</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total Capacity</span>
              <span className="font-mono">22,000</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Current Occupancy</span>
              <span className="font-mono">65%</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
