import cv2
import sys
import os

# Add pipeline to path
sys.path.append(os.path.join(os.getcwd(), 'cv_pipelines', 'gesture'))

from landmark_extractor import PoseExtractor
from classifier import GeometricGestureClassifier

def test_image(image_path):
    if not os.path.exists(image_path):
        print(f"Error: File {image_path} not found.")
        return

    # 1. Load image
    frame = cv2.imread(image_path)
    if frame is None:
        print(f"Error: Could not decode image {image_path}.")
        return
    
    # 2. Initialize components
    # We use model_complexity=2 for better accuracy on static images
    extractor = PoseExtractor(model_complexity=2)
    classifier = GeometricGestureClassifier()
    
    # 3. Process
    print(f"Processing {image_path}...")
    result = extractor.extract(frame, return_image=True)
    
    # Handle the tuple return from extract()
    if isinstance(result, tuple):
        landmarks, annotated = result
    else:
        landmarks = result
        annotated = frame.copy()
    
    if landmarks:
        # 4. Predict
        label = classifier.predict(landmarks)
        print(f"\n[RESULT] Detected Gesture: {label.upper()}\n")
        
        # 5. Show result
        display_frame = annotated if annotated is not None else frame
        cv2.putText(display_frame, f"Result: {label}", (30, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        # Resize for display if image is too large
        h, w = display_frame.shape[:2]
        if h > 800 or w > 800:
            scale = 800 / max(h, w)
            display_frame = cv2.resize(display_frame, (int(w * scale), int(h * scale)))
            
        cv2.imshow("Test Result (Press any key to close)", display_frame)
        cv2.waitKey(0)
    else:
        print("No pose landmarks detected. Ensure the full body (at least torso and arms) is visible.")
    
    extractor.close()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_gesture_image.py <path_to_image>")
        print("Example: python test_gesture_image.py sample_dataset/my_pose.jpg")
    else:
        test_image(sys.argv[1])
