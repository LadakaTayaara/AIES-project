"""
Health check & system info endpoint.
"""

import os
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check — confirms the API is live."""

    # Check model availability
    model_status = "unknown"
    try:
        from services.detection import load_model
        model, model_type = load_model()
        if model is not None:
            model_status = f"loaded ({model_type})"
        else:
            model_status = "not loaded"
    except Exception:
        model_status = "error"

    # Check database
    db_status = "unknown"
    try:
        from database import SessionLocal, Report
        with SessionLocal() as db:
            count = db.query(Report).count()
            db_status = f"ok ({count} reports)"
    except Exception:
        db_status = "error"

    return {
        "status": "ok",
        "service": "Hole Lotta Problems API",
        "model": model_status,
        "database": db_status,
    }
