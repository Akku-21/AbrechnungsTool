"""Add unit_id to invoices for unit-specific invoices

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2025-12-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add unit_id column to invoices (nullable - NULL means settlement-wide)
    op.add_column('invoices', sa.Column('unit_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_invoices_unit_id',
        'invoices', 'units',
        ['unit_id'], ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    op.drop_constraint('fk_invoices_unit_id', 'invoices', type_='foreignkey')
    op.drop_column('invoices', 'unit_id')
