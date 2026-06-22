from datetime import datetime, timezone
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
        return product
