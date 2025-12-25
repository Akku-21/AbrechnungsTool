"""change_document_settlement_result_fk_to_set_null

Revision ID: 164666f109d6
Revises: c3d4e5f6g7h8
Create Date: 2025-12-25 13:28:09.230304

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '164666f109d6'
down_revision: Union[str, None] = 'c3d4e5f6g7h8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change FK on documents.settlement_result_id from CASCADE to SET NULL
    # So documents are preserved when settlement results are recalculated
    op.drop_constraint('fk_documents_settlement_result_id', 'documents', type_='foreignkey')
    op.create_foreign_key(
        'fk_documents_settlement_result_id',
        'documents', 'settlement_results',
        ['settlement_result_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_constraint('fk_documents_settlement_result_id', 'documents', type_='foreignkey')
    op.create_foreign_key(
        'fk_documents_settlement_result_id',
        'documents', 'settlement_results',
        ['settlement_result_id'], ['id'],
        ondelete='CASCADE'
    )
