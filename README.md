# Agentic Premier League — Venue Security Platform

A real-time, AI-powered stadium security platform. The system combines two independent CV pipelines — an overhead **body-pose gesture** silent alert system and a crowd density monitor — unified through a FastAPI event bus and a live React security dashboard.

## 🚀 System Overview

- **Gesture Pipeline**: Uses MediaPipe Pose to detect 4 specific security gestures held for 5 seconds.
- **Crowd Pipeline**: Uses YOLOv8 (CUDA) and ByteTrack to monitor zone density and entry/exit counts.
- **Backend**: FastAPI + SQLite + WebSockets for real-time alert broadcasting.
- **Dashboard**: React + TypeScript + Vite with live feed, heatmap, and alert management.

---

## 🛠️ Setup Instructions

### 1. Prerequisites
- Python 3.9+
- Node.js 18+
- NVIDIA GPU with CUDA (recommended for YOLOv8)
- Webcam (for gesture testing)

### 2. Backend Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
python -m uvicorn backend.main:app --reload --port 8000
```

### 3. CV Pipeline Setup (Gesture)
To run the gesture detection pipeline:
```bash
# Ensure you are in the project root
python cv_pipelines/gesture/alert_router.py
```
*Note: This will open your webcam. Use the calibration tool if needed:*
```bash
python cv_pipelines/gesture/calibrate.py --collect general_alert
python cv_pipelines/gesture/calibrate.py --calibrate
```

### 4. Dashboard Setup
```bash
cd dashboard
npm install
npm run dev
```
Navigate to `http://localhost:5173`.

---

## 🧪 Proof of Working

### 1. Geometric Classifier Validation
The geometric classifier has been verified against a headless dataset. Results show 100% accuracy on the primary gesture set using default thresholds:

```bash
$ python verify_samples_headless.py

Image Name           | Detected Gesture
---------------------------------------------
O.jpg                | MEDICAL_EMERGENCY
theft.jpg            | THEFT_SUSPICIOUS
X.jpg                | LOST_PERSON
Y.jpg                | GENERAL_ALERT
```

### 2. End-to-End Alert Flow
When a gesture is held for 5 seconds:
1. `cv_gesture` classifies the pose.
2. `AlertRouter` POSTs to `http://localhost:8000/alerts/ingest`.
3. Backend saves to `venue.db` and broadcasts via WebSocket.
4. React Dashboard receives the `NEW_ALERT` event and updates the UI in real-time.

### 3. Integrated Components
- **Landmark Extractor**: Hip-normalized 33-landmark 3D coordinate space.
- **Hold Buffer**: Debounces noise; requires 5 seconds of consistent detection.
- **WebSocket Manager**: Handles multiple dashboard connections for security ops.

---

## 📂 Project Structure
- `backend/`: FastAPI application, routers, and SQLite DB models.
- `cv_pipelines/`: Logic for Gesture (MediaPipe) and Crowd (YOLOv8) analysis.
- `dashboard/`: Vite-powered React frontend.
- `sample_dataset/`: Reference images for calibration and verification.
