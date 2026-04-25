import cv2
import numpy as np
import threading
import time
import sys
import os
import json

# Add pipeline to path to import PoseExtractor
sys.path.append(os.path.join(os.getcwd(), 'cv_pipelines', 'gesture'))
from landmark_extractor import PoseExtractor

class PoseOptimizer:
    def __init__(self):
        self.capturing = False
        self.testing = False
        self.current_label = ""
        self.samples = {}  # label -> list of feature vectors
        self.rules = {}    # label -> list of (feat_idx, operator, threshold)
        self.running = True
        self.feature_names = ["Wrist Dist", "Wrist Height", "Elbow Spread", "Wrist-Head Prox"]
        self.internal_keys = ["wrist_dist", "wrist_height", "elbow_spread", "wrists_near_head"]
        
        self.samples_path = "data/pose_samples.json"
        self.rules_path = "models/pose_rules.json"
        self._load_from_disk()

    def _load_from_disk(self):
        if os.path.exists(self.samples_path):
            try:
                with open(self.samples_path, "r") as f:
                    data = json.load(f)
                    # Convert lists back to numpy arrays
                    self.samples = {k: [np.array(v) for v in vs] for k, vs in data.items()}
                print(f"[*] Loaded {len(self.samples)} existing poses from {self.samples_path}")
            except Exception as e:
                print(f"[!] Error loading samples: {e}")
        
        if os.path.exists(self.rules_path):
            try:
                with open(self.rules_path, "r") as f:
                    data = json.load(f)
                    # Convert list-of-lists to list-of-tuples
                    self.rules = {k: [tuple(c) for c in cs] for k, cs in data.items()}
                print(f"[*] Loaded existing optimized rules from {self.rules_path}")
            except Exception as e:
                print(f"[!] Error loading rules: {e}")

    def _save_samples_to_disk(self):
        try:
            os.makedirs("data", exist_ok=True)
            # Convert numpy arrays to lists for JSON serialization
            serializable = {k: [v.tolist() for v in vs] for k, vs in self.samples.items()}
            with open(self.samples_path, "w") as f:
                json.dump(serializable, f, indent=4)
        except Exception as e:
            print(f"[!] Error saving samples: {e}")

    def _save_rules_to_disk(self):
        try:
            os.makedirs("models", exist_ok=True)
            with open(self.rules_path, "w") as f:
                json.dump(self.rules, f, indent=4)
        except Exception as e:
            print(f"[!] Error saving rules: {e}")

    def extract_features(self, lms):
        """
        lms: Normalized landmark list of 33 (x, y, z) relative to hips
        Returns a 4-float feature vector
        """
        lms = np.array(lms)
        # Landmark indices: 0: nose, 13: l_elbow, 14: r_elbow, 15: l_wrist, 16: r_wrist
        l_wrist, r_wrist = lms[15], lms[16]
        l_elbow, r_elbow = lms[13], lms[14]
        nose = lms[0]
        
        # Calculate geometric features
        wrist_dist = np.linalg.norm(l_wrist - r_wrist)
        wrist_height = (l_wrist[1] + r_wrist[1]) / 2  # Average Y (negative = higher)
        elbow_spread = abs(l_elbow[0] - r_elbow[0])
        wrists_near_head = np.linalg.norm((l_wrist + r_wrist) / 2 - nose)
        
        return np.array([wrist_dist, wrist_height, elbow_spread, wrists_near_head])

    def video_loop(self):
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("\n[!] Error: Could not open webcam.")
            self.running = False
            return

        # Initialize the modern PoseExtractor (Tasks API)
        try:
            extractor = PoseExtractor(model_complexity=1)
        except Exception as e:
            print(f"\n[!] Error initializing PoseExtractor: {e}")
            self.running = False
            return
        
        capture_count = 0
        MAX_CAPTURE = 30 

        print("\n[Video Stream Started] - Look at the OpenCV window.")
        
        while self.running:
            ret, frame = cap.read()
            if not ret:
                continue

            # Use PoseExtractor to get landmarks and annotated image
            result = extractor.extract(frame, return_image=True)
            landmarks, annotated = result if isinstance(result, tuple) else (result, frame.copy())
            
            display_frame = annotated if annotated is not None else frame
            
            if landmarks:
                # Live Testing Logic
                if self.testing and self.rules:
                    current_feats = self.extract_features(landmarks)
                    detected_label = "none"
                    
                    for label, conditions in self.rules.items():
                        is_match = True
                        for feat_idx, op, threshold in conditions:
                            val = current_feats[feat_idx]
                            if op == "<" and not (val < threshold):
                                is_match = False; break
                            if op == ">" and not (val > threshold):
                                is_match = False; break
                        
                        if is_match:
                            detected_label = label
                            break
                    
                    color = (0, 255, 0) if detected_label != "none" else (255, 255, 255)
                    cv2.putText(display_frame, f"TESTING: {detected_label.upper()}", 
                                (10, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 3)

                if self.capturing:
                    feats = self.extract_features(landmarks)
                    if self.current_label not in self.samples:
                        self.samples[self.current_label] = []
                    self.samples[self.current_label].append(feats)
                    
                    capture_count += 1
                    cv2.putText(display_frame, f"RECORDING '{self.current_label}': {capture_count}/{MAX_CAPTURE}", 
                                (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                    
                    if capture_count >= MAX_CAPTURE:
                        self.capturing = False
                        capture_count = 0
                        self._save_samples_to_disk()
                        print(f"\n[+] Captured '{self.current_label}' and saved to disk.")
                elif not self.testing:
                    cv2.putText(display_frame, "POSE DETECTED", (10, 40), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            else:
                cv2.putText(display_frame, "NO PERSON DETECTED", (10, 40), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

            cv2.imshow('Pose Optimizer - Skeleton Feed', display_frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                self.running = False
                break

        cap.release()
        extractor.close()
        cv2.destroyAllWindows()

    def optimize(self):
        if len(self.samples) < 2:
            print("\n[!] You need to save at least 2 different poses to optimize thresholds.")
            return

        print("\n" + "="*40)
        print("OPTIMIZING POSE BOUNDARIES")
        print("="*40)

        # 1. Compute Stats
        stats = {}
        for label, feats in self.samples.items():
            arr = np.array(feats)
            stats[label] = {
                "mean": np.mean(arr, axis=0),
                "std": np.std(arr, axis=0)
            }
            print(f"\nPose: {label.upper()}")
            for i, name in enumerate(self.feature_names):
                m, s = stats[label]["mean"][i], stats[label]["std"][i]
                print(f"  - {name:<15}: {m:>6.3f} (std: {s:.3f})")

        # 2. Pairwise Separation
        labels = list(self.samples.keys())
        self.rules = {lbl: [] for lbl in labels}

        for i in range(len(labels)):
            for j in range(i + 1, len(labels)):
                l1, l2 = labels[i], labels[j]
                m1, m2 = stats[l1]["mean"], stats[l2]["mean"]
                s1, s2 = stats[l1]["std"], stats[l2]["std"]
                
                # Separation score
                separations = np.abs(m1 - m2) / (s1 + s2 + 1e-6)
                best_idx = int(np.argmax(separations))
                
                threshold = float((m1[best_idx] + m2[best_idx]) / 2)
                
                if m1[best_idx] < m2[best_idx]:
                    self.rules[l1].append((best_idx, "<", threshold))
                    self.rules[l2].append((best_idx, ">", threshold))
                else:
                    self.rules[l1].append((best_idx, ">", threshold))
                    self.rules[l2].append((best_idx, "<", threshold))

        print("\n" + "="*40)
        print("GENERATED NON-MERGING RULES")
        print("="*40)
        for label, conditions in self.rules.items():
            print(f"\n[{label.upper()}]")
            for feat_idx, op, threshold in conditions:
                print(f"  IF {self.feature_names[feat_idx]} {op} {threshold:.3f}")

        print("\n[+] Optimization complete. Type 'test' to try them live!")
        self._save_rules_to_disk()

    def cli_loop(self):
        time.sleep(2) # Wait for video to start
        print("\n=== POSE OPTIMIZER COMMANDS ===")
        print("  save <name>  : Records 30 frames for a pose")
        print("  optimize     : Calculates optimal thresholds")
        print("  test         : Toggles live test mode")
        print("  quit         : Exit tool")
        
        while self.running:
            try:
                line = sys.stdin.readline()
                if not line: break
                cmd = line.strip().split()
                if not cmd: continue

                if cmd[0] == "quit":
                    self.running = False
                elif cmd[0] == "test":
                    if not self.rules:
                        print("[!] Run 'optimize' first.")
                    else:
                        self.testing = not self.testing
                        status = "ON" if self.testing else "OFF"
                        print(f"[*] Live Test Mode: {status}")
                elif cmd[0] == "save" and len(cmd) > 1:
                    self.current_label = cmd[1]
                    self.capturing = True
                    print(f"\n[*] Hold your pose for '{self.current_label}'...")
                    while self.capturing and self.running:
                        time.sleep(0.1)
                elif cmd[0] == "optimize":
                    self.optimize()
                else:
                    print(f"Unknown command: {cmd[0]}")
            except EOFError:
                break

if __name__ == "__main__":
    opt = PoseOptimizer()
    
    # Start CLI in background thread
    threading.Thread(target=opt.cli_loop, daemon=True).start()
    
    # Run Video Loop in main thread
    opt.video_loop()
