"""init products

Revision ID: 7a0d4c82b0e6
Revises: 
Create Date: 2026-03-29 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7a0d4c82b0e6'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create products table
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
    
    # Create compound indexes
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
    # Drop compound indexes
    op.drop_index('idx_products_category_updated_at_id', table_name='products')
    op.drop_index('idx_products_updated_at_id', table_name='products')
    
    # Drop products table
    op.drop_table('products')
