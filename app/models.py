import uuid
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
        return f"<Product name={self.name} category={self.category} price={self.price}>"
