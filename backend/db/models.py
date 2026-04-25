from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from backend.db.database import Base
from datetime import datetime

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    camera_id = Column(String, index=True)
    alert_type = Column(String, index=True)
    confidence = Column(Float)
    zone = Column(String)
    snapshot_url = Column(String, nullable=True)
    acknowledged = Column(Boolean, default=False)

class ZoneDensitySnapshot(Base):
    __tablename__ = "zone_density_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    zone_id = Column(String, index=True)
    count = Column(Integer)
