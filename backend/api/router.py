from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from ..models.models import Trade, Setting
from ..database.session import get_db
import json

router = APIRouter()

# --- Pydantic Schemas ---
class TradeCreate(BaseModel):
    broker: Optional[str] = None
    pair: str
    direction: str
    confidence: Optional[int] = None
    trade_score: Optional[int] = None
    ai_reason: Optional[str] = None
    market_structure: Optional[str] = None
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    profit_loss: Optional[float] = None
    notes: Optional[str] = None

class SettingUpdate(BaseModel):
    key: str
    value: str # JSON string

# --- Routes ---

@router.get("/trades")
def get_trades(db: Session = Depends(get_db)):
    return db.query(Trade).order_by(Trade.timestamp.desc()).all()

@router.post("/trades")
def create_trade(trade: TradeCreate, db: Session = Depends(get_db)):
    db_trade = Trade(**trade.dict())
    db.add(db_trade)
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save trade: {exc}")
    db.refresh(db_trade)
    return db_trade

@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    settings_records = db.query(Setting).all()
    result = {}
    for s in settings_records:
        try:
            result[s.key] = json.loads(s.value)
        except (json.JSONDecodeError, TypeError):
            # Tolerate malformed/legacy values instead of failing the whole request
            result[s.key] = s.value
    return result

@router.post("/settings")
def update_setting(setting: SettingUpdate, db: Session = Depends(get_db)):
    db_setting = db.query(Setting).filter(Setting.key == setting.key).first()
    if db_setting:
        db_setting.value = setting.value
    else:
        db_setting = Setting(key=setting.key, value=setting.value)
        db.add(db_setting)
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save setting: {exc}")
    return {"status": "success"}
