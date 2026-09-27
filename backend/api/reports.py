from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from services.detection import run_detection
from services.clustering import cluster_reports

router = APIRouter()

class ReportResponse(BaseModel):
    report_id: str
    severity: str          # minor | moderate | severe
    confidence: float
    lat: float
    lng: float
    status: str            # reported | escalated | in-repair | resolved

@router.post("/submit", response_model=ReportResponse)
async def submit_report(
    image: UploadFile = File(...),
    lat: float = Form(...),
    lng: float = Form(...),
    description: Optional[str] = Form(None)
):
    """
    Submit a pothole report with image and GPS coordinates.
    YOLOv8 runs detection and severity classification automatically.
    """
    image_bytes = await image.read()
    result = await run_detection(image_bytes, lat, lng, description)
    return result

@router.get("/nearby")
async def get_nearby_reports(lat: float, lng: float, radius_km: float = 2.0):
    """
    Fetch all reports within a given radius of coordinates.
    """
    pass

@router.get("/{report_id}")
async def get_report(report_id: str):
    """
    Get a single report by ID with full status history.
    """
    pass

@router.patch("/{report_id}/status")
async def update_status(report_id: str, status: str):
    """
    Update report status — for municipality dashboard use.
    """
    pass
