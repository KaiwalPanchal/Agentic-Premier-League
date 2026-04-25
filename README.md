# Agentic Premier League — Venue Security Platform

A real-time, AI-powered stadium security platform. The system combines two independent CV pipelines — an overhead **body-pose gesture** silent alert system and a crowd density monitor — unified through a FastAPI event bus and a live Next.js security operations center (SOC) dashboard.

## 🚀 Key Features

- **Gesture-Based Alerts**: Detects 4 security gestures (Medical, Theft, Lost Person, General Alert) with 5-second hold validation.
- **Real-Time SOC Dashboard**: High-fidelity interface with live MJPEG camera streams and interactive heatmaps.
- **Dynamic Awareness**: Browser tab icon and title change color/text instantly based on alert status (Red for Alerts, Amber for Crowd surges).
- **Unified Event Bus**: FastAPI backend with WebSocket broadcasting for sub-second latency.

---

## 🏃‍♂️ Quick Start

### ⚡ One-Step Launch (Services Only)
Start both the Backend and the SOC Dashboard with a single command:
```bash
python run_platform.py
```

### 👁️ Start the CV Pipeline
In a new terminal, launch the gesture analysis:
```bash
python cv_pipelines/gesture/alert_router.py
```

---

## 🛠️ Setup Instructions

### 1. Prerequisites
- Python 3.9+ | Node.js 18+
- NVIDIA GPU with CUDA (recommended)
- Webcam

### 2. Installation
```bash
# Backend & CV
pip install -r requirements.txt

# Frontend
cd "modern frontend"
npm install
```

---

## 🧪 Testing the Integration

1.  **Open the Dashboard**: Go to `http://localhost:3000`.
2.  **Enable Live Feed**: Select **Camera 1**. You should see your webcam stream.
3.  **Perform a Gesture**: Stand back and perform a gesture (e.g., hands on head for `MEDICAL_EMERGENCY`).
4.  **Hold for 5s**: Watch the countdown in the CV window.
5.  **Verify**: The dashboard will show the alert, and the **Browser Tab Icon** will turn red.

---

## 🙋‍♂️ Redefining Poses & Calibration

If you need to change or retrain the security gestures:

1. **Collect Samples**:
   ```bash
   python cv_pipelines/gesture/calibrate.py --collect [gesture_name]
   ```
2. **Recalibrate**:
   ```bash
   python cv_pipelines/gesture/calibrate.py --calibrate
   ```

---

## 📂 Project Structure
- `backend/`: FastAPI application, routers, and SQLite DB.
- `cv_pipelines/`: Logic for Gesture (MediaPipe) and Crowd (YOLOv8).
- `modern frontend/`: Modern Next.js-powered SOC Dashboard.
- `models/`: Trained gesture classifiers and rule sets.
- `data/`: Sample landmark data (.npy) and SQLite database.
- `dashboard/`: Legacy Vite-powered React frontend (Reference only).
