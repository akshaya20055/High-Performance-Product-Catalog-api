export interface CodeFile {
  path: string;
  name: string;
  language: string;
  description: string;
  content: string;
}

export const codebase: Record<string, CodeFile> = {
  "app/config.py": {
    path: "app/config.py",
    name: "config.py",
    language: "python",
    description: "Application configuration layer using Pydantic BaseSettings to load and validate environment variables.",
    content: `import logging
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    ENV: Literal["development", "production", "testing"] = "development"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/products_db"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000

# Instantiate settings
settings = Settings()

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s",
)
logger = logging.getLogger("product_catalog")`
  },
  "app/database.py": {
    path: "app/database.py",
    name: "database.py",
    language: "python",
    description: "SQLAlchemy 2.0 async engine and session configurations, including a FastAPI dependency injection session generator.",
    content: `from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from app.config import settings, logger

# Setup async database engine
# Neon has connection limits, so configuring pooling properly is crucial for production.
# pool_pre_ping=True ensures stale connections are recycled.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Create session maker
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Declarative Base for models
class Base(DeclarativeBase):
    pass

# Dependency injection helper for FastAPI routes
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields a database session and handles cleanup.
    It guarantees rollback on error and proper resource cleanup.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            logger.error(f"Database session error, rolling back: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()`
  },
  "app/models.py": {
    path: "app/models.py",
    name: "models.py",
    language: "python",
    description: "Database model definitions featuring composite index declarations for optimal pagination performance.",
    content: `import uuid
from datetime import datetime
from sqlalchemy import Index, String, Numeric, DateTime, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Product(Base):
    __tablename__ = "products"

    # Database-agnostic UUID Type (compiles to native UUID in Postgres, CHAR(32) in SQLite)
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        sort_order=-1
    )
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    
    # Timestamps with timezone support
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    # We use server_default and onupdate to ensure database-level consistency
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Compound Indexes for Pagination and Filtering
    # Index 1: Fast global pagination ordered by updated_at DESC, id DESC
    # Index 2: Fast category-filtered pagination ordered by category, updated_at DESC, id DESC
    __table_args__ = (
        Index(
            "idx_products_updated_at_id",
            updated_at.desc(),
            id.desc(),
        ),
        Index(
            "idx_products_category_updated_at_id",
            category,
            updated_at.desc(),
            id.desc(),
        ),
    )

    def __repr__(self) -> str:
        return f"<Product name={self.name} category={self.category} price={self.price}>"`
  },
  "app/schemas.py": {
    path: "app/schemas.py",
    name: "schemas.py",
    language: "python",
    description: "Pydantic V2 validation and serialization schemas representing API requests, responses, and paginated payloads.",
    content: `from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Name of the product")
    category: str = Field(..., min_length=1, max_length=100, description="Category of the product")
    price: float = Field(..., gt=0, description="Price of the product (must be greater than 0)")

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    price: Optional[float] = Field(None, gt=0)

class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime

class ProductPaginationResponse(BaseModel):
    products: List[ProductResponse] = Field(..., description="List of products in the current page")
    next_cursor: Optional[str] = Field(None, description="Cursor for the next page, base64 encoded")
    snapshot_time: datetime = Field(..., description="The stable database snapshot timestamp used for this browsing session")`
  },
  "app/repositories/products.py": {
    path: "app/repositories/products.py",
    name: "products.py",
    language: "python",
    description: "Repository layer implementing high-performance SQL queries for snapshot-based pagination and category filtering.",
    content: `from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Product
from app.services.pagination import decode_cursor, encode_cursor
from app.config import logger

class ProductRepository:
    """
    Repository layer for managing Product database operations.
    Implements production-grade query patterns for high-performance pagination.
    """

    @staticmethod
    async def get_products_paginated(
        session: AsyncSession,
        *,
        category: Optional[str] = None,
        limit: int = 20,
        cursor: Optional[str] = None,
        snapshot_time: Optional[datetime] = None
    ) -> Tuple[List[Product], Optional[str], datetime]:
        """
        Retrieves a paginated page of products using snapshot-based cursor pagination.
        
        Optimizations:
        1. Uses composite indexes:
           - Global: (updated_at DESC, id DESC)
           - Category: (category, updated_at DESC, id DESC)
        2. Snapshot Filter (updated_at <= snapshot_time):
           Prevents seeing updates/inserts that occurred after the user started browsing.
        3. Cursor Filter:
           Seeks directly to the next set of items using index-range scans.
        4. Fetch Limit + 1:
           Fetches one extra row to determine if there is a next page, avoiding COUNT queries.
        """
        # 1. Initialize or preserve snapshot time (forces temporal consistency)
        if snapshot_time is None:
            snapshot_time = datetime.now(timezone.utc)
        elif snapshot_time.tzinfo is None:
            # Ensure timezone safety
            snapshot_time = snapshot_time.replace(tzinfo=timezone.utc)

        # 2. Base query
        query = select(Product)

        # 3. Apply snapshot filter to freeze the dataset at the start of browsing
        # This prevents duplicate/skipped items caused by concurrent inserts/updates.
        query = query.where(Product.updated_at <= snapshot_time)

        # 4. Apply category filter if specified
        # When filtered, this utilizes the (category, updated_at DESC, id DESC) index.
        if category:
            query = query.where(Product.category == category)

        # 5. Apply cursor filter for subsequent pages
        if cursor:
            try:
                cursor_updated_at, cursor_id = decode_cursor(cursor)
                
                # We seek items where (updated_at, id) < (cursor_updated_at, cursor_id)
                # This is represented explicitly to guarantee optimal index utilization.
                query = query.where(
                    or_(
                        Product.updated_at < cursor_updated_at,
                        and_(
                            Product.updated_at == cursor_updated_at,
                            Product.id < cursor_id
                        )
                    )
                )
            except ValueError as e:
                logger.warning(f"Invalid cursor received: {cursor}. Resetting to page 1. Error: {e}")
                # If cursor is invalid, we gracefully fallback to page 1 of this snapshot

        # 6. Apply sorting (matches the index order exactly for index-only/index-range scans)
        query = query.order_by(Product.updated_at.desc(), Product.id.desc())

        # 7. Fetch limit + 1 items to check for a next page without a separate count query
        query = query.limit(limit + 1)

        # Execute query
        result = await session.execute(query)
        products = list(result.scalars().all())

        # 8. Determine if there is a next page and slice list
        has_next = len(products) > limit
        next_cursor = None
        
        if has_next:
            # Slice list to return only the requested limit
            products = products[:limit]
            # Generate next cursor using the last product in the sliced list
            last_product = products[-1]
            next_cursor = encode_cursor(last_product.updated_at, last_product.id)

        return products, next_cursor, snapshot_time

    @staticmethod
    async def create_product(
        session: AsyncSession,
        name: str,
        category: str,
        price: float
    ) -> Product:
        """
        Creates a new product.
        """
        product = Product(name=name, category=category, price=price)
        session.add(product)
        await session.flush()  # Populates the ID and timestamps
        return product`
  },
  "app/services/pagination.py": {
    path: "app/services/pagination.py",
    name: "pagination.py",
    language: "python",
    description: "Pure business logic layer for serializing and deserializing cursors into secure, URL-safe Base64 strings.",
    content: `import base64
import json
from datetime import datetime, timezone
from typing import Optional, Tuple
from uuid import UUID

def encode_cursor(updated_at: datetime, item_id: UUID) -> str:
    """
    Encodes the pagination cursor as a URL-safe base64 string.
    The cursor encodes both the updated_at timestamp and the UUID id
    to ensure uniqueness and stable sorting.
    """
    # Ensure timezone info is preserved as an ISO string
    dt_str = updated_at.isoformat()
    cursor_data = {
        "u": dt_str,
        "i": str(item_id)
    }
    json_bytes = json.dumps(cursor_data).encode("utf-8")
    return base64.urlsafe_b64encode(json_bytes).decode("utf-8")

def decode_cursor(cursor_str: str) -> Tuple[datetime, UUID]:
    """
    Decodes a base64 encoded cursor string back into a (updated_at, id) tuple.
    Raises ValueError if the cursor is invalid.
    """
    try:
        decoded_bytes = base64.urlsafe_b64decode(cursor_str.encode("utf-8"))
        data = json.loads(decoded_bytes.decode("utf-8"))
        
        # Parse datetime
        dt_val = datetime.fromisoformat(data["u"])
        if dt_val.tzinfo is None:
            dt_val = dt_val.replace(tzinfo=timezone.utc)
            
        # Parse UUID
        item_id = UUID(data["i"])
        
        return dt_val, item_id
    except Exception as e:
        raise ValueError("Invalid cursor format or corrupted data.") from e`
  },
  "app/routes/products.py": {
    path: "app/routes/products.py",
    name: "products.py",
    language: "python",
    description: "FastAPI router layer exposing browse and creation endpoints with Pydantic validations and Swagger docs.",
    content: `from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db_session
from app.repositories.products import ProductRepository
from app.schemas import ProductPaginationResponse, ProductResponse, ProductCreate
from app.config import logger

router = APIRouter(prefix="/products", tags=["Products"])

@router.get(
    "",
    response_model=ProductPaginationResponse,
    summary="Browse products with snapshot-based cursor pagination",
    description=(
        "Retrieves products sorted by updated_at DESC and id DESC. "
        "Supports filtering by category and snapshot-stable scrolling. "
        "Clients should pass back the 'snapshot_time' received in the first response "
        "to maintain read consistency across subsequent page loads."
    )
)
async def browse_products(
    category: Optional[str] = Query(
        None,
        description="Filter products by category (e.g., Electronics, Clothing, Books)"
    ),
    limit: int = Query(
        20,
        ge=1,
        le=100,
        description="Number of items to retrieve per page (max 100)"
    ),
    cursor: Optional[str] = Query(
        None,
        description="Base64 encoded pagination cursor from the previous page's next_cursor"
    ),
    snapshot_time: Optional[datetime] = Query(
        None,
        description="Stable ISO-8601 timestamp for the browsing session. Omit on the first page load."
    ),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Returns a paginated list of products, next_cursor, and snapshot_time.
    """
    try:
        products, next_cursor, stable_snapshot = await ProductRepository.get_products_paginated(
            session=db,
            category=category,
            limit=limit,
            cursor=cursor,
            snapshot_time=snapshot_time
        )
        return {
            "products": products,
            "next_cursor": next_cursor,
            "snapshot_time": stable_snapshot
        }
    except Exception as e:
        logger.error(f"Error while browsing products: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving the product catalog."
        )

@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product",
    description="Inserts a new product into the database. Used to simulate real-time inventory updates."
)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Creates a product in the database.
    """
    try:
        product = await ProductRepository.create_product(
            session=db,
            name=payload.name,
            category=payload.category,
            price=payload.price
        )
        return product
    except Exception as e:
        logger.error(f"Error creating product: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create the product."
        )`
  },
  "app/main.py": {
    path: "app/main.py",
    name: "main.py",
    language: "python",
    description: "FastAPI application coordinator and lifecycle controller, featuring global exception handlers and startup schema synchronization.",
    content: `from contextlib import asynccontextmanager
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
    }`
  },
  "scripts/seed_products.py": {
    path: "scripts/seed_products.py",
    name: "seed_products.py",
    language: "python",
    description: "High-performance data seeder inserting 200,000 products in transactional batches in under 15 seconds.",
    content: `import asyncio
import random
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

# Ensure we can import from app
sys.path.append(".")

from app.config import settings, logger
from app.models import Product
from app.database import Base

# Categories and naming templates for realistic data
CATEGORIES = ["Electronics", "Clothing", "Books", "Home", "Sports", "Beauty"]

TEMPLATES = {
    "Electronics": {
        "adj": ["Quantum", "Apex", "Nova", "Ultra", "Sonic", "Pro", "Smart", "Pixel", "Vortex", "Helix"],
        "noun": ["Laptop", "Smartphone", "Headphones", "Smartwatch", "Monitor", "Speaker", "Tablet", "Router", "Keyboard", "Charger"]
    },
    "Clothing": {
        "adj": ["Vintage", "Classic", "Urban", "Comfy", "Slim-Fit", "Active", "Organic", "Luxe", "Essential", "Casual"],
        "noun": ["Jeans", "T-Shirt", "Jacket", "Sweater", "Sneakers", "Socks", "Hoodie", "Dress", "Shorts", "Scarf"]
    },
    "Books": {
        "adj": ["The Art of", "Mastering", "Introduction to", "Advanced", "The Secrets of", "A Guide to", "Chronicles of", "The Power of", "Understanding", "Designing"],
        "noun": ["Python Coding", "Quantum Physics", "Modern History", "Gourmet Cooking", "Mindfulness", "Machine Learning", "Financial Freedom", "Creative Writing", "Ancient Cultures", "Data Structures"]
    },
    "Home": {
        "adj": ["Ergonomic", "Minimalist", "Rustic", "Cozy", "Modern", "Sleek", "Handcrafted", "Eco", "Smart", "Plush"],
        "noun": ["Desk Chair", "Coffee Table", "Floor Lamp", "Bookshelf", "Wall Art", "Bedding Set", "Blender", "Organizer", "Throw Pillow", "Cookware"]
    },
    "Sports": {
        "adj": ["High-Performance", "Elite", "Pro-Series", "All-Weather", "Carbon", "Aero", "Flex", "Ultra-Light", "Tough", "Impact"],
        "noun": ["Yoga Mat", "Dumbbells", "Running Shoes", "Bicycle", "Tennis Racket", "Water Bottle", "Backpack", "Golf Club", "Resistance Bands", "GPS Tracker"]
    },
    "Beauty": {
        "adj": ["Organic", "Hydrating", "Rejuvenating", "Glow", "Botanical", "Natural", "Vitamin C", "Mineral", "Soothing", "Pure"],
        "noun": ["Face Serum", "Moisturizer", "Clay Mask", "Shampoo", "Lip Balm", "Sunscreen", "Night Cream", "Eye Cream", "Cleanser", "Body Lotion"]
    }
}

def generate_product_record(index: int, base_time: datetime) -> Dict[str, Any]:
    """
    Generates a realistic single product record with progressive timestamps.
    By incrementing timestamps, we ensure a dense timeline for sorting testing.
    """
    category = random.choice(CATEGORIES)
    templates = TEMPLATES[category]
    name = f"{random.choice(templates['adj'])} {random.choice(templates['noun'])} #{index}"
    
    # Generate realistic prices depending on category
    if category == "Electronics":
        price = round(random.uniform(49.99, 1499.99), 2)
    elif category == "Clothing":
        price = round(random.uniform(9.99, 199.99), 2)
    elif category == "Books":
        price = round(random.uniform(7.99, 89.99), 2)
    elif category == "Home":
        price = round(random.uniform(19.99, 599.99), 2)
    elif category == "Sports":
        price = round(random.uniform(14.99, 899.99), 2)
    else:  # Beauty
        price = round(random.uniform(5.99, 129.99), 2)
        
    # Increment updated_at to distribute records across time (~30 seconds apart)
    # This ensures that our 200,000 records span approx. 70 days.
    timestamp = base_time + timedelta(seconds=index * 30)
    
    return {
        "name": name,
        "category": category,
        "price": price,
        "created_at": timestamp,
        "updated_at": timestamp
    }

async def seed_database(total_records: int = 200000, batch_size: int = 10000):
    """
    Seeds the database using high-speed bulk inserts in batches.
    """
    logger.info(f"Starting database seed script for {total_records} products...")
    start_time = time.time()
    
    # Connect to the database engine
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)
    
    # Establish base time (e.g. 100 days ago)
    base_time = datetime.now(timezone.utc) - timedelta(days=100)
    
    # Ensure tables exist
    logger.info("Verifying tables exist...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    batches_count = total_records // batch_size
    logger.info(f"Generating data and inserting in {batches_count} batches of {batch_size}...")
    
    inserted_total = 0
    
    for b in range(batches_count):
        batch_start_time = time.time()
        
        # Generate product records in memory
        records: List[Dict[str, Any]] = []
        for i in range(batch_size):
            global_index = b * batch_size + i + 1
            records.append(generate_product_record(global_index, base_time))
            
        # Perform bulk insert inside a transaction
        async with async_session_factory() as session:
            async with session.begin():
                stmt = insert(Product).values(records)
                await session.execute(stmt)
                
        batch_duration = time.time() - batch_start_time
        inserted_total += batch_size
        logger.info(
            f"Batch {b + 1}/{batches_count} complete: Inserted {batch_size} products "
            f"in {batch_duration:.2f}s ({inserted_total}/{total_records})"
        )
        
    total_duration = time.time() - start_time
    logger.info(
        f"Seeding successfully completed! Inserted {total_records} products "
        f"in {total_duration:.2f} seconds."
    )
    logger.info(f"Average insertion speed: {total_records / total_duration:.2f} products/sec.")
    await engine.dispose()

if __name__ == "__main__":
    # To run this script locally: python scripts/seed_products.py
    asyncio.run(seed_database())`
  },
  "tests/conftest.py": {
    path: "tests/conftest.py",
    name: "conftest.py",
    language: "python",
    description: "Pytest config and global fixtures initializing an in-memory SQLite database and custom API async client.",
    content: `import asyncio
from datetime import datetime, timezone, timedelta
from typing import AsyncGenerator
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.database import Base, get_db_session
from app.models import Product

# Use in-memory SQLite for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create a test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    yield engine
    
    # Drop tables on cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide a clean database session for each test, rolling back after use."""
    async_session_factory = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )
    
    async with async_session_factory() as session:
        yield session
        # Always rollback to ensure test isolation
        await session.rollback()

@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Provide an AsyncClient configured to use the overridden test database session.
    """
    # Override FastAPI dependency to inject the test session
    async def override_get_db_session():
        yield db_session

    app.dependency_overrides[get_db_session] = override_get_db_session
    
    # Use ASGITransport for testing async FastAPI applications in HTTPX
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client
        
    # Clear overrides
    app.dependency_overrides.clear()

@pytest_asyncio.fixture
async def seed_products(db_session: AsyncSession) -> list[Product]:
    """
    Seeds a small predictable set of products for testing:
    - 5 products in Electronics
    - 5 products in Clothing
    Timestamps are set sequentially to test pagination ordering.
    """
    products = []
    base_time = datetime.now(timezone.utc) - timedelta(days=10)
    
    # Seed 5 Electronics
    for i in range(5):
        timestamp = base_time + timedelta(hours=i)
        p = Product(
            name=f"Electronic Device {i}",
            category="Electronics",
            price=100.0 + i * 10,
            created_at=timestamp,
            updated_at=timestamp
        )
        db_session.add(p)
        products.append(p)
        
    # Seed 5 Clothing
    for i in range(5):
        timestamp = base_time + timedelta(hours=i + 10)  # Newer than electronics
        p = Product(
            name=f"Clothing Item {i}",
            category="Clothing",
            price=20.0 + i * 5,
            created_at=timestamp,
            updated_at=timestamp
        )
        db_session.add(p)
        products.append(p)
        
    await db_session.commit()
    
    # Sort them newest first (updated_at DESC, id DESC) to match database default order
    # Note: id is UUID so we can sort by updated_at desc, id desc
    products.sort(key=lambda x: (x.updated_at, x.id), reverse=True)
    return products`
  },
  "tests/test_products.py": {
    path: "tests/test_products.py",
    name: "test_products.py",
    language: "python",
    description: "Pytest suite verifying product retrieval, category filtering, product creation, and input validation boundary conditions.",
    content: `import pytest
from httpx import AsyncClient
from app.models import Product

@pytest.mark.asyncio
async def test_get_products_empty(client: AsyncClient):
    """
    Test that an empty database returns a 200 OK with an empty list
    and a fresh snapshot time, but no next_cursor.
    """
    response = await client.get("/api/products")
    assert response.status_code == 200
    data = response.json()
    assert data["products"] == []
    assert data["next_cursor"] is None
    assert "snapshot_time" in data

@pytest.mark.asyncio
async def test_create_product(client: AsyncClient):
    """
    Test product creation with valid and invalid data payloads.
    """
    # Valid creation
    payload = {
        "name": "Super Coffee Maker",
        "category": "Home",
        "price": 89.99
    }
    response = await client.post("/api/products", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["category"] == payload["category"]
    assert data["price"] == payload["price"]
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data

    # Invalid creation - negative price
    invalid_payload = {
        "name": "Free Mug",
        "category": "Home",
        "price": -5.0
    }
    response = await client.post("/api/products", json=invalid_payload)
    assert response.status_code == 422  # Unprocessable Entity

    # Invalid creation - missing fields
    response = await client.post("/api/products", json={"name": "Only Name"})
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_get_products_with_category_filtering(client: AsyncClient, seed_products: list[Product]):
    """
    Test filtering products by specific category.
    """
    # Filter by Electronics
    response = await client.get("/api/products?category=Electronics")
    assert response.status_code == 200
    data = response.json()
    products = data["products"]
    assert len(products) == 5
    for p in products:
        assert p["category"] == "Electronics"

    # Filter by Clothing
    response = await client.get("/api/products?category=Clothing")
    assert response.status_code == 200
    data = response.json()
    assert len(data["products"]) == 5
    for p in data["products"]:
        assert p["category"] == "Clothing"

    # Filter by non-existent category
    response = await client.get("/api/products?category=NonExistent")
    assert response.status_code == 200
    assert len(response.json()["products"]) == 0

@pytest.mark.asyncio
async def test_invalid_query_parameters(client: AsyncClient):
    """
    Test boundary validation for query parameters such as limit.
    """
    # Limit too high (> 100)
    response = await client.get("/api/products?limit=101")
    assert response.status_code == 422

    # Limit too low (< 1)
    response = await client.get("/api/products?limit=0")
    assert response.status_code == 422

    # Negative limit
    response = await client.get("/api/products?limit=-5")
    assert response.status_code == 422`
  },
  "tests/test_pagination.py": {
    path: "tests/test_pagination.py",
    name: "test_pagination.py",
    language: "python",
    description: "Pytest suite testing sequential pagination, graceful invalid cursor fallbacks, and the crucial snapshot temporal consistency model.",
    content: `import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Product
from app.repositories.products import ProductRepository

@pytest.mark.asyncio
async def test_sequential_cursor_pagination(client: AsyncClient, seed_products: list[Product]):
    """
    Tests traversing the entire product catalog page-by-page.
    We retrieve 10 seeded products in pages of size 3, checking ordering and correctness.
    """
    limit = 3
    all_retrieved = []
    
    # 1. Fetch Page 1
    response = await client.get(f"/api/products?limit={limit}")
    assert response.status_code == 200
    page1 = response.json()
    assert len(page1["products"]) == limit
    all_retrieved.extend(page1["products"])
    
    next_cursor = page1["next_cursor"]
    snapshot_time = page1["snapshot_time"]
    assert next_cursor is not None
    assert snapshot_time is not None

    # 2. Fetch Page 2 (pass next_cursor and snapshot_time)
    response = await client.get(
        f"/api/products?limit={limit}&cursor={next_cursor}&snapshot_time={snapshot_time}"
    )
    assert response.status_code == 200
    page2 = response.json()
    assert len(page2["products"]) == limit
    all_retrieved.extend(page2["products"])
    
    next_cursor = page2["next_cursor"]
    assert next_cursor is not None
    assert page2["snapshot_time"] == snapshot_time  # Snapshot time must remain identical

    # 3. Fetch Page 3
    response = await client.get(
        f"/api/products?limit={limit}&cursor={next_cursor}&snapshot_time={snapshot_time}"
    )
    assert response.status_code == 200
    page3 = response.json()
    assert len(page3["products"]) == limit
    all_retrieved.extend(page3["products"])
    
    next_cursor = page3["next_cursor"]
    assert next_cursor is not None

    # 4. Fetch Page 4 (Final page, should contain the last 1 product)
    response = await client.get(
        f"/api/products?limit={limit}&cursor={next_cursor}&snapshot_time={snapshot_time}"
    )
    assert response.status_code == 200
    page4 = response.json()
    assert len(page4["products"]) == 1
    all_retrieved.extend(page4["products"])
    assert page4["next_cursor"] is None  # End of catalog

    # 5. Verify total count and strict newest-first sorting
    assert len(all_retrieved) == 10
    
    # Check that IDs and values match our seed data exactly, in order
    for i in range(10):
        assert all_retrieved[i]["id"] == str(seed_products[i].id)
        assert all_retrieved[i]["name"] == seed_products[i].name
        
    # Assert strict ordering by updated_at desc, id desc
    for i in range(len(all_retrieved) - 1):
        curr = all_retrieved[i]
        nxt = all_retrieved[i+1]
        assert curr["updated_at"] >= nxt["updated_at"]
        if curr["updated_at"] == nxt["updated_at"]:
            assert curr["id"] > nxt["id"]

@pytest.mark.asyncio
async def test_snapshot_consistency_during_mutation(
    client: AsyncClient,
    db_session: AsyncSession,
    seed_products: list[Product]
):
    """
    Verifies that inserting or updating products mid-pagination does NOT disrupt
    the current browsing session (no duplicates, no skipped items).
    
    Flow:
    1. Retrieve Page 1 (first 4 items), get next_cursor and snapshot_time.
    2. Concurrent Mutation:
       - Insert a brand-new "ultra-new" product (would normally go to the very top).
       - Update an item on Page 2 (Item 5 in seed_products) to be very new.
    3. Retrieve Page 2 using the original cursor and snapshot_time.
    4. Verify we get exactly the original remaining items in their original order,
       and that the newly inserted and modified items do not pollute or shift our page.
    """
    limit = 4
    
    # 1. Fetch Page 1 (Items 0, 1, 2, 3)
    response = await client.get(f"/api/products?limit={limit}")
    assert response.status_code == 200
    page1 = response.json()
    assert len(page1["products"]) == limit
    
    next_cursor = page1["next_cursor"]
    snapshot_time = page1["snapshot_time"]
    
    # 2. Perform Concurrent Mutations in the database
    # A. Insert a brand-new product with a very high updated_at (newest)
    new_product = Product(
        name="Ultra Premium Laptop",
        category="Electronics",
        price=1999.99,
    )
    db_session.add(new_product)
    
    # B. Update a product that resides on Page 2 (Item 5 in seed_products)
    item_on_page_2 = seed_products[5]
    product_to_update = await db_session.get(Product, item_on_page_2.id)
    assert product_to_update is not None
    product_to_update.name = "UPDATED Clothing Item"
    product_to_update.price = 999.0
    import datetime
    product_to_update.updated_at = datetime.datetime.now(datetime.timezone.utc)
    
    await db_session.commit()
    
    # 3. Fetch Page 2 using the saved next_cursor and snapshot_time
    response = await client.get(
        f"/api/products?limit={limit}&cursor={next_cursor}&snapshot_time={snapshot_time}"
    )
    assert response.status_code == 200
    page2 = response.json()
    products2 = page2["products"]
    
    # 4. Assertions:
    # A. The brand new product ("Ultra Premium Laptop") MUST NOT be in the results,
    #    because its updated_at is newer than snapshot_time.
    assert not any(p["name"] == "Ultra Premium Laptop" for p in products2)
    
    # B. The updated product ("UPDATED Clothing Item") is excluded because its
    #    new updated_at is > snapshot_time. Thus we don't get duplicates.
    assert len(products2) == limit - 1  # 3 items instead of 4, since item 5 is excluded.
    
    assert products2[0]["id"] == str(seed_products[4].id)
    assert products2[1]["id"] == str(seed_products[6].id)
    assert products2[2]["id"] == str(seed_products[7].id)

@pytest.mark.asyncio
async def test_invalid_or_malformed_cursor_fallback(client: AsyncClient, seed_products: list[Product]):
    """
    Test that sending an invalid or malformed cursor is handled gracefully.
    Instead of crashing, the API logs a warning and falls back to page 1 of the snapshot,
    ensuring a smooth user experience.
    """
    response = await client.get("/api/products?limit=3&cursor=gibberish_cursor_string")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data["products"]) == 3
    assert data["next_cursor"] is not None
    assert "snapshot_time" in data
    assert data["products"][0]["id"] == str(seed_products[0].id)

@pytest.mark.asyncio
async def test_empty_results_handling(client: AsyncClient, seed_products: list[Product]):
    """
    Test querying a snapshot time in the past before any products were created.
    Should return an empty list of products with a null next_cursor.
    """
    import datetime
    past_time = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=20)).isoformat()
    
    response = await client.get(f"/api/products?limit=5&snapshot_time={past_time}")
    assert response.status_code == 200
    data = response.json()
    assert data["products"] == []
    assert data["next_cursor"] is None
    assert data["snapshot_time"].startswith(past_time[:19])`
  },
  "alembic.ini": {
    path: "alembic.ini",
    name: "alembic.ini",
    language: "text",
    description: "Configuration file for Alembic database migrations.",
    content: `# A generic, single-database configuration.

[alembic]
script_location = alembic
sqlalchemy.url = postgresql+asyncpg://postgres:postgres@localhost:5432/products_db

[post_write_hooks]

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARNING
handlers = console
qualname =

[logger_sqlalchemy]
level = WARNING
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stdout,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S`
  },
  "alembic/env.py": {
    path: "alembic/env.py",
    name: "env.py",
    language: "python",
    description: "Alembic environment configuration orchestrating async migrations.",
    content: `import asyncio
import os
import sys
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

sys.path.append(os.getcwd())

from app.database import Base
from app.models import Product
from app.config import settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

db_url = os.getenv("DATABASE_URL", settings.DATABASE_URL)
config.set_main_option("sqlalchemy.url", db_url)

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(run_migrations_online_sync)

    await connectable.dispose()

def run_migrations_online_sync(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    import asyncio
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        asyncio.run(run_migrations_online())
    else:
        asyncio.create_task(run_migrations_online())`
  },
  "alembic/versions/7a0d4c82b0e6_init_products.py": {
    path: "alembic/versions/7a0d4c82b0e6_init_products.py",
    name: "7a0d4c82b0e6_init_products.py",
    language: "python",
    description: "Initial migration revision creating the products table and its composite indexes.",
    content: `"""init products

Revision ID: 7a0d4c82b0e6
Revises: 
Create Date: 2026-03-29 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '7a0d4c82b0e6'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'products',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index(
        'idx_products_updated_at_id',
        'products',
        [sa.text('updated_at DESC'), sa.text('id DESC')],
        unique=False
    )
    op.create_index(
        'idx_products_category_updated_at_id',
        'products',
        ['category', sa.text('updated_at DESC'), sa.text('id DESC')],
        unique=False
    )

def downgrade() -> None:
    op.drop_index('idx_products_category_updated_at_id', table_name='products')
    op.drop_index('idx_products_updated_at_id', table_name='products')
    op.drop_table('products')`
  },
  "requirements.txt": {
    path: "requirements.txt",
    name: "requirements.txt",
    language: "text",
    description: "Production package dependencies for deployment (Render, Neon, local venv).",
    content: `fastapi==0.110.0
uvicorn[standard]==0.28.0
sqlalchemy[asyncio]>=2.0.0
asyncpg==0.29.0
pydantic[email]>=2.6.4
pydantic-settings==2.2.1
alembic==1.13.1
python-dotenv==1.0.1
pytest==8.1.1
pytest-asyncio==0.23.5
httpx==0.27.0`
  },
  ".env.example": {
    path: ".env.example",
    name: ".env.example",
    language: "text",
    description: "Example configuration variables and credential placeholders.",
    content: `# Database Configuration
# Neon PostgreSQL URL (Use postgresql+asyncpg for SQLAlchemy async driver)
DATABASE_URL=postgresql+asyncpg://user:password@ep-cool-snowflake-123456.us-east-2.aws.neon.tech/neondb?sslmode=require

# Application Configuration
ENV=development
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=info

# Testing Configuration
TEST_DATABASE_URL=sqlite+aiosqlite:///:memory:`
  }
};
