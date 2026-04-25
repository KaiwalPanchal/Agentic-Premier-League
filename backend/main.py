from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db.database import engine, Base
from backend.routers import alerts, crowd, video
import os

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Agentic Premier League Backend")

# Allow CORS for the dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(alerts.router)
app.include_router(crowd.router)
app.include_router(video.router)

@app.get("/")
def read_root():
    return {"message": "Agentic Premier League Backend is running"}
