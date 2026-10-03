"""
Hole Lotta Problems — FastAPI Application Entry Point

Serves the REST API for pothole detection and a modern web dashboard.
"""

import os
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from api import reports, heatmap, dashboard, health, forum
from database import init_db

# ── Logging setup ────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-12s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("main")

# ── FastAPI app ──────────────────────────────────────────────────────
app = FastAPI(
    title="Hole Lotta Problems API",
    description="AI-powered Urban Road Intelligence Platform — RF-DETR based pothole detection",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes ───────────────────────────────────────────────────────
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(heatmap.router, prefix="/api/heatmap", tags=["Heatmap"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(forum.router, prefix="/api/forum", tags=["Forum"])

# ── Static file serving ─────────────────────────────────────────────
BASE_DIR = Path(__file__).parent

# Uploaded images
uploads_dir = BASE_DIR / "uploads"
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Annotated images
annotated_dir = BASE_DIR / "annotated"
annotated_dir.mkdir(exist_ok=True)
app.mount("/annotated", StaticFiles(directory=str(annotated_dir)), name="annotated")

# Web dashboard (static frontend)
static_dir = BASE_DIR / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


# ── Root — serve web dashboard ───────────────────────────────────────
@app.get("/")
async def serve_dashboard():
    """Serve the web dashboard."""
    index_path = static_dir / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {
        "message": "Hole Lotta Problems API v2.0 🕳️",
        "docs": "/docs",
        "dashboard": "Place index.html in backend/static/ to enable web dashboard",
    }


@app.get("/tactical")
async def serve_tactical():
    """Serve the Tactical Road Telemetry & Civic Dispatch dashboard."""
    tactical_path = static_dir / "tactical.html"
    if tactical_path.exists():
        return FileResponse(str(tactical_path))
    return {"message": "Tactical dashboard not found. Please verify backend/static/tactical.html exists."}


# ── Startup event ────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    logger.info("=" * 60)
    logger.info("  Hole Lotta Problems API v2.0")
    logger.info("  AI-Powered Road Intelligence Platform")
    logger.info("=" * 60)

    # Initialize database
    init_db()
    logger.info("Database initialized ✓")

    # Pre-load detection model (non-blocking — will load on first request if this fails)
    try:
        from services.detection import load_model
        model, model_type = load_model()
        if model:
            logger.info(f"RF-DETR model loaded ✓ (type: {model_type})")
        else:
            logger.warning("RF-DETR model not available — install with: pip install rfdetr")
    except Exception as e:
        logger.warning(f"Model pre-load skipped: {e}")

    logger.info("API ready at http://0.0.0.0:8000")
    logger.info("Dashboard at http://0.0.0.0:8000/")
    logger.info("API docs at http://0.0.0.0:8000/docs")
    logger.info("=" * 60)
