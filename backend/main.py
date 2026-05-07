from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analyze, graph, repo_intel, advisor
from app.core.database import init_db

app = FastAPI(
    title="OpenPulse API",
    version="1.0.0",
    description="Multi-ecosystem dependency analysis API"
)

# FINAL CORS FIX
origins = [
    "https://open-pulse-omega.vercel.app",
    "https://openpulse-43sj.onrender.com",
    "https://open-pulse.onrender.com",

    # localhost
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
]

app.add_middleware(
    CORSMiddleware,

    # explicit origins
    allow_origins=origins,

    # allow all vercel preview deployments
    allow_origin_regex=r"https://.*\.vercel\.app",

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ROUTERS
app.include_router(
    analyze.router,
    prefix="/api",
    tags=["analyze"]
)

app.include_router(
    graph.router,
    prefix="/api",
    tags=["graph"]
)

app.include_router(
    repo_intel.router,
    prefix="/api",
    tags=["repo-intel"]
)

app.include_router(
    advisor.router,
    prefix="/api",
    tags=["advisor"]
)


# STARTUP
@app.on_event("startup")
async def startup():
    await init_db()


# ROOT
@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "OpenPulse API",
        "version": "1.0.0",
        "endpoints": {
            "analyze": "/api/analyze",
            "graph": "/api/graph/data",
            "repo-intel": "/api/repo-intel",
            "advisor": "/api/advisor",
            "health": "/health",
            "docs": "/docs"
        }
    }


# HEALTH
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "openpulse-api",
        "version": "1.0.0"
    }