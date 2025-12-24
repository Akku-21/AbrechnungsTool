"""add_ocr_llm_fields_to_documents

Revision ID: 2ff243f958ca
Revises: 93d1a0107f1c
Create Date: 2025-12-23 19:06:43.500647

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2ff243f958ca'
down_revision: Union[str, None] = '93d1a0107f1c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new OCR-related columns to documents table
    op.add_column('documents', sa.Column('ocr_corrected_text', sa.Text(), nullable=True))
    op.add_column('documents', sa.Column('ocr_engine', sa.String(length=50), nullable=True))
    op.add_column('documents', sa.Column('llm_extraction_used', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('documents', sa.Column('llm_extraction_error', sa.Text(), nullable=True))


def downgrade() -> None:
    # Try dropping new column names first, then fall back to old names
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('documents')]

    if 'llm_extraction_error' in columns:
        op.drop_column('documents', 'llm_extraction_error')
    if 'llm_extraction_used' in columns:
        op.drop_column('documents', 'llm_extraction_used')
    elif 'llm_correction_used' in columns:
        op.drop_column('documents', 'llm_correction_used')

    if 'ocr_engine' in columns:
        op.drop_column('documents', 'ocr_engine')
    if 'ocr_corrected_text' in columns:
        op.drop_column('documents', 'ocr_corrected_text')
