"""
Text clustering & LLM services.

- Clusters similar citizen reports using sentence embeddings + DBSCAN
- Generates accountability tweets via Groq/LLaMA
- Extracts location tags from unstructured text

All external API calls are wrapped with error handling so the app
stays functional even without API keys configured.
"""

import logging

logger = logging.getLogger("clustering")

# ── Lazy-loaded singletons ───────────────────────────────────────────
_embedder = None
_groq_client = None


def _get_embedder():
    """Lazy-load the sentence transformer to avoid slow startup."""
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedder = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("Sentence embedder loaded successfully")
        except ImportError:
            logger.warning("sentence-transformers not installed, clustering disabled")
        except Exception as e:
            logger.warning(f"Failed to load sentence embedder: {e}")
    return _embedder


def _get_groq_client():
    """Lazy-load Groq client."""
    global _groq_client
    if _groq_client is None:
        try:
            from groq import Groq
            from utils.config import settings
            if settings.GROQ_API_KEY:
                _groq_client = Groq(api_key=settings.GROQ_API_KEY)
                logger.info("Groq client initialized")
            else:
                logger.info("No GROQ_API_KEY set — LLM features disabled")
        except ImportError:
            logger.warning("groq package not installed")
        except Exception as e:
            logger.warning(f"Failed to init Groq client: {e}")
    return _groq_client


def cluster_reports(reports: list[dict]) -> list[dict]:
    """
    Cluster similar forum reports using sentence embeddings + DBSCAN.
    Groups reports about the same location/damage together.
    """
    if not reports or len(reports) < 2:
        return []

    embedder = _get_embedder()
    if embedder is None:
        return []

    try:
        from sklearn.cluster import DBSCAN
        import numpy as np

        texts = [r.get("description", "") or "" for r in reports]

        # Filter out empty descriptions
        valid_indices = [i for i, t in enumerate(texts) if t.strip()]
        if len(valid_indices) < 2:
            return []

        valid_texts = [texts[i] for i in valid_indices]
        embeddings = embedder.encode(valid_texts)

        clustering = DBSCAN(eps=0.3, min_samples=2, metric="cosine").fit(embeddings)
        labels = clustering.labels_

        clusters = {}
        for idx, label in enumerate(labels):
            if label == -1:
                continue
            original_idx = valid_indices[idx]
            clusters.setdefault(int(label), []).append(reports[original_idx])

        return [
            {"cluster_id": k, "reports": v, "count": len(v)}
            for k, v in clusters.items()
        ]

    except Exception as e:
        logger.error(f"Clustering failed: {e}")
        return []


def generate_tweet(hotspot: dict) -> str:
    """
    Use LLaMA via Groq to generate an accountability tweet for a hotspot.
    Falls back to a template if Groq is unavailable.
    """
    location = hotspot.get("location", "this area")
    count = hotspot.get("report_count", 0)
    severity = hotspot.get("severity", "severe")

    client = _get_groq_client()
    if client is None:
        # Template fallback
        return (
            f"🚨 {count} citizen reports of {severity} road damage near {location}. "
            f"Immediate attention needed! #FixOurRoads #RoadSafety #PotholeAlert"
        )

    try:
        prompt = (
            f"Generate a short, factual and firm Twitter post (under 250 characters) "
            f"tagging a municipality about an unresolved pothole hotspot.\n"
            f"Location: {location}\n"
            f"Reports: {count} citizen reports\n"
            f"Severity: {severity}\n"
            f"Tone: civic accountability, not aggressive. End with relevant hashtags."
        )

        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=100,
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        logger.error(f"Tweet generation failed: {e}")
        return (
            f"🚨 {count} reports of {severity} road damage near {location}. "
            f"Repairs urgently needed! #FixOurRoads #PotholeAlert"
        )


def extract_location_tags(text: str) -> list[str]:
    """
    Extract location mentions from forum posts using LLaMA via Groq.
    Falls back to empty list if Groq is unavailable.
    """
    if not text or not text.strip():
        return []

    client = _get_groq_client()
    if client is None:
        return []

    try:
        prompt = (
            "Extract only location names, landmarks, or area names from this text. "
            "Return as a comma-separated list. If none found, return empty string.\n"
            f"Text: {text}"
        )

        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=50,
        )

        raw = response.choices[0].message.content.strip()
        if not raw:
            return []
        return [tag.strip() for tag in raw.split(",") if tag.strip()]

    except Exception as e:
        logger.error(f"Location extraction failed: {e}")
        return []
