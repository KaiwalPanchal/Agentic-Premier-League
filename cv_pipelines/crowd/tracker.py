from ultralytics import YOLO
import torch
import numpy as np

class CrowdTracker:
    def __init__(self, model_path="yolov8n.pt", device="cuda"):
        if device == "cuda" and not torch.cuda.is_available():
            print("WARNING: CUDA is not available. Falling back to CPU for YOLOv8 Tracking.")
            device = "cpu"
            
        self.model = YOLO(model_path)
        self.device = device
        self.classes = [0] # Person only
        
        # To detect line crossings
        # A line is defined by two points: (x1, y1), (x2, y2)
        # Entry/Exit is determined by the cross product (which side of the line the point is on)
        self.tripwires = {}
        self.track_history = {} # ID -> list of previous centroids

    def add_tripwire(self, wire_id, pt1, pt2):
        self.tripwires[wire_id] = {
            "pt1": np.array(pt1),
            "pt2": np.array(pt2),
            "entries": 0,
            "exits": 0
        }

    def _cross_product(self, a, b, c):
        """Returns the Z component of the cross product of AB and AC."""
        # a, b are line points. c is the point to check.
        # > 0 means c is on one side, < 0 means c is on the other
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

    def track(self, frame):
        """
        Runs ByteTrack via YOLOv8.
        Returns the annotated frame, and tracked objects.
        """
        # persist=True ensures IDs are kept across frames
        results = self.model.track(frame, persist=True, classes=self.classes, device=self.device, verbose=False)
        
        annotated_frame = results[0].plot()
        
        boxes = results[0].boxes
        if boxes is None or boxes.id is None:
            return annotated_frame, []
            
        xyxys = boxes.xyxy.cpu().numpy()
        ids = boxes.id.cpu().numpy()
        
        tracked_objects = []
        
        # Check crossings
        for xyxy, obj_id in zip(xyxys, ids):
            obj_id = int(obj_id)
            x1, y1, x2, y2 = xyxy
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2
            current_pt = np.array([cx, cy])
            
            tracked_objects.append({"id": obj_id, "centroid": (cx, cy), "box": xyxy})
            
            if obj_id in self.track_history:
                prev_pt = self.track_history[obj_id]
                
                # Check against all tripwires
                for w_id, wire in self.tripwires.items():
                    a = wire["pt1"]
                    b = wire["pt2"]
                    
                    cp_prev = self._cross_product(a, b, prev_pt)
                    cp_curr = self._cross_product(a, b, current_pt)
                    
                    # If signs are different, the line was crossed
                    if cp_prev * cp_curr < 0:
                        # Determine direction
                        if cp_prev > 0 and cp_curr < 0:
                            wire["entries"] += 1
                        elif cp_prev < 0 and cp_curr > 0:
                            wire["exits"] += 1
            
            self.track_history[obj_id] = current_pt
            
        return annotated_frame, tracked_objects

    def get_tripwire_stats(self):
        stats = {}
        for w_id, wire in self.tripwires.items():
            stats[w_id] = {"entries": wire["entries"], "exits": wire["exits"]}
        return stats
