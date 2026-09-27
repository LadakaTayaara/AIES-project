import tweepy
from apscheduler.schedulers.blocking import BlockingScheduler
from backend.utils.config import settings
from backend.services.clustering import generate_tweet

# Twitter client setup
client = tweepy.Client(
    consumer_key=settings.TWITTER_API_KEY,
    consumer_secret=settings.TWITTER_API_SECRET,
    access_token=settings.TWITTER_ACCESS_TOKEN,
    access_token_secret=settings.TWITTER_ACCESS_SECRET
)

# Municipality handle mapping — extend as needed
MUNICIPALITY_HANDLES = {
    "pune": "@PuneMunicipal",
    "mumbai": "@mybmc",
    "delhi": "@MCD_Delhi",
    "bangalore": "@BBMPCOMM",
}

def check_and_escalate():
    """
    Runs on schedule. Checks for hotspots above threshold
    and fires accountability tweets for unresolved ones.
    """
    # TODO: fetch hotspots from DB that exceed threshold and are unescalated
    hotspots = get_pending_hotspots()

    for hotspot in hotspots:
        city = hotspot.get("city", "pune").lower()
        handle = MUNICIPALITY_HANDLES.get(city, "@MunicipalCorp")

        tweet_text = generate_tweet(hotspot)
        full_tweet = f"{handle} {tweet_text}"

        try:
            client.create_tweet(text=full_tweet[:280])
            mark_as_escalated(hotspot["id"])
            print(f"[BOT] Tweeted for hotspot {hotspot['id']} in {city}")
        except Exception as e:
            print(f"[BOT] Failed to tweet: {e}")


def get_pending_hotspots():
    """Fetch hotspots from DB that need escalation. Stub for now."""
    return []


def mark_as_escalated(hotspot_id: str):
    """Mark hotspot as escalated in DB. Stub for now."""
    pass


if __name__ == "__main__":
    scheduler = BlockingScheduler()
    # Runs every 6 hours
    scheduler.add_job(check_and_escalate, "interval", hours=6)
    print("[BOT] Twitter accountability bot started...")
    scheduler.start()
