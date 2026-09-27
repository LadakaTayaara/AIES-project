from fastapi import APIRouter

router = APIRouter()

@router.get("/summary")
async def get_dashboard_summary(city: str = "pune"):
    """Municipality dashboard — repair priority list, stats, pending reports."""
    pass

@router.get("/priority-list")
async def get_priority_list(city: str = "pune", limit: int = 20):
    """Severity-ranked repair priority list for municipality."""
    pass
