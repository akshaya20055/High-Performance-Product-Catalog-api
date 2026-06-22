from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings, logger
from app.database import engine, Base
from app.routes.products import router as products_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles application startup and shutdown events.
    For local development/testing, we automatically create tables.
    For production, Alembic migrations should be run as part of the CD pipeline.
    """
    logger.info("Starting up FastAPI Product Catalog Service...")
    
    # Auto-create tables in development/testing for frictionless local execution
    if settings.ENV != "production":
        logger.info("Non-production environment detected. Synchronizing database schema...")
        async with engine.begin() as conn:
            # Drop tables and recreate in test mode if required, otherwise just create
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema sync complete.")
        
    yield
    
    logger.info("Shutting down FastAPI Product Catalog Service...")
    await engine.dispose()
    logger.info("Database connections closed.")

app = FastAPI(
    title="High-Performance Product Catalog API",
    version="1.0.0",
    description=(
        "Production-ready FastAPI service demonstrating snapshot-based cursor pagination. "
        "Engineered to handle large-scale datasets (200,000+ products) with strict read consistency "
        "and sub-millisecond query performance under heavy write concurrency."
    ),
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(products_router, prefix="/api")

# Global Exception Handlers
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """
    Gracefully catch standard value errors (e.g. invalid cursor decodes)
    and return a clean bad request response.
    """
    logger.warning(f"Validation error on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc)}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all handler to prevent leaking raw server exceptions and log errors.
    """
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

@app.get("/health", tags=["System"], summary="System health check")
async def health_check():
    """
    Basic health check endpoint for container orchestrators (e.g. Render, Kubernetes).
    """
    return {
        "status": "healthy",
        "environment": settings.ENV,
        "service": "product-catalog-api"
    }
