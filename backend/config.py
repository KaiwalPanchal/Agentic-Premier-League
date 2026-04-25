from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    SQLITE_DB_PATH: str = os.path.join(os.path.dirname(__file__), "..", "data", "venue.db")
    CAMERA_SOURCE: str = "0"
    ALERT_CONFIDENCE_THRESHOLD: float = 0.85
    ZONE_DENSITY_LIMIT: int = 50
    FLOORPLAN_IMAGE_PATH: str = "assets/floorplan.png"
    CLASSIFIER_MODE: str = "geometric"

    class Config:
        env_file = ".env"

settings = Settings()
