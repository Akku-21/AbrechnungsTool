"""Migrate CALCULATED status to DRAFT

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2025-12-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Convert all CALCULATED settlements to DRAFT
    # Since auto-calculation is now in place, CALCULATED is no longer needed
    op.execute("UPDATE settlements SET status = 'DRAFT' WHERE status = 'CALCULATED'")


def downgrade() -> None:
    # No downgrade - CALCULATED status is being deprecated
    pass
