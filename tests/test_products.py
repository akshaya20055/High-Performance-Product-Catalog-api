import pytest
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
    assert response.status_code == 422
