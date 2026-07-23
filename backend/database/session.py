from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from ..app.config import settings
from .base import Base
import backend.models.models  # noqa: F401 — ensure models are registered for create_all

# Single shared engine / session factory for the whole backend.
engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_db_and_tables():
    Base.metadata.create_all(engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
