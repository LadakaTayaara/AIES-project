"""
Seed Data Script for Hole Lotta Problems
========================================
Populates the SQLite database with:
1. High-confidence geocoded road reports categorized as minor, moderate, and severe
   to populate the Esri Dark Canvas GIS map and Road Health Index.
2. Initial crowdsourcing and pothole identification forum discussions and comments.
"""

import uuid
from datetime import datetime, timedelta
import random

from database import SessionLocal, init_db, Report, ForumPost, ForumComment

# Realistic Pune coordinates cluster for the GIS Map
PUNE_LOCATIONS = [
    {"name": "FC Road near Goodluck Chowk", "lat": 18.5186, "lng": 73.8415, "city": "pune"},
    {"name": "JM Road near Sambhaji Park", "lat": 18.5235, "lng": 73.8478, "city": "pune"},
    {"name": "Karve Road near Nal Stop", "lat": 18.5074, "lng": 73.8296, "city": "pune"},
    {"name": "Paud Road Flyover Descent", "lat": 18.5032, "lng": 73.8115, "city": "pune"},
    {"name": "Senapati Bapat Road junction", "lat": 18.5312, "lng": 73.8341, "city": "pune"},
    {"name": "University Road near E-Square", "lat": 18.5365, "lng": 73.8310, "city": "pune"},
    {"name": "Baner Road near Balewadi Phata", "lat": 18.5590, "lng": 73.7925, "city": "pune"},
    {"name": "Aundh Road near Breman Chowk", "lat": 18.5625, "lng": 73.8080, "city": "pune"},
    {"name": "Kothrud Depot outer ring", "lat": 18.4985, "lng": 73.8055, "city": "pune"},
    {"name": "Sinhagad Road near Rajaram Bridge", "lat": 18.4920, "lng": 73.8315, "city": "pune"},
    {"name": "Swargate Chowk Underpass Entry", "lat": 18.5018, "lng": 73.8585, "city": "pune"},
    {"name": "Camp near MG Road intersection", "lat": 18.5150, "lng": 73.8820, "city": "pune"},
    {"name": "Viman Nagar near Phoenix Mall", "lat": 18.5615, "lng": 73.9160, "city": "pune"},
    {"name": "Kalyani Nagar Joggers Park approach", "lat": 18.5480, "lng": 73.9030, "city": "pune"},
    {"name": "Hadapsar Gadital junction", "lat": 18.5020, "lng": 73.9280, "city": "pune"},
]

SEVERITY_TIERS = ["minor", "moderate", "severe"]
STATUS_OPTIONS = ["reported", "escalated", "in-repair", "resolved"]


def seed_database():
    init_db()
    db = SessionLocal()

    try:
        # Check if Pune reports already seeded
        pune_count = db.query(Report).filter(Report.city == "pune").count()
        if pune_count < 10:
            print(f"Seeding Pune geocoded reports (currently {pune_count})...")
            now = datetime.utcnow()

            for i, loc in enumerate(PUNE_LOCATIONS):
                sev = SEVERITY_TIERS[i % len(SEVERITY_TIERS)]
                conf = round(random.uniform(0.78, 0.94), 3)
                status = STATUS_OPTIONS[i % len(STATUS_OPTIONS)]
                created = now - timedelta(days=random.randint(0, 10), hours=random.randint(1, 23))

                rep_id = str(uuid.uuid4())
                report = Report(
                    id=rep_id,
                    lat=loc["lat"] + random.uniform(-0.001, 0.001),
                    lng=loc["lng"] + random.uniform(-0.001, 0.001),
                    severity=sev,
                    confidence=conf,
                    description=f"Road surface hazard reported at {loc['name']}. Severity: {sev.upper()}.",
                    status=status,
                    city=loc["city"],
                    num_detections=random.randint(1, 3),
                    created_at=created,
                    updated_at=created,
                )
                db.add(report)

            db.commit()
            print(f"[OK] Seeded {len(PUNE_LOCATIONS)} geocoded reports into database.")
        else:
            print(f"Database already contains {pune_count} Pune reports.")

        # Seed Forum Posts
        existing_posts = db.query(ForumPost).count()
        if existing_posts == 0:
            print("Seeding community forum discussions...")
            post1_id = str(uuid.uuid4())
            post1 = ForumPost(
                id=post1_id,
                title="How to distinguish deep craters vs shallow spalling at night?",
                content="Under sodium street lighting or wet tarmac, shallow peeling can cast harsh shadows that look like severe craters. How does our ASTM D6433 detection engine handle shadow contrast without false positives?",
                author_name="Rohan Deshmukh",
                category="identification",
                severity_tag="moderate",
                upvotes=18,
                created_at=datetime.utcnow() - timedelta(hours=36),
            )

            post2_id = str(uuid.uuid4())
            post2 = ForumPost(
                id=post2_id,
                title="Critical Hazard Alert: Deep crater under Paud Road Flyover",
                content="Exposed rebar and deep base failure (>8cm depth) on the descending curve of the flyover. Two motorcyclists reported tire punctures today. Please upvote for urgent civic dispatch!",
                author_name="Pooja Sharma",
                category="hotspot",
                severity_tag="severe",
                upvotes=42,
                created_at=datetime.utcnow() - timedelta(hours=14),
            )

            post3_id = str(uuid.uuid4())
            post3 = ForumPost(
                id=post3_id,
                title="Repair Confirmed: Karve Road junction repaved by municipality!",
                content="The severe clustering of potholes near Nal Stop intersection has been patched with hot mix asphalt by PMC engineers after automated escalation. Status marked as resolved!",
                author_name="Amit Kulkarni",
                category="repair-update",
                severity_tag="minor",
                upvotes=27,
                created_at=datetime.utcnow() - timedelta(hours=6),
            )

            post4_id = str(uuid.uuid4())
            post4 = ForumPost(
                id=post4_id,
                title="Crowdsourcing Tips: Recommended phone angle for camera scanner",
                content="When using the mobile scanner, holding the camera at ~40 degrees tilted downwards captures both the pothole depth and surrounding road context, which boosts model confidence to >85%.",
                author_name="TechCivic Volunteer",
                category="general",
                severity_tag="unverified",
                upvotes=15,
                created_at=datetime.utcnow() - timedelta(hours=2),
            )

            db.add_all([post1, post2, post3, post4])
            db.commit()

            # Seed comments
            comments = [
                ForumComment(
                    id=str(uuid.uuid4()),
                    post_id=post1_id,
                    author_name="Dr. S. Nair (CV Lab)",
                    content="The spatial attention heads in YOLO11 look at gradient transitions across asphalt edges rather than raw pixel darkness. That eliminates shadow false positives effectively.",
                    created_at=datetime.utcnow() - timedelta(hours=30),
                ),
                ForumComment(
                    id=str(uuid.uuid4()),
                    post_id=post1_id,
                    author_name="Aarav Joshi",
                    content="Good explanation! Tested it during rainy evening conditions and confidence was stable at 78%.",
                    created_at=datetime.utcnow() - timedelta(hours=18),
                ),
                ForumComment(
                    id=str(uuid.uuid4()),
                    post_id=post2_id,
                    author_name="Traffic Warden Sunil",
                    content="Caution barricades placed temporarily. Escalate through bot to Ward Office #4 immediately.",
                    created_at=datetime.utcnow() - timedelta(hours=10),
                ),
                ForumComment(
                    id=str(uuid.uuid4()),
                    post_id=post3_id,
                    author_name="Neha Patil",
                    content="Verified this morning during commute. Smooth surface now. Great result for crowdsourcing!",
                    created_at=datetime.utcnow() - timedelta(hours=4),
                ),
            ]
            db.add_all(comments)
            db.commit()
            print("[OK] Seeded forum posts and discussion comments.")
        else:
            print(f"Forum already contains {existing_posts} posts.")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
