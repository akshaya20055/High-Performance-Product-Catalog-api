import asyncio
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
        # Perform bulk insert inside a transaction
        async with async_session_factory() as session:
            async with session.begin():
                 await session.execute(insert(Product), records)
                 
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
    asyncio.run(seed_database())
