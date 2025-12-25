"""add_unit_settlement_fields

Revision ID: a1b2c3d4e5f6
Revises: 588952f03712
Create Date: 2025-12-25

Add fields for unit-specific settlements:
- settlement_results.notes: Unit-specific notes
- documents.settlement_result_id: FK for unit-specific documents
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '588952f03712'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add notes field to settlement_results
    op.add_column('settlement_results', sa.Column('notes', sa.Text(), nullable=True))

    # Add settlement_result_id FK to documents (for unit-specific documents)
    op.add_column('documents', sa.Column(
        'settlement_result_id',
        postgresql.UUID(as_uuid=True),
        nullable=True
    ))
    op.create_foreign_key(
        'fk_documents_settlement_result_id',
        'documents',
        'settlement_results',
        ['settlement_result_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    op.drop_constraint('fk_documents_settlement_result_id', 'documents', type_='foreignkey')
    op.drop_column('documents', 'settlement_result_id')
    op.drop_column('settlement_results', 'notes')
