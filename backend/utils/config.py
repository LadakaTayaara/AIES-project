"""
Application configuration — loaded from environment variables and .env file.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent


def _detect_device() -> str:
    """Detect best available compute device."""
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
    except ImportError:
        pass
    return "cpu"


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./hole_lotta_problems.db"

    # RF-DETR Model
    RFDETR_WEIGHTS_PATH: str = os.getenv(
        "RFDETR_WEIGHTS_PATH",
        str(BASE_DIR.parent / "ml" / "model" / "weights" / "rfdetr_pothole" / "best_checkpoint.pth")
    )
    CONFIDENCE_THRESHOLD: float = 0.35
    DEVICE: str = _detect_device()

    # Groq API (for LLM text processing)
    GROQ_API_KEY: str = ""

    # Twitter Bot
    TWITTER_API_KEY: str = ""
    TWITTER_API_SECRET: str = ""
    TWITTER_ACCESS_TOKEN: str = ""
    TWITTER_ACCESS_SECRET: str = ""

    # Thresholds
    HOTSPOT_THRESHOLD: int = 10

    # App
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
