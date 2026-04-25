import mediapipe as mp
import numpy as np
import cv2
import os

from mediapipe.tasks.python import vision
from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode
from mediapipe.tasks import python as mp_tasks

# Default model path — can be overridden by the MODEL_PATH env var or constructor arg
_DEFAULT_MODEL = os.path.join(
    os.path.dirname(__file__), "..", "..", "pose_landmarker_heavy.task"
)


class PoseExtractor:
    """
    Wraps MediaPipe PoseLandmarker (Tasks API, mediapipe >= 0.10).
    Produces 33 hip-normalised landmarks compatible with the existing classifier.
    """

    def __init__(
        self,
        model_complexity: int = 2,          # kept for API compat; maps to lite/full/heavy
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
        model_path: str | None = None,
    ):
        # Map old model_complexity (0/1/2) → model variant name if no explicit path given
        if model_path is None:
            model_path = os.environ.get("POSE_MODEL_PATH", _DEFAULT_MODEL)

        model_path = os.path.abspath(model_path)
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Pose model not found at: {model_path}\n"
                "Download it with:\n"
                "  python -c \"import urllib.request; urllib.request.urlretrieve("
                "'https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
                "pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task', "
                "'pose_landmarker_heavy.task')\""
            )

        options = PoseLandmarkerOptions(
            base_options=mp_tasks.BaseOptions(model_asset_path=model_path),
            running_mode=RunningMode.IMAGE,          # static images; use VIDEO for live
            min_pose_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            num_poses=1,
        )
        self._landmarker = PoseLandmarker.create_from_options(options)

    # ------------------------------------------------------------------
    # Public API (same signature as the original mp.solutions version)
    # ------------------------------------------------------------------

    def extract(self, frame, return_image: bool = False):
        """
        Extract 33 hip-normalised 3-D landmarks from a BGR frame.

        Returns:
            landmarks_list   – list of 33 (x, y, z) tuples, or None
            annotated_image  – only when return_image=True
        """
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Downscale very large images — MediaPipe misses poses on huge frames
        h, w = image_rgb.shape[:2]
        max_dim = max(h, w)
        if max_dim > 1280:
            scale = 1280 / max_dim
            image_rgb = cv2.resize(image_rgb, (int(w * scale), int(h * scale)))

        mp_image  = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)

        result = self._landmarker.detect(mp_image)

        annotated_image = None
        if return_image:
            annotated_image = frame.copy()

        if not result.pose_landmarks:
            return (None, annotated_image) if return_image else None

        lms = result.pose_landmarks[0]   # first (and only) detected person

        # Normalise relative to hip midpoint (indices 23 & 24)
        hip_x = (lms[23].x + lms[24].x) / 2
        hip_y = (lms[23].y + lms[24].y) / 2
        hip_z = (lms[23].z + lms[24].z) / 2

        normalized = [(lm.x - hip_x, lm.y - hip_y, lm.z - hip_z) for lm in lms]

        return (normalized, annotated_image) if return_image else normalized

    def close(self):
        self._landmarker.close()


# ---------------------------------------------------------------------------
# Stateless helper — kept for backward-compat with test_gesture_image.py etc.
# ---------------------------------------------------------------------------

def extract_landmarks(frame, model_path: str | None = None):
    """Stateless one-shot extraction without managing a persistent instance."""
    extractor = PoseExtractor(model_path=model_path)
    try:
        return extractor.extract(frame, return_image=False)
    finally:
        extractor.close()
