"""Search endpoints for topics and content."""
from fastapi import APIRouter, Query
from typing import Optional

from ..models.schemas import TopicSearchRequest, TopicSearchResult, EmbeddingSearchRequest, EmbeddingSearchResult
from ..dependencies import get_services

router = APIRouter(prefix="/search", tags=["search"])


@router.post("/topics", response_model=TopicSearchResult)
async def search_topics(request: TopicSearchRequest):
    """Search for topics using semantic similarity."""
    services = get_services()
    return await services["search"].search_topics(
        query=request.query,
        top_k=request.top_k,
        threshold=request.threshold
    )


@router.get("/topics")
async def search_topics_get(
    query: str = Query(..., min_length=1),
    top_k: int = Query(10, ge=1, le=100),
    threshold: float = Query(0.5, ge=0.0, le=1.0)
):
    """Search for topics using semantic similarity (GET endpoint)."""
    services = get_services()
    return await services["search"].search_topics(
        query=query,
        top_k=top_k,
        threshold=threshold
    )


@router.post("/embeddings", response_model=EmbeddingSearchResult)
async def search_embeddings(request: EmbeddingSearchRequest):
    """Search embeddings using semantic similarity."""
    services = get_services()
    return await services["search"].search_embeddings(
        query=request.query,
        top_k=request.top_k,
        include_embeddings=request.include_embeddings
    )


@router.get("/embeddings")
async def search_embeddings_get(
    query: str = Query(..., min_length=1),
    top_k: int = Query(20, ge=1, le=100),
    type_filter: Optional[str] = None,
    include_embeddings: bool = False
):
    """Search embeddings using semantic similarity (GET endpoint)."""
    services = get_services()
    return await services["search"].search_embeddings(
        query=query,
        top_k=top_k,
        type_filter=type_filter,
        include_embeddings=include_embeddings
    )


@router.get("/hybrid")
async def hybrid_search(
    query: str = Query(..., min_length=1),
    top_k: int = Query(10, ge=1, le=100),
    topic_weight: float = Query(0.5, ge=0.0, le=1.0),
    embedding_weight: float = Query(0.5, ge=0.0, le=1.0)
):
    """Perform hybrid search combining topics and embeddings."""
    services = get_services()
    return await services["search"].hybrid_search(
        query=query,
        top_k=top_k,
        topic_weight=topic_weight,
        embedding_weight=embedding_weight
    )


@router.get("/documents/{doc_id}/topics")
async def get_document_topics(doc_id: str):
    """Get all topics for a specific document."""
    services = get_services()
    topics = await services["search"].get_document_topics(doc_id)
    return {"document_id": doc_id, "topics": topics}
