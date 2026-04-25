import cv2
import queue
import threading
import time
from typing import Union

class VideoStreamer:
    """
    Captures frames from a camera or video file in a background thread
    and places them into a thread-safe queue.
    """
    def __init__(self, source: Union[int, str], queue_size: int = 30):
        self.source = source
        self.frame_queue = queue.Queue(maxsize=queue_size)
        self.stopped = False
        self.cap = None
        self.thread = None

    def start(self):
        self.cap = cv2.VideoCapture(self.source)
        if not self.cap.isOpened():
            raise ValueError(f"Unable to open video source: {self.source}")
        
        self.stopped = False
        self.thread = threading.Thread(target=self._update, daemon=True)
        self.thread.start()
        return self

    def _update(self):
        while not self.stopped:
            if not self.cap.isOpened():
                break
            
            if not self.frame_queue.full():
                ret, frame = self.cap.read()
                if not ret:
                    # If it's a video file, it might have ended
                    if isinstance(self.source, str):
                        print("Video ended. Stopping stream.")
                    self.stop()
                    break
                self.frame_queue.put(frame)
            else:
                # If queue is full, sleep slightly to prevent tight loop
                time.sleep(0.01)

    def read(self):
        """Returns the next frame from the queue, or None if empty/stopped."""
        if self.stopped and self.frame_queue.empty():
            return None
        
        try:
            return self.frame_queue.get(timeout=1.0)
        except queue.Empty:
            return None

    def stop(self):
        self.stopped = True
        if self.thread is not None:
            self.thread.join()
        if self.cap is not None:
            self.cap.release()

def stream_frames(source: Union[int, str], frame_queue: queue.Queue):
    """
    Simple generator or loop to stream frames (blocking approach)
    Use VideoStreamer for threaded approach.
    """
    cap = cv2.VideoCapture(source)
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if not frame_queue.full():
            frame_queue.put(frame)
    cap.release()
