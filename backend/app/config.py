"""Application configuration."""
import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings."""

    # API Keys
    mistral_api_key: str = os.getenv("MISTRAL_API_KEY", "")

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # Upload settings
    upload_dir: str = "uploads"
    max_file_size: int = 50 * 1024 * 1024  # 50MB
    allowed_extensions: list = [".pdf"]

    # Data directories
    data_dir: str = "data"
    graphrag_dir: str = "data/graphrag"
    embeddings_dir: str = "data/embeddings"
    chroma_dir: str = "data/chroma"

    # GraphRAG settings
    chunk_size: int = 1200
    chunk_overlap: int = 100

    # Embedding settings
    embedding_model: str = "mistral-embed"
    embedding_dimension: int = 1024

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
