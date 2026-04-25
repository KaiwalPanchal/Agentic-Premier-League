import json
import numpy as np
import os
import joblib

class GeometricGestureClassifier:
    """
    Classifies pose by computing landmark geometry ratios.

    Default thresholds are calibrated against the MediaPipe Tasks API
    (mediapipe >= 0.10) using the sample_dataset images.  Override by
    supplying a models/gesture_thresholds.json file.

    Threshold meanings
    ------------------
    head_proximity  : max wrist-to-nose distance to count as "hands on head"
    high_threshold  : wrist_height (y, hip-normalised) must be BELOW this
                      value to count as "hands raised".  Negative = above hip.
    y_spread        : min wrist-to-wrist distance for the Y / arms-wide pose
    x_wrist_height  : wrist_height must be ABOVE this for the X (crossed-arms)
                      pose — arms stay near torso, not fully raised
    o_elbow_spread  : min elbow horizontal spread for the O / halo pose
    o_wrist_dist    : max wrist distance for the O pose (wrists close together)
    """
    def __init__(self, thresholds_path="models/gesture_thresholds.json"):
        # Calibrated defaults (Tasks-API coordinate space, hip-normalised)
        self.t = {
            "high_threshold":    -0.10,  # raised arms: wrist_height < -0.10
            "x_wrist_height":    -0.15,  # X: wrist_height must be ABOVE this (near neutral)
            "x_head_proximity":   0.15,  # X: wrists_near_head must be BELOW this
            "y_spread":           0.35,  # Y: wrist_dist > 0.35
            "y_head_proximity":   0.20,  # Y: wrists_near_head < 0.20
            "o_elbow_spread":     0.25,  # O: elbow_spread > 0.25
            "o_elbow_max":       0.38,  # O: elbow_spread must be BELOW this (not too wide)
            "theft_elbow_spread": 0.40,  # theft: elbow_spread > 0.40
        }
        if os.path.exists(thresholds_path):
            with open(thresholds_path) as f:
                self.t = json.load(f)
        else:
            print(f"Warning: {thresholds_path} not found. Using default thresholds.")

    def predict(self, landmarks) -> str:
        if not landmarks:
            return "none"

        lms = np.array(landmarks)           # shape (33, 3)
        l_wrist, r_wrist = lms[15], lms[16]
        l_elbow, r_elbow = lms[13], lms[14]
        nose             = lms[0]

        wrist_dist       = np.linalg.norm(l_wrist - r_wrist)
        wrist_height     = (l_wrist[1] + r_wrist[1]) / 2   # negative = above hip
        elbow_spread     = abs(l_elbow[0] - r_elbow[0])
        wrists_near_head = np.linalg.norm((l_wrist + r_wrist) / 2 - nose)
        wrists_crossed   = l_wrist[0] > r_wrist[0]

        # --- Rule priority: most-specific first ---

        # 1. X shape — arms crossed near chest, wrists very close to face/nose area
        #    Observed: wrists_near_head~0.14, wrist_dist~0.09, wrist_height~0.0
        if (wrists_crossed
                and wrist_height > self.t.get("x_wrist_height", -0.15)
                and wrists_near_head < self.t.get("x_head_proximity", 0.15)
                and wrist_dist < 0.20):
            return "lost_person"

        # 2. Y shape — arms wide apart, raised, wrists near head range
        #    Observed: wrist_dist~0.42, wrist_height~-0.19, wrists_near_head~0.10
        if (wrist_dist > self.t.get("y_spread", 0.35)
                and wrist_height < self.t.get("high_threshold", -0.10)
                and wrists_near_head < self.t.get("y_head_proximity", 0.20)):
            return "general_alert"

        # 3. O / halo shape — elbows moderately wide, wrists close, arms raised, wrists NOT near face
        #    Observed: elbow_spread~0.31, wrist_dist~0.16, wrist_height~-0.36
        if (elbow_spread > self.t.get("o_elbow_spread", 0.25)
                and elbow_spread < self.t.get("o_elbow_max", 0.38)
                and wrist_dist < self.t.get("o_wrist_dist", 0.25)
                and wrist_height < self.t.get("high_threshold", -0.10)
                and wrists_near_head > self.t.get("y_head_proximity", 0.20)):
            return "medical_emergency"

        # 4. Theft-suspicious — hands on/near head but wrists further from nose midpoint
        #    (person covering head, grabbing someone, etc.)
        #    Observed: wrists_near_head~0.54, wrist_height~-0.38, elbow_spread~0.46
        if (wrist_height < self.t.get("high_threshold", -0.10)
                and elbow_spread > self.t.get("theft_elbow_spread", 0.40)
                and wrists_near_head > self.t.get("y_head_proximity", 0.20)):
            return "theft_suspicious"

        return "none"


class KNNGestureClassifier:
    """Fallback KNN Classifier."""
    def __init__(self, model_path="models/gesture_knn.pkl"):
        self.model = None
        if os.path.exists(model_path):
            self.model = joblib.load(model_path)
        else:
            print(f"Warning: {model_path} not found. KNN fallback disabled.")

    def predict(self, landmarks) -> str:
        if not self.model or not landmarks:
            return "none"
        flat = [coord for lm in landmarks for coord in lm]   # 99 floats
        return self.model.predict([flat])[0]


class GestureHoldBuffer:
    """Accumulates predictions and fires an alert after a continuous hold."""
    def __init__(self, hold_seconds=5.0, fps=15):
        self.required_frames = int(hold_seconds * fps)
        self.buffer = []

    def update(self, label: str):
        self.buffer.append(label)
        if len(self.buffer) > self.required_frames:
            self.buffer.pop(0)
            
        if (
            len(self.buffer) == self.required_frames
            and len(set(self.buffer)) == 1
            and self.buffer[0] != "none"
        ):
            confirmed = self.buffer[0]
            # Clear buffer to avoid spamming alerts every frame
            self.buffer.clear()
            return confirmed
        return None
