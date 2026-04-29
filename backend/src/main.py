from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from src.adapters.api.auth_router import router as auth_router
from src.adapters.api.shipment_router import router as shipment_router
from src.adapters.api.dashboard_router import router as dashboard_router
from src.adapters.api.ndr_router import router as ndr_router
from src.adapters.api.whatsapp_router import router as whatsapp_router
from src.infrastructure.cache.redis_client import RedisClient
from src.infrastructure.config.settings import get_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 LogiSahay backend starting up...")
    await RedisClient.get_client()
    logger.info("✅ Redis client initialized")
    yield
    logger.info("🔻 Shutting down...")
    await RedisClient.close()


app = FastAPI(
    title="LogiSahay Backend",
    version="3.1.0",
    description="Logistics intelligence platform for Indian micro-sellers",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(shipment_router)
app.include_router(dashboard_router)
app.include_router(ndr_router)
app.include_router(whatsapp_router)


@app.get("/health", tags=["Health"])
async def health():
    """
    Enhanced health check — verifies Redis and Supabase connectivity.
    """
    status = {"status": "ok", "service": "logisahay-backend", "version": "3.1.0"}

    # Check Redis
    try:
        redis = await RedisClient.get_client()
        await redis.ping()
        status["redis"] = "ok"
    except Exception as e:
        status["redis"] = f"error: {str(e)[:50]}"
        status["status"] = "degraded"

    # Check Supabase (lightweight: just check the client is initialized)
    try:
        from src.infrastructure.db.supabase_client import supabase
        # Minimal query to verify connectivity
        supabase.table("users").select("id").limit(1).execute()
        status["supabase"] = "ok"
    except Exception as e:
        status["supabase"] = f"error: {str(e)[:50]}"
        status["status"] = "degraded"

    # WhatsApp mode
    status["whatsapp_mode"] = "live" if settings.WHATSAPP_ACCESS_TOKEN else "simulation"
    status["app_env"] = settings.APP_ENV

    return status
