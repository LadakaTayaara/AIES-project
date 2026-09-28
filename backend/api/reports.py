"""
Reports API — submit, query, and manage pothole reports.

All endpoints are fully implemented with SQLite persistence.
"""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, Report
from services.detection import run_detection

router = APIRouter()


# ── Response models ──────────────────────────────────────────────────

class ReportResponse(BaseModel):
    report_id: str
    severity: str
    confidence: float
    lat: float
    lng: float
    status: str
    image_url: Optional[str] = None
    annotated_image_url: Optional[str] = None
    num_detections: int = 0
    description: Optional[str] = None
    created_at: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/submit", response_model=ReportResponse)
async def submit_report(
    image: UploadFile = File(...),
    lat: float = Form(...),
    lng: float = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Submit a pothole report with image and GPS coordinates.
    RF-DETR runs detection and severity classification automatically.
    Returns the processed report with detection results.
    """
    # Validate image
    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file must be an image (JPEG, PNG, etc.)"
        )

    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image file")

    # Validate coordinates
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        raise HTTPException(
            status_code=400,
            detail="Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180."
        )

    # Run RF-DETR detection
    result = await run_detection(image_bytes, lat, lng, description)

    # Persist to database
    report = Report(
        id=result["report_id"],
        image_path=result.get("image_path"),
        annotated_image_path=result.get("annotated_image_path"),
        lat=result["lat"],
        lng=result["lng"],
        severity=result["severity"],
        confidence=result["confidence"],
        description=description,
        status="reported",
        city="unknown",
        detections_json=json.dumps(result.get("detections", [])),
        num_detections=result.get("num_detections", 0),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return ReportResponse(
        report_id=report.id,
        severity=report.severity,
        confidence=report.confidence,
        lat=report.lat,
        lng=report.lng,
        status=report.status,
        image_url=report.image_path,
        annotated_image_url=report.annotated_image_path,
        num_detections=report.num_detections,
        description=report.description,
        created_at=report.created_at.isoformat() if report.created_at else None,
    )


@router.get("/nearby")
async def get_nearby_reports(
    lat: float,
    lng: float,
    radius_km: float = 2.0,
    db: Session = Depends(get_db),
):
    """
    Fetch all reports within a given radius of coordinates.
    Uses simple Euclidean distance approximation for SQLite
    (accurate enough for city-scale queries).
    """
    # Approximate degrees per km (at mid-latitudes)
    lat_delta = radius_km / 111.0
    lng_delta = radius_km / (111.0 * max(0.01, abs(__import__("math").cos(__import__("math").radians(lat)))))

    reports = (
        db.query(Report)
        .filter(
            Report.lat.between(lat - lat_delta, lat + lat_delta),
            Report.lng.between(lng - lng_delta, lng + lng_delta),
        )
        .order_by(Report.created_at.desc())
        .limit(100)
        .all()
    )

    return {
        "center": {"lat": lat, "lng": lng},
        "radius_km": radius_km,
        "count": len(reports),
        "reports": [r.to_dict() for r in reports],
    }


@router.get("/all")
async def get_all_reports(
    limit: int = 50,
    offset: int = 0,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Get all reports with optional filtering and pagination.
    """
    query = db.query(Report)

    if severity:
        query = query.filter(Report.severity == severity)
    if status:
        query = query.filter(Report.status == status)

    total = query.count()
    reports = (
        query
        .order_by(Report.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "reports": [r.to_dict() for r in reports],
    }


@router.get("/{report_id}")
async def get_report(report_id: str, db: Session = Depends(get_db)):
    """
    Get a single report by ID with full details.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report.to_dict()


@router.patch("/{report_id}/status")
async def update_status(
    report_id: str,
    body: StatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Update report status — for municipality dashboard use.
    Valid statuses: reported, escalated, in-repair, resolved
    """
    valid_statuses = {"reported", "escalated", "in-repair", "resolved"}
    if body.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = body.status
    report.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(report)

    return report.to_dict()


@router.delete("/{report_id}")
async def delete_report(report_id: str, db: Session = Depends(get_db)):
    """
    Delete a report by ID.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    db.delete(report)
    db.commit()

    return {"message": "Report deleted", "report_id": report_id}
