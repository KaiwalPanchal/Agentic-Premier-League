import argparse
import os
import time
import json
import numpy as np
import cv2
import joblib
from sklearn.neighbors import KNeighborsClassifier

from landmark_extractor import PoseExtractor
from frame_capture import stream_frames
import queue

LABELS = ["general_alert", "medical_emergency", "theft_suspicious", "lost_person", "none"]
DATA_DIR = "data"
MODELS_DIR = "models"

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

def collect_data(label, num_samples=20):
    print(f"Collecting {num_samples} samples for label: {label}")
    print("Please get ready and hold the pose in 3 seconds...")
    time.sleep(3)
    
    extractor = PoseExtractor(model_complexity=1)
    
    cap = cv2.VideoCapture(0)
    samples = []
    
    print("Collecting... Hold steady.")
    while len(samples) < num_samples:
        ret, frame = cap.read()
        if not ret:
            break
            
        landmarks, annotated = extractor.extract(frame, return_image=True)
        if landmarks:
            samples.append(landmarks)
            cv2.putText(annotated, f"Captured: {len(samples)}/{num_samples}", (10, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        else:
            cv2.putText(annotated, "No pose detected!", (10, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            
        cv2.imshow("Calibration", annotated if annotated is not None else frame)
        if cv2.waitKey(100) & 0xFF == ord('q'):
            break
            
    cap.release()
    cv2.destroyAllWindows()
    extractor.close()
    
    if len(samples) == num_samples:
        np.save(os.path.join(DATA_DIR, f"{label}.npy"), np.array(samples))
        print(f"Successfully saved {num_samples} samples to {DATA_DIR}/{label}.npy")
    else:
        print(f"Collection aborted. Got {len(samples)} samples.")

def calibrate_thresholds():
    print("Calibrating thresholds from collected data...")
    thresholds = {
        "head_proximity": 0.2,
        "high_threshold": -0.4,
        "y_spread": 0.8,
        "o_elbow_spread": 0.6
    }
    
    data = {}
    for label in LABELS:
        path = os.path.join(DATA_DIR, f"{label}.npy")
        if os.path.exists(path):
            data[label] = np.load(path)
            
    if not data:
        print("No data found. Please run --collect first.")
        return
        
    # Example calibration logic based on means
    if "theft_suspicious" in data:
        # Hands on head
        lms = data["theft_suspicious"]
        # shape is (num_samples, 33, 3)
        l_wrist = lms[:, 15, :]
        r_wrist = lms[:, 16, :]
        nose = lms[:, 0, :]
        wrists_center = (l_wrist + r_wrist) / 2
        dists = np.linalg.norm(wrists_center - nose, axis=1)
        thresholds["head_proximity"] = float(np.mean(dists) * 1.5) # Allow some margin
        
    if "general_alert" in data:
        # Y shape
        lms = data["general_alert"]
        l_wrist = lms[:, 15, :]
        r_wrist = lms[:, 16, :]
        dists = np.linalg.norm(l_wrist - r_wrist, axis=1)
        thresholds["y_spread"] = float(np.mean(dists) * 0.8)
        
    if "medical_emergency" in data:
        # O shape
        lms = data["medical_emergency"]
        l_elbow = lms[:, 13, :]
        r_elbow = lms[:, 14, :]
        spreads = np.abs(l_elbow[:, 0] - r_elbow[:, 0])
        thresholds["o_elbow_spread"] = float(np.mean(spreads) * 0.8)
        
    # High threshold can be generalized from Y, O, and X shapes (if wrists are high)
    high_y_vals = []
    for lbl in ["general_alert", "medical_emergency", "lost_person"]:
        if lbl in data:
            lms = data[lbl]
            l_wrist_y = lms[:, 15, 1]
            r_wrist_y = lms[:, 16, 1]
            high_y_vals.extend(list((l_wrist_y + r_wrist_y) / 2))
    
    if high_y_vals:
        # Y axis points down, so smaller is higher
        thresholds["high_threshold"] = float(np.max(high_y_vals) + 0.1) # Add slight margin down
        
    with open(os.path.join(MODELS_DIR, "gesture_thresholds.json"), "w") as f:
        json.dump(thresholds, f, indent=4)
        
    print(f"Calibrated thresholds saved: {thresholds}")

def train_knn():
    print("Training KNN fallback model...")
    X, y = [], []
    for label in LABELS:
        path = os.path.join(DATA_DIR, f"{label}.npy")
        if os.path.exists(path):
            samples = np.load(path)
            # Flatten the 33x3 to 99 floats
            flats = samples.reshape((samples.shape[0], -1))
            X.extend(flats)
            y.extend([label] * len(flats))
            
    if not X:
        print("No data found to train KNN.")
        return
        
    knn = KNeighborsClassifier(n_neighbors=1)
    knn.fit(X, y)
    
    joblib.dump(knn, os.path.join(MODELS_DIR, "gesture_knn.pkl"))
    print(f"Trained KNN with {len(X)} samples across {len(set(y))} classes.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--collect", type=str, choices=LABELS, help="Collect data for a gesture")
    parser.add_argument("--calibrate", action="store_true", help="Calibrate thresholds")
    parser.add_argument("--train-knn", action="store_true", help="Train KNN fallback")
    
    args = parser.parse_args()
    
    if args.collect:
        collect_data(args.collect)
    elif args.calibrate:
        calibrate_thresholds()
    elif args.train_knn:
        train_knn()
    else:
        parser.print_help()
