import json
import numpy as np
import os
import joblib

class GeometricGestureClassifier:
    """
    Classifies pose by computing landmark geometry ratios.
    Uses optimized rules from models/pose_rules.json if they exist.
    """
    def __init__(self, thresholds_path="models/gesture_thresholds.json", rules_path="models/pose_rules.json"):
        # Default fallback thresholds (Tasks-API coordinate space)
        self.t = {
            "high_threshold":    -0.10,
            "x_wrist_height":    -0.15,
            "x_head_proximity":   0.15,
            "y_spread":           0.35,
            "y_head_proximity":   0.20,
            "o_elbow_spread":     0.25,
            "o_elbow_max":       0.38,
            "o_wrist_dist":      0.25,
            "theft_elbow_spread": 0.40,
        }
        self.optimized_rules = {}
        
        # Load optimized rules first (priority)
        if os.path.exists(rules_path):
            try:
                with open(rules_path) as f:
                    self.optimized_rules = json.load(f)
                print(f"[*] Loaded {len(self.optimized_rules)} optimized rules from {rules_path}")
            except Exception as e:
                print(f"Error loading optimized rules: {e}")

        # Load standard thresholds (legacy support)
        if os.path.exists(thresholds_path):
            with open(thresholds_path) as f:
                self.t.update(json.load(f))

    def predict(self, landmarks) -> str:
        if not landmarks:
            return "none"

        lms = np.array(landmarks)           # shape (33, 3)
        l_wrist, r_wrist = lms[15], lms[16]
        l_elbow, r_elbow = lms[13], lms[14]
        nose             = lms[0]

        # Extract features (Matching the order in pose_optimizer.py)
        # 0: Wrist Dist, 1: Wrist Height, 2: Elbow Spread, 3: Wrist-Head Prox
        features = [
            np.linalg.norm(l_wrist - r_wrist),
            (l_wrist[1] + r_wrist[1]) / 2,
            abs(l_elbow[0] - r_elbow[0]),
            np.linalg.norm((l_wrist + r_wrist) / 2 - nose)
        ]

        # --- Priority 1: Optimized Personalized Rules ---
        if self.optimized_rules:
            for label, conditions in self.optimized_rules.items():
                is_match = True
                for feat_idx, op, threshold in conditions:
                    val = features[feat_idx]
                    if op == "<" and not (val < threshold):
                        is_match = False; break
                    if op == ">" and not (val > threshold):
                        is_match = False; break
                
                if is_match:
                    # Map simplified labels to system alert types if needed
                    # e.g., if you saved as 'y', return 'general_alert'
                    label_map = {
                        "y": "general_alert",
                        "o": "medical_emergency",
                        "x": "lost_person",
                        "theft": "theft_suspicious"
                    }
                    return label_map.get(label.lower(), label)

        # --- Priority 2: Standard Rule-Based Logic (Fallback) ---
        wrist_dist, wrist_height, elbow_spread, wrists_near_head = features
        wrists_crossed = l_wrist[0] > r_wrist[0]

        # 1. X shape
        if (wrists_crossed
                and wrist_height > self.t.get("x_wrist_height", -0.15)
                and wrists_near_head < self.t.get("x_head_proximity", 0.15)
                and wrist_dist < 0.20):
            return "lost_person"

        # 2. Y shape
        if (wrist_dist > self.t.get("y_spread", 0.35)
                and wrist_height < self.t.get("high_threshold", -0.10)
                and wrists_near_head < self.t.get("y_head_proximity", 0.20)):
            return "general_alert"

        # 3. O / halo shape
        if (elbow_spread > self.t.get("o_elbow_spread", 0.25)
                and elbow_spread < self.t.get("o_elbow_max", 0.38)
                and wrist_dist < self.t.get("o_wrist_dist", 0.25)
                and wrist_height < self.t.get("high_threshold", -0.10)
                and wrists_near_head > self.t.get("y_head_proximity", 0.20)):
            return "medical_emergency"

        # 4. Theft-suspicious
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
