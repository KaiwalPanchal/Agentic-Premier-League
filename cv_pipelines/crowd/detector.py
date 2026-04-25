from ultralytics import YOLO
import torch
import numpy as np

class CrowdDetector:
    def __init__(self, model_path="yolov8n.pt", device="cuda"):
        # Check if CUDA is available, otherwise fallback to CPU but warn
        if device == "cuda" and not torch.cuda.is_available():
            print("WARNING: CUDA is not available. Falling back to CPU for YOLOv8.")
            device = "cpu"
            
        self.model = YOLO(model_path)
        self.device = device
        # We only care about class 0 (person)
        self.classes = [0]
        
    def detect(self, frame):
        """
        Runs YOLOv8 person detection on a frame.
        Returns numpy array of bounding boxes [x1, y1, x2, y2, conf, cls]
        """
        # verbose=False to prevent console spam
        results = self.model(frame, classes=self.classes, device=self.device, verbose=False)
        
        # Extract boxes
        if len(results) > 0 and len(results[0].boxes) > 0:
            return results[0].boxes.data.cpu().numpy()
        return np.array([])

    def get_centroids(self, boxes):
        """Helper to get (x, y) centroids from bounding boxes."""
        if len(boxes) == 0:
            return []
        
        centroids = []
        for box in boxes:
            x1, y1, x2, y2 = box[:4]
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2
            centroids.append((cx, cy))
        return centroids
