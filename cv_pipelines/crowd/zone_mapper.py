import cv2
import numpy as np
import json
import os

class ZoneMapper:
    """
    Maps (x,y) centroids to defined polygonal zones.
    """
    def __init__(self, config_path="models/zone_config.json"):
        self.zones = {}
        if os.path.exists(config_path):
            self.load_zones(config_path)
        else:
            print(f"Warning: Zone config {config_path} not found. Creating a default mock zone.")
            # Default mock zone covering most of a 640x480 frame for testing
            self.zones["A1"] = np.array([[100, 100], [500, 100], [500, 400], [100, 400]], np.int32)
            self._save_mock(config_path)

    def load_zones(self, config_path):
        with open(config_path, "r") as f:
            data = json.load(f)
            for zone_id, points in data.get("zones", {}).items():
                self.zones[zone_id] = np.array(points, np.int32)

    def _save_mock(self, config_path):
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        data = {
            "zones": {
                "A1": [[100, 100], [500, 100], [500, 400], [100, 400]]
            }
        }
        with open(config_path, "w") as f:
            json.dump(data, f, indent=4)

    def get_zone(self, point) -> str:
        """Returns the zone_id for a given (x,y) point, or None if outside all zones."""
        px, py = point
        for zone_id, polygon in self.zones.items():
            # pointPolygonTest returns >0 if inside, 0 if on edge, <0 if outside
            if cv2.pointPolygonTest(polygon, (px, py), False) >= 0:
                return zone_id
        return None

    def map_centroids(self, centroids):
        """
        Takes a list of centroids and returns a dict of counts per zone.
        """
        counts = {zone_id: 0 for zone_id in self.zones.keys()}
        for pt in centroids:
            zone_id = self.get_zone(pt)
            if zone_id:
                counts[zone_id] += 1
        return counts

    def draw_zones(self, frame, density_counts=None):
        """Visualizes the zones on the frame."""
        annotated = frame.copy()
        for zone_id, polygon in self.zones.items():
            # Draw polygon
            cv2.polylines(annotated, [polygon], isClosed=True, color=(255, 0, 0), thickness=2)
            # Draw label
            count = density_counts.get(zone_id, 0) if density_counts else 0
            label = f"Zone {zone_id}: {count}"
            
            # Position label near the first point of the polygon
            text_pos = tuple(polygon[0])
            cv2.putText(annotated, label, text_pos, cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
            
        return annotated
