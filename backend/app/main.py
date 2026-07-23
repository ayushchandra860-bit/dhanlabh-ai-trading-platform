from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .startup import setup_database

app = FastAPI(title="DhanLabh AI V2 Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup database on startup
setup_database(app)

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "DhanLabh AI V2 Backend is running!"}

# API routes
from backend.api.router import router
app.include_router(router, prefix="/api")
