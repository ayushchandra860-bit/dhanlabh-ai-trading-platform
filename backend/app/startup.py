from fastapi import FastAPI
from backend.database.session import create_db_and_tables


def setup_database(app: FastAPI):
    create_db_and_tables()
