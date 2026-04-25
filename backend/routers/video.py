import cv2
import time
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import threading

router = APIRouter(prefix="/video", tags=["video"])

class CameraManager:
    def __init__(self):
        self.camera = None
        self.lock = threading.Lock()
        self.ref_count = 0

    def get_camera(self):
        with self.lock:
            if self.camera is None:
                self.camera = cv2.VideoCapture(0)
                if not self.camera.isOpened():
                    self.camera = None
                    return None
            self.ref_count += 1
            return self.camera

    def release_camera(self):
        with self.lock:
            self.ref_count -= 1
            if self.ref_count <= 0 and self.camera is not None:
                self.camera.release()
                self.camera = None

camera_manager = CameraManager()

def gen_frames():
    camera = camera_manager.get_camera()
    if camera is None:
        return

    try:
        while True:
            success, frame = camera.read()
            if not success:
                break
            
            # Add a small timestamp or processing if needed here
            # For now, just encode to JPEG
            ret, buffer = cv2.imencode('.jpg', frame)
            if not ret:
                continue
                
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            
            # Limit frame rate to ~20fps to save bandwidth/CPU
            time.sleep(0.05)
    finally:
        camera_manager.release_camera()

@router.get("/stream")
async def video_feed():
    """
    Video streaming route. Returns an MJPEG stream.
    """
    return StreamingResponse(
        gen_frames(), 
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
