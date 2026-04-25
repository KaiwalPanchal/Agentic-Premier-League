'use client';

import { useState, useEffect } from 'react';
import { useAlerts } from '@/hooks/use-alerts';
import { Alert } from '@/lib/api-client';

export default function AlertFeed() {
  const { alerts, loading, error } = useAlerts();

  const handleAcknowledge = (alertId: number) => {
    // In a real app, we would call an API to acknowledge
    // For now, we'll just handle it locally if needed, 
    // but the hook will refresh from server anyway
    console.log('Acknowledging alert', alertId);
  };

  const getAlertTypeLabel = (type: string) => {
    if (type.includes('medical')) return 'MEDICAL';
    if (type.includes('theft')) return 'THEFT';
    if (type.includes('security')) return 'SECURITY';
    return type.toUpperCase();
  };

  const getAlertTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('medical')) return 'bg-accent/20 text-accent border-accent/50';
    if (t.includes('theft')) return 'bg-destructive/20 text-destructive border-destructive/50';
    return 'bg-primary/20 text-primary border-primary/50';
  };

  const getSeverityColor = (confidence: number) => {
    if (confidence > 0.9) return '#FF4B4B'; // Critical
    if (confidence > 0.7) return '#FF9800'; // High
    if (confidence > 0.5) return '#FFC107'; // Medium
    return '#2196F3'; // Low
  };

  const getSeverityLabel = (confidence: number) => {
    if (confidence > 0.9) return 'CRITICAL';
    if (confidence > 0.7) return 'HIGH';
    if (confidence > 0.5) return 'MEDIUM';
    return 'LOW';
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="h-full bg-card border border-border rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Connecting to Alert System...</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 bg-card">
        <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
          Alert Feed
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Scrollable Alert List */}
      <div className="flex-1 overflow-y-auto space-y-2 p-3">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 p-2 rounded text-xs text-destructive mb-2">
            {error}
          </div>
        )}
        
        {alerts.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <p className="text-sm text-muted-foreground">No active alerts</p>
              <p className="text-xs text-muted-foreground mt-1">System operating normally</p>
            </div>
          </div>
        ) : (
          alerts.map(alert => (
            <div
              key={alert.id}
              className="bg-input border border-border rounded p-3 space-y-2 hover:border-primary/50 transition-colors group"
            >
              {/* Type and Severity */}
              <div className="flex items-start gap-2">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded border ${getAlertTypeColor(
                    alert.alert_type
                  )}`}
                >
                  {getAlertTypeLabel(alert.alert_type)}
                </span>
                <span
                  className="text-xs font-bold px-2 py-1 rounded border"
                  style={{
                    color: getSeverityColor(alert.confidence),
                    borderColor: getSeverityColor(alert.confidence) + '80',
                    backgroundColor: getSeverityColor(alert.confidence) + '15',
                  }}
                >
                  {getSeverityLabel(alert.confidence)}
                </span>
              </div>

              {/* Message */}
              <p className="text-sm text-foreground font-mono break-words">
                {getAlertTypeLabel(alert.alert_type)} detected at {alert.zone}
              </p>

              {/* Details */}
              <div className="text-xs text-muted-foreground space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Zone:</span>
                  <span className="text-foreground">{alert.zone}</span>
                </div>
                <div className="flex justify-between">
                  <span>Confidence:</span>
                  <span className="text-foreground">{(alert.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span className="text-foreground">
                    {new Date(alert.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </div>
              </div>

              {/* Snapshot Link */}
              {alert.snapshot_url && (
                <a 
                  href={alert.snapshot_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block text-[10px] text-primary hover:underline font-mono"
                >
                  VIEW SNAPSHOT
                </a>
              )}

              {/* Acknowledge Button */}
              <button
                onClick={() => handleAcknowledge(alert.id)}
                className="w-full mt-2 px-2 py-1 bg-primary text-primary-foreground text-xs font-mono uppercase hover:bg-primary/90 transition-colors rounded border border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Acknowledge
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
