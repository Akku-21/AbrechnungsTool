"""
Anwendungseinstellungen
"""
from sqlalchemy import Column, String, Text
from app.db.base import Base


class Settings(Base):
    """Key-Value Store für Anwendungseinstellungen"""
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=True)
    description = Column(String(255), nullable=True)
