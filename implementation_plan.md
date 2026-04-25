# Agentic Premier League — Venue Security Platform

A real-time, AI-powered stadium security platform. The system combines two independent CV pipelines — an overhead **body-pose gesture** silent alert system and a crowd density monitor — unified through a FastAPI event bus and a live React security dashboard.

**Hardware target:** CUDA-enabled NVIDIA GPU (all CV inference runs on GPU via CUDA).

---

## Decisions & Assumptions

| Topic | Decision |
|---|---|
| GPU | CUDA on NVIDIA GPU for all inference (YOLOv8, MediaPipe Pose) |
| Camera (prototype) | Laptop webcam or uploaded video file |
| Cameras at launch | 1 camera (single-camera prototype) |
| Database | SQLite (MVP) |
| Venue map | User-supplied image with camera locations marked by red squares |
| Gesture modality | Full-body **overhead pose** gestures via **MediaPipe Pose** (not hand gestures) |
| Gesture hold time | **5 seconds** |
| Gesture dataset | **10–20 images per gesture** sufficient — see classifier approach below |

> [!NOTE]
> **Why 10–20 images is enough:** These 4 gestures are geometrically extreme and highly distinct from each other. The primary classifier is **rule-based** — it computes ratios directly from pose landmark coordinates (wrist spread, elbow distance, wrist crossing, wrist-to-head proximity). It needs **zero training images** to run; the 10–20 images per gesture are used only to *calibrate the numeric thresholds* for each rule. A **KNN (K=1–3)** model is available as a configurable fallback, also trained on the same small dataset. Both approaches work reliably because the 99-float landmark space is low-dimensional and these poses are well-separated.

---

## System Architecture

```
Camera Input (webcam / video file)
         │
         ▼
Frame Capture Service (Python + OpenCV)
         │
         ├──────────────────────────────────────────────┐
         ▼                                              ▼
Gesture Detection Pipeline                 Crowd Analysis Pipeline
  MediaPipe Pose (GPU)                       YOLOv8n (CUDA, person)
       ↓                                           ↓
Body Landmark Extractor               Zone Density Estimator
       ↓                                    ByteTrack (ID tracking)
Geometric Gesture Classifier                      ↓
  (rule-based thresholds)             Threshold Alert Router
  + KNN fallback (K=1)
       ↓
GestureHoldBuffer (5s)
       ↓
Alert Router
         │
         ▼
FastAPI Event Bus (internal queue → WebSocket)
         │
         ├── SQLite (alert log + snapshots)
         │
         ▼
Security Dashboard (React)
  ├── Live Camera Feed
  ├── Venue Heatmap (user-supplied floor-plan image overlay)
  ├── Alert Feed
  └── Entry/Exit Counter
```

---

## Gesture Specification

Detection model: **MediaPipe Pose** — returns 33 full-body 3D landmarks per frame.
Hold time: **5 seconds** of consistent classification before alert fires.

| Alert Type | Gesture | Skeletal Landmark Geometry | Hold Time |
|---|---|---|---|
| **General Alert** | The "Y" Shape — arms raised high, angled slightly outward, hands wide apart | Open geometry: wrists are furthest apart, elbows straight, high vertical bounding box | 5s |
| **Medical Emergency** | The "O" / Halo — fingertips touching high above head, elbows bowed outward | Closed loop: wrists close/touching, elbows pushed far horizontally, diamond/circle shape | 5s |
| **Theft / Suspicious** | Hands flat on crown of head, palms down, elbows pointing sideways | Intersection: wrist landmarks intersect with head/nose landmarks, lower overall height | 5s |
| **Lost Person / Child** | The "X" Shape — wrists crossed tightly high above the head | Crossed geometry: wrist coordinates overlap or invert (left wrist on right side) | 5s |

> [!NOTE]
> Because these are full-body poses, **MediaPipe Pose** is used instead of MediaPipe Hands. The classifier input vector is the 33-landmark set (99 floats: x, y, z per landmark), normalized relative to the hip midpoint so body size/distance from camera does not affect classification.

---

## Proposed Changes

### Phase 1 — Gesture Detection Pipeline

**Goal:** Detect predefined overhead body poses from the camera stream and route classified alerts to the backend.

---

#### [NEW] `cv_pipelines/gesture/frame_capture.py`

Opens a webcam index (`0`) or a video file path via OpenCV. Pushes frames into a thread-safe queue consumed by downstream pipeline workers.

```python
import cv2
import queue

def stream_frames(source, frame_queue: queue.Queue):
    """source: int (webcam index) or str (video file path)"""
    cap = cv2.VideoCapture(source)
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if not frame_queue.full():
            frame_queue.put(frame)
    cap.release()
```

---

#### [NEW] `cv_pipelines/gesture/landmark_extractor.py`

Uses **MediaPipe Pose** to extract 33 full-body 3D landmarks per frame. Normalizes landmark coordinates relative to the hip midpoint (landmark indices 23 & 24) so the classifier is invariant to distance from camera. Returns `None` if no person is detected.

```python
import mediapipe as mp
import numpy as np
import cv2

mp_pose = mp.solutions.pose

def extract_landmarks(frame):
    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        enable_segmentation=False,
    ) as pose:
        results = pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        if not results.pose_landmarks:
            return None
        lms = results.pose_landmarks.landmark
        hip_x = (lms[23].x + lms[24].x) / 2
        hip_y = (lms[23].y + lms[24].y) / 2
        hip_z = (lms[23].z + lms[24].z) / 2
        return [(lm.x - hip_x, lm.y - hip_y, lm.z - hip_z) for lm in lms]
```

---

#### [NEW] `cv_pipelines/gesture/classifier.py`

Two classifiers are implemented; the active one is selected via `config.py`.

**Primary — Geometric Rule-Based Classifier:**
Computes ratios directly from landmark indices. No model file required. Thresholds are loaded from `models/gesture_thresholds.json` (generated by `calibrate.py` from 10–20 images per gesture).

```python
import json
import numpy as np

class GeometricGestureClassifier:
    def __init__(self, thresholds_path="models/gesture_thresholds.json"):
        with open(thresholds_path) as f:
            self.t = json.load(f)

    def predict(self, landmarks) -> str:
        lms = np.array(landmarks)           # shape (33, 3)
        l_wrist, r_wrist = lms[15], lms[16]
        l_elbow, r_elbow = lms[13], lms[14]
        nose             = lms[0]

        wrist_dist      = np.linalg.norm(l_wrist - r_wrist)
        wrist_height    = (l_wrist[1] + r_wrist[1]) / 2      # lower y = higher up
        elbow_spread    = abs(l_elbow[0] - r_elbow[0])
        wrists_near_head = np.linalg.norm((l_wrist + r_wrist) / 2 - nose)
        wrists_crossed  = l_wrist[0] > r_wrist[0]            # True when X shape

        if wrists_near_head < self.t["head_proximity"]:
            return "theft_suspicious"         # hands on head
        if wrists_crossed and wrist_height < self.t["high_threshold"]:
            return "lost_person"              # X shape
        if wrist_dist > self.t["y_spread"] and wrist_height < self.t["high_threshold"]:
            return "general_alert"            # Y shape
        if elbow_spread > self.t["o_elbow_spread"]:
            return "medical_emergency"        # O / halo shape
        return "none"
```

**Fallback — KNN Classifier (K=1):**
Stores the mean landmark vector of calibration images per gesture. Classifies live frames by nearest Euclidean distance. Fitted on the same 10–20 images per gesture.

```python
from sklearn.neighbors import KNeighborsClassifier
import joblib

def classify_knn(landmarks, model: KNeighborsClassifier) -> str:
    flat = [coord for lm in landmarks for coord in lm]   # 99 floats
    return model.predict([flat])[0]
```

**Hold buffer (shared by both):**

```python
class GestureHoldBuffer:
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
            self.buffer.clear()
            return confirmed
        return None
```

---

#### [NEW] `cv_pipelines/gesture/calibrate.py`

**Calibration CLI — replaces a full training pipeline.**

- `--collect <label>` — opens webcam, captures ~10–20 landmark frames while you hold a gesture, saves to `data/<label>.npy`
- `--calibrate` — reads all `.npy` files, computes per-gesture threshold values (wrist spread, elbow distance, etc.), writes `models/gesture_thresholds.json`
- `--train-knn` — fits a KNN (K=1) on the same data, saves `models/gesture_knn.pkl` as fallback

Calibration requirements per gesture:
- **10–20 frames** captured while holding the gesture steady
- Vary distance from camera slightly (1 m, 1.5 m, 2 m) across captures
- Re-run if camera angle or mounting position changes significantly

---

#### [NEW] `cv_pipelines/gesture/alert_router.py`

Accepts confirmed gesture label + camera/frame metadata and POSTs a structured alert event to the FastAPI `/alerts/ingest` endpoint.

---

### Phase 2 — Crowd Density Pipeline

**Goal:** Track person counts per venue zone using YOLOv8 on CUDA, flag density thresholds, and count directional crossings at entry/exit points.

---

#### [NEW] `cv_pipelines/crowd/detector.py`

Runs **YOLOv8n** with `device='cuda'` on each frame, filtering to `class=0` (person). Returns bounding boxes.

```python
from ultralytics import YOLO

model = YOLO("yolov8n.pt")
model.to("cuda")

def detect_persons(frame):
    results = model(frame, classes=[0], device="cuda", verbose=False)
    return results[0].boxes.xyxy.cpu().numpy()
```

---

#### [NEW] `cv_pipelines/crowd/zone_mapper.py`

Defines venue zones as polygon regions parsed from the user-supplied floor-plan image (zones are registered once at startup via a config file mapping zone IDs to pixel-coordinate polygons). Maps each detected person centroid to its zone. Returns `{zone_id: count}`.

---

#### [NEW] `cv_pipelines/crowd/tracker.py`

Wraps **ByteTrack** (via Ultralytics `model.track()`) to assign persistent IDs across frames. Detects directional line-crossings at entry/exit gate lines and increments in/out counters.

---

#### [NEW] `cv_pipelines/crowd/threshold_router.py`

Monitors zone density over a sliding time window. Fires a crowd alert when:
- Any zone exceeds a configured count threshold
- A zone remains over-capacity for more than N minutes (dwell alert)

---

### Phase 3 — FastAPI Backend & Event Bus

**Goal:** Receive alert events from CV pipelines, persist to SQLite, and push live to the dashboard over WebSocket.

---

#### [NEW] `backend/main.py`

FastAPI app entry point. Mounts routers, initialises SQLite DB on startup.

---

#### [NEW] `backend/routers/alerts.py`

- `POST /alerts/ingest` — receives structured alert payload from CV workers
- `GET /alerts/history` — returns paginated alert history from SQLite
- `WebSocket /ws/alerts` — pushes new alert events to all connected dashboard clients

**Alert Schema:**

```json
{
  "timestamp": "2026-04-24T14:32:11Z",
  "camera_id": "cam_01",
  "alert_type": "medical_emergency",
  "confidence": 0.94,
  "zone": "A3",
  "snapshot_url": "/snapshots/abc123.jpg"
}
```

---

#### [NEW] `backend/routers/crowd.py`

- `POST /crowd/density` — receives zone density snapshots from crowd pipeline
- `GET /crowd/current` — returns current zone counts for heatmap rendering

---

#### [NEW] `backend/db/models.py`

SQLAlchemy ORM models (SQLite):
- `Alert` — `id`, `timestamp`, `camera_id`, `alert_type`, `confidence`, `zone`, `snapshot_path`, `acknowledged`
- `ZoneDensitySnapshot` — `id`, `timestamp`, `zone_id`, `count`

---

#### [NEW] `backend/db/database.py`

SQLite connection via SQLAlchemy sync engine. DB file path from `.env` (default: `data/venue.db`).

---

#### [NEW] `backend/websocket/manager.py`

Maintains active WebSocket connections. Broadcasts JSON alert payload to all clients on new event.

---

#### [NEW] `backend/config.py`

Pydantic `Settings` from `.env`:
- `CAMERA_SOURCE` — webcam index or video file path
- `SQLITE_DB_PATH`
- `ALERT_CONFIDENCE_THRESHOLD`
- `ZONE_DENSITY_LIMIT`
- `FLOORPLAN_IMAGE_PATH` — path to user-supplied venue map image
- `CLASSIFIER_MODE` — `"geometric"` (default) or `"knn"`

---

### Phase 4 — React Security Dashboard

**Goal:** Real-time ops dashboard for security staff.

---

#### [NEW] `dashboard/src/pages/Dashboard.tsx`

Main grid layout page. Connects to WebSocket on mount.

---

#### [NEW] `dashboard/src/components/CameraFeed.tsx`

Single MJPEG `<img>` stream (or video element for file playback). Overlays an alert badge when an active alert exists for this camera.

---

#### [NEW] `dashboard/src/components/VenueHeatmap.tsx`

Renders the **user-supplied floor-plan image** as a base layer. Overlays semi-transparent SVG zone polygons on top, coloured by density (green → yellow → red). Camera positions (red squares from the floor plan) are preserved from the base image. Updates every 5s from the crowd density API.

---

#### [NEW] `dashboard/src/components/AlertFeed.tsx`

Real-time list of alerts (newest first). Each card: alert type icon, gesture name, camera ID, zone, timestamp, confidence bar, Acknowledge/Dismiss actions.

---

#### [NEW] `dashboard/src/components/EntryExitCounter.tsx`

Recharts line chart of cumulative entry/exit counts over session time.

---

#### [NEW] `dashboard/src/hooks/useAlertSocket.ts`

Custom React hook: opens `WebSocket /ws/alerts`, parses JSON, appends to alert state list.

---

#### [NEW] `dashboard/src/api/client.ts`

Axios client: `fetchAlertHistory()`, `fetchCurrentDensity()`, `acknowledgeAlert(id)`.

---

### Phase 5 — Packaging & Deployment

**Goal:** Docker Compose setup to run the full stack locally on a CUDA GPU machine.

---

#### [NEW] `deploy/docker-compose.yml`

Single-machine compose file:
- `cv_gesture` service — runs gesture pipeline with NVIDIA runtime
- `cv_crowd` service — runs crowd detection pipeline with NVIDIA runtime
- `backend` service — FastAPI + SQLite
- `dashboard` service — Vite dev server or nginx static build

---

#### [NEW] `.env.example`

```ini
CAMERA_SOURCE=0                     # 0 = laptop webcam, or path to .mp4
SQLITE_DB_PATH=data/venue.db
ALERT_CONFIDENCE_THRESHOLD=0.85
ZONE_DENSITY_LIMIT=50
FLOORPLAN_IMAGE_PATH=assets/floorplan.png
CLASSIFIER_MODE=geometric           # geometric | knn
```

---

## Complete File Tree

```
Agentic-Premier-League/
├── cv_pipelines/
│   ├── gesture/
│   │   ├── frame_capture.py         # webcam / video file input
│   │   ├── landmark_extractor.py    # MediaPipe Pose, hip-normalized
│   │   ├── classifier.py            # Geometric classifier + KNN fallback + GestureHoldBuffer (5s)
│   │   ├── calibrate.py             # 10–20 image/gesture calibration CLI
│   │   └── alert_router.py          # POST to FastAPI
│   └── crowd/
│       ├── detector.py              # YOLOv8n on CUDA
│       ├── zone_mapper.py           # centroid → zone polygon lookup
│       ├── tracker.py               # ByteTrack entry/exit line crossing
│       └── threshold_router.py      # density + dwell alerts
├── models/
│   ├── gesture_thresholds.json      # calibrated geometry thresholds (primary)
│   └── gesture_knn.pkl              # KNN fallback model
├── data/                            # landmark .npy files from calibration (10–20/gesture)
├── assets/
│   └── floorplan.png                # user-supplied venue map (to be added)
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── routers/
│   │   ├── alerts.py
│   │   └── crowd.py
│   ├── db/
│   │   ├── database.py              # SQLite via SQLAlchemy
│   │   └── models.py
│   └── websocket/
│       └── manager.py
├── dashboard/
│   └── src/
│       ├── pages/Dashboard.tsx
│       ├── components/
│       │   ├── CameraFeed.tsx
│       │   ├── VenueHeatmap.tsx     # floor-plan image + SVG zone overlay
│       │   ├── AlertFeed.tsx
│       │   └── EntryExitCounter.tsx
│       ├── hooks/useAlertSocket.ts
│       └── api/client.ts
├── deploy/
│   └── docker-compose.yml
├── .env.example
└── implementation_plan.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Computer Vision | Python, OpenCV, MediaPipe Pose (GPU), Ultralytics YOLOv8 + ByteTrack |
| GPU Inference | CUDA (NVIDIA GPU) |
| ML (Gesture) | Geometric rule-based (primary) + scikit-learn KNN fallback, joblib |
| Backend | FastAPI, SQLAlchemy, SQLite |
| Frontend | React (Vite), Recharts, Axios |
| Deployment | Docker Compose with NVIDIA container runtime |

---

## Build Order & Timeline

| Phase | Scope | Estimate |
|---|---|---|
| 1 | Gesture prototype — webcam → MediaPipe Pose → geometric classifier → hold buffer → print alert | 1–2 days |
| 2 | `calibrate.py` — collect 10–20 samples/gesture, calibrate thresholds, validate KNN fallback | 0.5–1 day |
| 3 | Crowd counter — YOLOv8n on same feed, zone counts, threshold alerts | 1–2 days |
| 4 | FastAPI event bus + SQLite + WebSocket | 2–3 days |
| 5 | React dashboard — camera feed, heatmap overlay, alert feed | 3–4 days |
| 6 | Docker Compose packaging + GPU integration test | 1–2 days |

---

## Verification Plan

### Automated Tests

- `pytest cv_pipelines/gesture/` — landmark extractor, hold buffer timing, geometric classifier rules
- `pytest backend/` — alert ingest → SQLite write → WebSocket broadcast (mock CV events)
- `pytest cv_pipelines/crowd/` — zone mapping correctness, threshold logic

### Manual Verification

- **Phase 1:** Run `calibrate.py --collect <label>` for each of the 4 gestures (10–20 captures each), then `--calibrate`. Hold each gesture in front of webcam for 5s; confirm correct label fires via geometric classifier. Run `--train-knn` and compare accuracy.
- **Phase 3:** `wscat -c ws://localhost:8000/ws/alerts` while posting `curl -X POST /alerts/ingest` — confirm real-time broadcast.
- **Phase 4:** Open dashboard, trigger test alerts; confirm Alert Feed updates, camera feed badge appears, heatmap zone colour changes.
- **Phase 5:** Run full Docker Compose stack; verify end-to-end pipeline on a test video file at 15+ FPS on GPU.