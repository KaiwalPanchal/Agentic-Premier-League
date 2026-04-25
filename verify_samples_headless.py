import sys
import os
import cv2

# Add pipeline to path
sys.path.append(os.path.join(os.getcwd(), 'cv_pipelines', 'gesture'))

from landmark_extractor import PoseExtractor
from classifier import GeometricGestureClassifier

def verify_images(folder):
    extractor = PoseExtractor(model_complexity=2)
    classifier = GeometricGestureClassifier()
    
    images = [f for f in os.listdir(folder) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    print(f"{'Image Name':<20} | {'Detected Gesture':<20}")
    print("-" * 45)
    
    for img_name in images:
        path = os.path.join(folder, img_name)
        frame = cv2.imread(path)
        if frame is None:
            print(f"{img_name:<20} | ERROR: Could not load")
            continue
            
        landmarks = extractor.extract(frame, return_image=False)
        if landmarks:
            label = classifier.predict(landmarks)
            print(f"{img_name:<20} | {label.upper()}")
        else:
            print(f"{img_name:<20} | NO LANDMARKS DETECTED")
            
    extractor.close()

if __name__ == "__main__":
    verify_images("sample_dataset")
