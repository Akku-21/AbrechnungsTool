"""add_extracted_data_fields_to_documents

Revision ID: 588952f03712
Revises: 2ff243f958ca
Create Date: 2025-12-24 13:28:49.529070

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '588952f03712'
down_revision: Union[str, None] = '2ff243f958ca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('documents', sa.Column('extracted_vendor_name', sa.String(length=255), nullable=True))
    op.add_column('documents', sa.Column('extracted_invoice_number', sa.String(length=100), nullable=True))
    op.add_column('documents', sa.Column('extracted_invoice_date', sa.Date(), nullable=True))
    op.add_column('documents', sa.Column('extracted_total_amount', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('documents', sa.Column('extracted_cost_category', sa.Enum('GRUNDSTEUER', 'WASSERVERSORGUNG', 'ENTWAESSERUNG', 'HEIZUNG', 'WARMWASSER', 'VERBUNDENE_ANLAGEN', 'AUFZUG', 'STRASSENREINIGUNG', 'GEBAEUDEREINIGUNG', 'GARTENPFLEGE', 'BELEUCHTUNG', 'SCHORNSTEINREINIGUNG', 'VERSICHERUNG', 'HAUSWART', 'ANTENNE_KABEL', 'WAESCHEPFLEGE', 'SONSTIGE', name='costcategory', create_type=False), nullable=True))


def downgrade() -> None:
    op.drop_column('documents', 'extracted_cost_category')
    op.drop_column('documents', 'extracted_total_amount')
    op.drop_column('documents', 'extracted_invoice_date')
    op.drop_column('documents', 'extracted_invoice_number')
    op.drop_column('documents', 'extracted_vendor_name')
