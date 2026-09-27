import torch
from pydantic_settings import BaseSettings

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./hole_lotta_problems.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", str(BASE_DIR.parent / "ml" / "model" / "weights" / "yolov8_pothole" / "weights" / "best.pt"))
    DEVICE: str = "cuda" if torch.cuda.is_available() else "cpu"
    GROQ_API_KEY: str = ""
    TWITTER_API_KEY: str = ""
    TWITTER_API_SECRET: str = ""
    TWITTER_ACCESS_TOKEN: str = ""
    TWITTER_ACCESS_SECRET: str = ""
    HOTSPOT_THRESHOLD: int = 10
    DEBUG: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
