from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import reports, heatmap, dashboard, health
from utils.config import settings

app = FastAPI(
    title="Hole Lotta Problems API",
    description="AI-powered Urban Road Intelligence Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(heatmap.router, prefix="/api/heatmap", tags=["Heatmap"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(health.router, prefix="/api", tags=["Health"])

@app.get("/")
def root():
    return {"message": "Hole Lotta Problems API is live 🕳️"}
