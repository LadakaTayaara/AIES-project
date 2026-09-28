"""
Dashboard API — municipality-facing analytics and priority lists.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db, Report

router = APIRouter()


@router.get("/summary")
async def get_dashboard_summary(
    city: str = "all",
    db: Session = Depends(get_db),
):
    """
    Municipality dashboard — comprehensive overview with stats,
    severity breakdown, status distribution, and recent reports.
    """
    query = db.query(Report)
    if city != "all":
        query = query.filter(Report.city == city)

    all_reports = query.all()
    total = len(all_reports)

    # Severity breakdown
    severity_counts = {"minor": 0, "moderate": 0, "severe": 0, "unknown": 0}
    for r in all_reports:
        key = r.severity if r.severity in severity_counts else "unknown"
        severity_counts[key] += 1

    # Status breakdown
    status_counts = {"reported": 0, "escalated": 0, "in-repair": 0, "resolved": 0}
    for r in all_reports:
        key = r.status if r.status in status_counts else "reported"
        status_counts[key] += 1

    # Average confidence
    confidences = [r.confidence for r in all_reports if r.confidence and r.confidence > 0]
    avg_confidence = round(sum(confidences) / max(len(confidences), 1), 3)

    # Recent reports (last 10)
    recent = sorted(all_reports, key=lambda r: r.created_at or datetime.min, reverse=True)[:10]

    # Reports in last 24 hours
    cutoff = datetime.utcnow() - timedelta(hours=24)
    recent_24h = sum(1 for r in all_reports if r.created_at and r.created_at > cutoff)

    # Road Health Index (inline calculation)
    active = [r for r in all_reports if r.status != "resolved"]
    severity_weight = {"minor": 1, "moderate": 3, "severe": 5}
    weighted_sum = sum(severity_weight.get(r.severity, 1) for r in active)
    rhi = max(0, round(100 - (weighted_sum / 500) * 100, 1))

    return {
        "total_reports": total,
        "severity_breakdown": severity_counts,
        "status_breakdown": status_counts,
        "avg_confidence": avg_confidence,
        "reports_last_24h": recent_24h,
        "road_health_index": rhi,
        "recent_reports": [r.to_dict() for r in recent],
    }


@router.get("/priority-list")
async def get_priority_list(
    city: str = "all",
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """
    Severity-ranked repair priority list for municipality.
    Returns unresolved reports sorted by severity (severe first)
    and then by report age (oldest first).
    """
    severity_order = {"severe": 0, "moderate": 1, "minor": 2, "unknown": 3}

    query = db.query(Report).filter(Report.status.in_(["reported", "escalated"]))
    if city != "all":
        query = query.filter(Report.city == city)

    reports = query.all()

    # Sort by severity (severe first), then by age (oldest first)
    reports.sort(key=lambda r: (
        severity_order.get(r.severity, 3),
        r.created_at or datetime.max,
    ))

    return {
        "priority_list": [r.to_dict() for r in reports[:limit]],
        "total_pending": len(reports),
    }


@router.get("/stats/timeline")
async def get_timeline_stats(
    days: int = 7,
    db: Session = Depends(get_db),
):
    """
    Report submission timeline — how many reports per day over the last N days.
    """
    cutoff = datetime.utcnow() - timedelta(days=days)
    reports = db.query(Report).filter(Report.created_at >= cutoff).all()

    # Group by date
    daily = {}
    for r in reports:
        if r.created_at:
            day = r.created_at.strftime("%Y-%m-%d")
            daily[day] = daily.get(day, 0) + 1

    # Fill missing days with 0
    timeline = []
    for i in range(days):
        date = (datetime.utcnow() - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        timeline.append({"date": date, "count": daily.get(date, 0)})

    return {"timeline": timeline, "total": sum(d["count"] for d in timeline)}
