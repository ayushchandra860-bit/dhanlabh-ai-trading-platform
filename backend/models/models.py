from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime
from sqlalchemy.sql import func
from ..database.base import Base

class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    broker = Column(String(50), nullable=True)
    pair = Column(String(20), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    direction = Column(String(10), nullable=False) # BUY / SELL
    confidence = Column(Integer, nullable=True)
    trade_score = Column(Integer, nullable=True)
    ai_reason = Column(Text, nullable=True)
    market_structure = Column(String(50), nullable=True)
    entry_price = Column(Float, nullable=True)
    exit_price = Column(Float, nullable=True)
    profit_loss = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False) # Store JSON string
