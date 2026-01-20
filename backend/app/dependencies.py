"""Dependency injection for services."""
from functools import lru_cache
from typing import Dict, Any
import os

from .services.pdf_service import PDFService
from .services.mistral_service import MistralService
from .services.graphrag_service import GraphRAGService
from .services.embedding_service import EmbeddingService
from .services.search_service import SearchService


# Global service instances
_services: Dict[str, Any] = {}


def initialize_services(
    upload_dir: str = "uploads",
    data_dir: str = "data",
    mistral_api_key: str = None
):
    """Initialize all services."""
    global _services
    
    pdf_service = PDFService(upload_dir=upload_dir)
    mistral_service = MistralService(api_key=mistral_api_key)
    graphrag_service = GraphRAGService(data_dir=data_dir)
    embedding_service = EmbeddingService(data_dir=data_dir)
    search_service = SearchService(
        mistral_service=mistral_service,
        embedding_service=embedding_service,
        graphrag_service=graphrag_service
    )
    
    _services = {
        "pdf": pdf_service,
        "mistral": mistral_service,
        "graphrag": graphrag_service,
        "embedding": embedding_service,
        "search": search_service
    }
    
    return _services


def get_services() -> Dict[str, Any]:
    """Get the service instances."""
    global _services
    if not _services:
        initialize_services()
    return _services


def get_pdf_service() -> PDFService:
    """Get PDF service."""
    return get_services()["pdf"]


def get_mistral_service() -> MistralService:
    """Get Mistral service."""
    return get_services()["mistral"]


def get_graphrag_service() -> GraphRAGService:
    """Get GraphRAG service."""
    return get_services()["graphrag"]


def get_embedding_service() -> EmbeddingService:
    """Get embedding service."""
    return get_services()["embedding"]


def get_search_service() -> SearchService:
    """Get search service."""
    return get_services()["search"]
