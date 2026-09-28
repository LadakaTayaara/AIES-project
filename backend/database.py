"""
Database layer for Hole Lotta Problems.
Uses SQLite with SQLAlchemy ORM for zero-config persistence.
"""

import os
import json
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, String, Float, Text,
    DateTime, Integer, event
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "hole_lotta_problems.db")

engine = create_engine(
    f"sqlite:///{DATABASE_PATH}",
    echo=False,
    connect_args={"check_same_thread": False}  # Required for SQLite + FastAPI
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Report(Base):
    """Pothole report with detection results, GPS, and status tracking."""
    __tablename__ = "reports"

    id = Column(String, primary_key=True)
    image_path = Column(String, nullable=True)
    annotated_image_path = Column(String, nullable=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    severity = Column(String, nullable=False, default="unknown")
    confidence = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    status = Column(String, default="reported")
    city = Column(String, default="unknown")
    detections_json = Column(Text, nullable=True)
    num_detections = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Serialize report to dictionary for API responses."""
        return {
            "report_id": self.id,
            "image_url": self.image_path,
            "annotated_image_url": self.annotated_image_path,
            "lat": self.lat,
            "lng": self.lng,
            "severity": self.severity,
            "confidence": self.confidence,
            "description": self.description,
            "status": self.status,
            "city": self.city,
            "num_detections": self.num_detections,
            "detections": json.loads(self.detections_json) if self.detections_json else [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


def init_db():
    """Create all tables if they don't exist."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency — yields a DB session and auto-closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
