import requests
import json
import os
from datetime import datetime

class AlertRouter:
    def __init__(self, api_url=None, camera_id="cam_01"):
        if api_url is None:
            base_url = os.environ.get("BACKEND_URL", "http://localhost:8000").rstrip("/")
            self.api_url = f"{base_url}/alerts/ingest"
        else:
            self.api_url = api_url
        self.camera_id = camera_id

    def send_alert(self, label: str, confidence: float = 1.0, zone: str = "Unknown", snapshot_path: str = None):
        """POST an alert to the backend event bus."""
        payload = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "camera_id": self.camera_id,
            "alert_type": label,
            "confidence": confidence,
            "zone": zone,
            "snapshot_url": snapshot_path
        }
        
        try:
            response = requests.post(self.api_url, json=payload, timeout=2.0)
            if response.status_code in (200, 201):
                print(f"[AlertRouter] Successfully sent alert: {label}")
            else:
                print(f"[AlertRouter] Failed to send alert: {response.status_code} - {response.text}")
        except requests.exceptions.RequestException as e:
            print(f"[AlertRouter] Error sending alert: {e}")

# Example standalone run for the pipeline
if __name__ == "__main__":
    from frame_capture import VideoStreamer
    from landmark_extractor import PoseExtractor
    from classifier import GeometricGestureClassifier, GestureHoldBuffer
    import cv2
    import time
    
    streamer = VideoStreamer(0).start()
    extractor = PoseExtractor()
    classifier = GeometricGestureClassifier()
    hold_buffer = GestureHoldBuffer(hold_seconds=5.0, fps=15) # Adjust fps to your actual loop speed
    router = AlertRouter()
    
    print("Starting gesture pipeline... Press 'q' to quit.")
    
    try:
        while True:
            frame = streamer.read()
            if frame is None:
                continue
                
            landmarks, annotated = extractor.extract(frame, return_image=True)
            
            label = classifier.predict(landmarks)
            confirmed_alert = hold_buffer.update(label)
            
            if confirmed_alert:
                print(f"\n>>> 🚨 CONFIRMED ALERT: {confirmed_alert} 🚨 <<<\n")
                router.send_alert(confirmed_alert)
            
            cv2.putText(annotated, f"Current: {label}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.imshow("Gesture Pipeline", annotated if annotated is not None else frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    finally:
        streamer.stop()
        extractor.close()
        cv2.destroyAllWindows()
