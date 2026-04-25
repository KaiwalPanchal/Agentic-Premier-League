from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from backend.db.database import get_db
from backend.db.models import Alert
from backend.websocket.manager import manager

router = APIRouter(prefix="/alerts", tags=["alerts"])

class AlertPayload(BaseModel):
    timestamp: str
    camera_id: str
    alert_type: str
    confidence: float
    zone: str
    snapshot_url: Optional[str] = None

class AlertResponse(AlertPayload):
    id: int
    acknowledged: bool

    class Config:
        orm_mode = True

@router.post("/ingest", response_model=AlertResponse, status_code=201)
async def ingest_alert(payload: AlertPayload, db: Session = Depends(get_db)):
    # 1. Save to database
    db_alert = Alert(
        timestamp=datetime.fromisoformat(payload.timestamp.replace("Z", "+00:00")),
        camera_id=payload.camera_id,
        alert_type=payload.alert_type,
        confidence=payload.confidence,
        zone=payload.zone,
        snapshot_url=payload.snapshot_url
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    
    # 2. Broadcast to all connected WebSocket clients
    alert_data = {
        "id": db_alert.id,
        "timestamp": db_alert.timestamp.isoformat(),
        "camera_id": db_alert.camera_id,
        "alert_type": db_alert.alert_type,
        "confidence": db_alert.confidence,
        "zone": db_alert.zone,
        "snapshot_url": db_alert.snapshot_url,
        "acknowledged": db_alert.acknowledged
    }
    await manager.broadcast({"type": "NEW_ALERT", "data": alert_data})
    
    return db_alert

@router.get("/history", response_model=List[AlertResponse])
def get_alert_history(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    alerts = db.query(Alert).order_by(Alert.timestamp.desc()).offset(skip).limit(limit).all()
    return alerts

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # We don't expect messages from the client right now, but we need to keep connection open
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
