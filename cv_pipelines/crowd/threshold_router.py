import time
import requests
import os
from datetime import datetime

class CrowdThresholdRouter:
    """
    Monitors zone densities and dwell times.
    Sends alerts to backend if thresholds are breached.
    """
    def __init__(self, api_url=None, density_url=None, camera_id="cam_01"):
        base_url = os.environ.get("BACKEND_URL", "http://localhost:8000").rstrip("/")
        self.api_url = api_url or f"{base_url}/alerts/ingest"
        self.density_url = density_url or f"{base_url}/crowd/density"
        self.camera_id = camera_id
        
        self.zone_limits = {"A1": 5} # Default test limit
        
        # For dwell time tracking
        # We track when a zone first exceeded its limit
        self.zone_over_capacity_since = {}
        # Dwell limit before firing a dwell alert (in seconds)
        self.dwell_limit_seconds = 10 
        
        # Cooldown to prevent spamming alerts
        self.last_alert_time = {}

    def set_zone_limit(self, zone_id, limit):
        self.zone_limits[zone_id] = limit

    def update_density(self, zone_counts, frame=None):
        """
        Called every frame/interval with new {zone_id: count}
        """
        now = time.time()
        
        # 1. Optionally post regular density updates to the backend
        # In a real setup, we might batch these or send every X seconds
        
        # 2. Check thresholds
        for zone_id, count in zone_counts.items():
            limit = self.zone_limits.get(zone_id, 9999)
            
            if count > limit:
                # Zone is over capacity
                if zone_id not in self.zone_over_capacity_since:
                    self.zone_over_capacity_since[zone_id] = now
                    
                # Have we dwelled too long?
                dwell_duration = now - self.zone_over_capacity_since[zone_id]
                
                # Check cooldown (e.g. max 1 alert per 30 seconds for this zone)
                time_since_last = now - self.last_alert_time.get(zone_id, 0)
                
                if time_since_last > 30:
                    if dwell_duration > self.dwell_limit_seconds:
                        self._fire_alert("dwell_overcrowding", zone_id, count)
                        self.last_alert_time[zone_id] = now
                    else:
                        # Instant overcrowd alert
                        self._fire_alert("instant_overcrowding", zone_id, count)
                        self.last_alert_time[zone_id] = now
            else:
                # Reset if below capacity
                if zone_id in self.zone_over_capacity_since:
                    del self.zone_over_capacity_since[zone_id]

    def _fire_alert(self, alert_type, zone, count):
        print(f"\n>>> 🚨 CROWD ALERT: {alert_type} in {zone} (Count: {count}) 🚨 <<<\n")
        
        payload = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "camera_id": self.camera_id,
            "alert_type": alert_type,
            "confidence": 1.0,
            "zone": zone,
            "snapshot_url": None # Could save and attach frame here
        }
        
        try:
            requests.post(self.api_url, json=payload, timeout=2.0)
        except requests.exceptions.RequestException:
            pass


# Standalone runner for Phase 2
if __name__ == "__main__":
    import cv2
    from detector import CrowdDetector
    from zone_mapper import ZoneMapper
    from tracker import CrowdTracker
    import sys
    import os
    
    # Allow importing frame_capture from the gesture pipeline
    sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'gesture'))
    from frame_capture import stream_frames
    import queue
    import threading

    print("Initializing Crowd Pipeline...")
    # Using tracking for visualization, detector can be used separately if only density is needed
    tracker = CrowdTracker()
    zone_mapper = ZoneMapper()
    router = CrowdThresholdRouter()
    
    # Add a mock tripwire for testing (vertical line roughly in the middle)
    tracker.add_tripwire("main_door", (320, 0), (320, 480))
    
    # Start stream
    cap = cv2.VideoCapture(0)
    
    print("Running Crowd Pipeline... Press 'q' to quit.")
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            # 1. Run Tracker
            annotated_frame, tracked_objs = tracker.track(frame)
            
            # 2. Map Centroids to Zones
            centroids = [obj["centroid"] for obj in tracked_objs]
            zone_counts = zone_mapper.map_centroids(centroids)
            
            # 3. Route to Threshold logic
            router.update_density(zone_counts, frame)
            
            # 4. Visualization
            annotated_frame = zone_mapper.draw_zones(annotated_frame, zone_counts)
            
            # Draw Tripwire
            for w_id, wire in tracker.tripwires.items():
                pt1, pt2 = tuple(wire["pt1"]), tuple(wire["pt2"])
                cv2.line(annotated_frame, pt1, pt2, (0, 0, 255), 3)
                cv2.putText(annotated_frame, f"{w_id} - IN: {wire['entries']} OUT: {wire['exits']}", 
                            (pt1[0], pt1[1] + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            
            cv2.imshow("Crowd Monitor", annotated_frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()
