"""
Twitter Accountability Bot

Runs on a schedule. Checks the database for hotspot clusters that have
been unresolved for too long, generates accountability tweets via LLM,
and posts them tagging the relevant municipality.

Usage:
    python -m bot.twitter_bot
    (Run from the project root directory)
"""

import sys
import os
import logging

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s │ %(name)s │ %(message)s")
logger = logging.getLogger("twitter-bot")

# Municipality handle mapping — extend as needed
MUNICIPALITY_HANDLES = {
    "pune": "@PuneMunicipal",
    "mumbai": "@mybmc",
    "delhi": "@MCD_Delhi",
    "bangalore": "@BBMPCOMM",
    "chennai": "@chenaborpn",
    "hyderabad": "@GHMCOnline",
}


def get_twitter_client():
    """Initialize Twitter client with credentials from config."""
    try:
        import tweepy
        from utils.config import settings

        if not settings.TWITTER_API_KEY or not settings.TWITTER_API_SECRET:
            logger.warning("Twitter API credentials not configured")
            return None

        client = tweepy.Client(
            consumer_key=settings.TWITTER_API_KEY,
            consumer_secret=settings.TWITTER_API_SECRET,
            access_token=settings.TWITTER_ACCESS_TOKEN,
            access_token_secret=settings.TWITTER_ACCESS_SECRET,
        )
        return client

    except ImportError:
        logger.error("tweepy not installed. Run: pip install tweepy")
        return None
    except Exception as e:
        logger.error(f"Failed to init Twitter client: {e}")
        return None


def get_pending_hotspots():
    """
    Fetch unresolved hotspot clusters from the database that exceed
    the escalation threshold.
    """
    try:
        from database import SessionLocal, Report
        from utils.config import settings
        from collections import defaultdict
        from datetime import datetime, timedelta

        db = SessionLocal()
        try:
            # Get unresolved reports older than 48 hours
            cutoff = datetime.utcnow() - timedelta(hours=48)
            reports = (
                db.query(Report)
                .filter(
                    Report.status.in_(["reported"]),
                    Report.created_at <= cutoff,
                    Report.severity.in_(["moderate", "severe"]),
                )
                .all()
            )

            if not reports:
                return []

            # Cluster by proximity (~500m grid)
            GRID = 0.005
            clusters = defaultdict(list)
            for r in reports:
                key = (round(r.lat / GRID) * GRID, round(r.lng / GRID) * GRID)
                clusters[key].append(r)

            # Filter clusters exceeding threshold
            hotspots = []
            for (lat, lng), reps in clusters.items():
                if len(reps) >= settings.HOTSPOT_THRESHOLD:
                    severities = [r.severity for r in reps]
                    dominant = max(set(severities), key=severities.count)
                    hotspots.append({
                        "id": f"hotspot_{lat:.4f}_{lng:.4f}",
                        "location": f"({lat:.4f}, {lng:.4f})",
                        "lat": lat,
                        "lng": lng,
                        "report_count": len(reps),
                        "severity": dominant,
                        "city": reps[0].city or "pune",
                        "report_ids": [r.id for r in reps],
                    })

            return hotspots

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Failed to fetch hotspots: {e}")
        return []


def mark_as_escalated(report_ids: list[str]):
    """Mark reports as escalated in the database."""
    try:
        from database import SessionLocal, Report
        from datetime import datetime

        db = SessionLocal()
        try:
            db.query(Report).filter(Report.id.in_(report_ids)).update(
                {"status": "escalated", "updated_at": datetime.utcnow()},
                synchronize_session=False,
            )
            db.commit()
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Failed to mark as escalated: {e}")


def check_and_escalate():
    """
    Main job — checks for hotspots above threshold
    and fires accountability tweets for unresolved ones.
    """
    logger.info("Checking for unresolved hotspots...")
    hotspots = get_pending_hotspots()

    if not hotspots:
        logger.info("No hotspots exceed escalation threshold")
        return

    logger.info(f"Found {len(hotspots)} hotspot(s) to escalate")

    client = get_twitter_client()

    for hotspot in hotspots:
        city = hotspot.get("city", "pune").lower()
        handle = MUNICIPALITY_HANDLES.get(city, "@MunicipalCorp")

        # Generate tweet
        try:
            from services.clustering import generate_tweet
            tweet_text = generate_tweet(hotspot)
        except Exception:
            tweet_text = (
                f"🚨 {hotspot['report_count']} citizen reports of {hotspot['severity']} "
                f"road damage at {hotspot['location']}. Immediate action needed! "
                f"#FixOurRoads #PotholeAlert"
            )

        full_tweet = f"{handle} {tweet_text}"[:280]

        if client:
            try:
                client.create_tweet(text=full_tweet)
                logger.info(f"✓ Tweeted for hotspot {hotspot['id']} in {city}")
            except Exception as e:
                logger.error(f"✕ Failed to tweet: {e}")
                logger.info(f"  Tweet content: {full_tweet}")
        else:
            logger.info(f"[DRY RUN] Would tweet: {full_tweet}")

        # Mark reports as escalated regardless
        mark_as_escalated(hotspot.get("report_ids", []))


if __name__ == "__main__":
    try:
        from apscheduler.schedulers.blocking import BlockingScheduler

        scheduler = BlockingScheduler()
        # Run every 6 hours
        scheduler.add_job(check_and_escalate, "interval", hours=6)
        logger.info("Twitter accountability bot started — checking every 6 hours")
        check_and_escalate()  # Run once immediately
        scheduler.start()

    except ImportError:
        logger.info("APScheduler not installed — running single check")
        check_and_escalate()
