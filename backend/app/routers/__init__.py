"""API routers."""
from .documents import router as documents_router
from .graph import router as graph_router
from .search import router as search_router
from .embeddings import router as embeddings_router

__all__ = [
    "documents_router",
    "graph_router",
    "search_router",
    "embeddings_router",
]
