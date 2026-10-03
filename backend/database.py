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
        }


class ForumPost(Base):
    """Community crowdsourcing & discussion post."""
    __tablename__ = "forum_posts"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    author_name = Column(String, default="Citizen Reporter")
    category = Column(String, default="identification")  # identification | hotspot | repair-update | general
    severity_tag = Column(String, default="unverified")   # minor | moderate | severe | unverified
    image_url = Column(String, nullable=True)
    pothole_id = Column(String, nullable=True)
    upvotes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self, comments_count=0):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "author_name": self.author_name,
            "category": self.category,
            "severity_tag": self.severity_tag,
            "image_url": self.image_url,
            "pothole_id": self.pothole_id,
            "upvotes": self.upvotes,
            "comments_count": comments_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ForumComment(Base):
    """Comment on a forum discussion post."""
    __tablename__ = "forum_comments"

    id = Column(String, primary_key=True)
    post_id = Column(String, nullable=False)
    author_name = Column(String, default="Community Member")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "post_id": self.post_id,
            "author_name": self.author_name,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
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
