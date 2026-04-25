from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, List
from datetime import datetime

from backend.db.database import get_db
from backend.db.models import ZoneDensitySnapshot

router = APIRouter(prefix="/crowd", tags=["crowd"])

class DensityPayload(BaseModel):
    timestamp: str
    camera_id: str
    zone_counts: Dict[str, int]

# In-memory cache of current zone counts for quick API response
# Format: { zone_id: count }
current_densities = {}

@router.post("/density", status_code=201)
async def update_density(payload: DensityPayload, db: Session = Depends(get_db)):
    global current_densities
    
    ts = datetime.fromisoformat(payload.timestamp.replace("Z", "+00:00"))
    
    # Update current cache
    current_densities.update(payload.zone_counts)
    
    # Optionally save snapshots to DB (might be high volume, consider batching)
    # For MVP, we save directly
    for zone_id, count in payload.zone_counts.items():
        snapshot = ZoneDensitySnapshot(
            timestamp=ts,
            zone_id=zone_id,
            count=count
        )
        db.add(snapshot)
    
    db.commit()
    return {"status": "success"}

@router.get("/current")
def get_current_density():
    return current_densities
