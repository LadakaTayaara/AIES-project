from sentence_transformers import SentenceTransformer
from sklearn.cluster import DBSCAN
import numpy as np
from groq import Groq
from utils.config import settings

embedder = SentenceTransformer("all-MiniLM-L6-v2")
groq_client = Groq(api_key=settings.GROQ_API_KEY)

def cluster_reports(reports: list[dict]) -> list[dict]:
    """
    Cluster similar forum reports using sentence embeddings + DBSCAN.
    Groups reports about same location/damage together.
    """
    if not reports:
        return []

    texts = [r.get("description", "") for r in reports]
    embeddings = embedder.encode(texts)

    clustering = DBSCAN(eps=0.3, min_samples=2, metric="cosine").fit(embeddings)
    labels = clustering.labels_

    clusters = {}
    for idx, label in enumerate(labels):
        if label == -1:
            continue
        clusters.setdefault(label, []).append(reports[idx])

    return [{"cluster_id": k, "reports": v, "count": len(v)} for k, v in clusters.items()]


def generate_tweet(hotspot: dict) -> str:
    """
    Use LLaMA via Groq to generate an accountability tweet for a hotspot.
    """
    location = hotspot.get("location", "this area")
    count = hotspot.get("report_count", 0)
    severity = hotspot.get("severity", "severe")

    prompt = f"""
    Generate a short, factual and firm Twitter post (under 250 characters) 
    tagging a municipality about an unresolved pothole hotspot.
    Location: {location}
    Reports: {count} citizen reports
    Severity: {severity}
    Tone: civic accountability, not aggressive. End with relevant hashtags.
    """

    response = groq_client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=100
    )

    return response.choices[0].message.content.strip()


def extract_location_tags(text: str) -> list[str]:
    """
    Extract location mentions from forum posts using LLaMA via Groq.
    """
    prompt = f"""
    Extract only location names, landmarks, or area names from this text.
    Return as a comma-separated list. If none found, return empty string.
    Text: {text}
    """

    response = groq_client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=50
    )

    raw = response.choices[0].message.content.strip()
    return [tag.strip() for tag in raw.split(",") if tag.strip()]
