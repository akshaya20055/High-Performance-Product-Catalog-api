import asyncio
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
    return products
