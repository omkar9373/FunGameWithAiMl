import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_HOST: str = os.getenv("DATABASE_HOST", "localhost")
    DATABASE_PORT: int = int(os.getenv("DATABASE_PORT", 3306))
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "game_prediction_db")
    DATABASE_USER: str = os.getenv("DATABASE_USER", "root")
    DATABASE_PASSWORD: str = os.getenv("DATABASE_PASSWORD", "")
    
    MODEL_PATH: str = os.getenv("MODEL_PATH", "./ml/artifacts/model.pkl")
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", 8000))
    FRONTEND_API_URL: str = os.getenv("FRONTEND_API_URL", "http://localhost:8000")

    class Config:
        env_file = ".env"

settings = Settings()
