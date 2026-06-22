from datetime import datetime
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
        )
