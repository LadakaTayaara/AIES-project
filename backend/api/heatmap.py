"""
Heatmap API — real-time pothole density and hotspot data for map visualization.
"""

import math
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db, Report

router = APIRouter()


@router.get("/data")
async def get_heatmap_data(
    city: str = "all",
    min_severity: str = "minor",
    db: Session = Depends(get_db),
):
    """
    Returns GPS coordinates + severity weights for map rendering.
    Pulls real data from the database.
    """
    severity_order = {"minor": 0, "moderate": 1, "severe": 2}
    min_level = severity_order.get(min_severity, 0)

    query = db.query(Report).filter(
        Report.severity.in_(
            [s for s, level in severity_order.items() if level >= min_level]
        )
    )

    if city != "all":
        query = query.filter(Report.city == city)

    reports = query.order_by(Report.created_at.desc()).limit(500).all()

    hotspots = []
    for r in reports:
        severity_label = r.severity.capitalize() if r.severity else "Unknown"
        # Map internal severity to display severity
        display_severity = {
            "minor": "Low",
            "moderate": "Medium",
            "severe": "Critical",
        }.get(r.severity, "Unknown")

        hotspots.append({
            "id": r.id,
            "coordinate": {"latitude": r.lat, "longitude": r.lng},
            "severity": display_severity,
            "confidence": r.confidence,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {"hotspots": hotspots, "count": len(hotspots)}


@router.get("/hotspots")
async def get_hotspots(
    city: str = "all",
    limit: int = 10,
    db: Session = Depends(get_db),
):
    """
    Returns top N hotspot clusters ranked by report frequency and severity.
    Groups nearby reports (within ~200m) into clusters.
    """
    query = db.query(Report)
    if city != "all":
        query = query.filter(Report.city == city)

    reports = query.all()

    if not reports:
        return {"hotspots": [], "count": 0}

    # Simple grid-based clustering (~200m cells)
    GRID_SIZE = 0.002  # ~200m in degrees
    clusters = defaultdict(list)

    for r in reports:
        grid_lat = round(r.lat / GRID_SIZE) * GRID_SIZE
        grid_lng = round(r.lng / GRID_SIZE) * GRID_SIZE
        clusters[(grid_lat, grid_lng)].append(r)

    # Score each cluster
    severity_weight = {"minor": 1, "moderate": 3, "severe": 5}
    scored_clusters = []

    for (lat, lng), report_list in clusters.items():
        score = sum(severity_weight.get(r.severity, 1) for r in report_list)
        avg_lat = sum(r.lat for r in report_list) / len(report_list)
        avg_lng = sum(r.lng for r in report_list) / len(report_list)

        # Dominant severity
        severities = [r.severity for r in report_list]
        dominant = max(set(severities), key=severities.count)

        scored_clusters.append({
            "center": {"lat": round(avg_lat, 6), "lng": round(avg_lng, 6)},
            "report_count": len(report_list),
            "score": score,
            "dominant_severity": dominant,
            "report_ids": [r.id for r in report_list[:5]],
        })

    # Sort by score descending
    scored_clusters.sort(key=lambda c: c["score"], reverse=True)

    return {
        "hotspots": scored_clusters[:limit],
        "count": len(scored_clusters[:limit]),
    }


@router.get("/road-health-index")
async def get_road_health_index(
    city: str = "all",
    db: Session = Depends(get_db),
):
    """
    Returns a Road Health Index score (0-100) computed from report data.

    Formula:
      RHI = 100 - (weighted_severity_sum / max_possible_score) * 100

    Where:
      - Each severe report = 5 points, moderate = 3, minor = 1
      - Max score is capped at 100 reports * 5 weight = 500
    """
    query = db.query(Report).filter(Report.status != "resolved")
    if city != "all":
        query = query.filter(Report.city == city)

    reports = query.all()

    if not reports:
        return {
            "road_health_index": 100.0,
            "total_active_reports": 0,
            "breakdown": {"minor": 0, "moderate": 0, "severe": 0},
            "assessment": "No reports — roads appear healthy",
        }

    severity_weight = {"minor": 1, "moderate": 3, "severe": 5}
    weighted_sum = sum(severity_weight.get(r.severity, 1) for r in reports)
    max_score = 500  # Cap

    rhi = max(0, 100 - (weighted_sum / max_score) * 100)

    breakdown = {"minor": 0, "moderate": 0, "severe": 0}
    for r in reports:
        if r.severity in breakdown:
            breakdown[r.severity] += 1

    if rhi >= 80:
        assessment = "Good — roads are in healthy condition"
    elif rhi >= 60:
        assessment = "Moderate — some areas need attention"
    elif rhi >= 40:
        assessment = "Poor — significant road damage reported"
    else:
        assessment = "Critical — widespread road damage, urgent repairs needed"

    return {
        "road_health_index": round(rhi, 1),
        "total_active_reports": len(reports),
        "breakdown": breakdown,
        "assessment": assessment,
    }
