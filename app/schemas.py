from datetime import datetime
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
    snapshot_time: datetime = Field(..., description="The stable database snapshot timestamp used for this browsing session")
