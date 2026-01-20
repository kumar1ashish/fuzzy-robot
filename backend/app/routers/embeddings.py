"""Embeddings endpoints for visualization and atlas integration."""
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from typing import Optional, List

from ..models.schemas import EmbeddingVisualizationData, EmbeddingPoint
from ..dependencies import get_services

router = APIRouter(prefix="/embeddings", tags=["embeddings"])


@router.get("/", response_model=List[EmbeddingPoint])
async def get_all_embeddings(
    type_filter: Optional[str] = None,
    limit: int = Query(1000, ge=1, le=10000)
):
    """Get all embedding points."""
    services = get_services()
    embedding_service = services["embedding"]
    
    if type_filter:
        points = embedding_service.get_points_by_type(type_filter)
    else:
        points = embedding_service.get_all_points()
    
    return points[:limit]


@router.get("/visualization", response_model=EmbeddingVisualizationData)
async def get_visualization_data(
    type_filter: Optional[str] = None,
    max_points: int = Query(1000, ge=1, le=5000)
):
    """Get embedding data for visualization with 2D projections."""
    services = get_services()
    return await services["embedding"].get_visualization_data(
        type_filter=type_filter,
        max_points=max_points
    )


@router.get("/atlas")
async def get_atlas_data():
    """Get embeddings in format suitable for Apple embedding-atlas."""
    services = get_services()
    return services["embedding"].export_for_atlas()


@router.get("/atlas/config")
async def get_atlas_config():
    """Get configuration for embedding-atlas visualization."""
    services = get_services()
    embedding_service = services["embedding"]
    
    points = embedding_service.get_all_points()
    types = list(set(p.type for p in points))
    
    # Define color scheme for types
    type_colors = {
        "document": "#4CAF50",
        "chunk": "#2196F3", 
        "topic": "#FF9800",
        "entity": "#9C27B0",
        "query": "#F44336"
    }
    
    return {
        "title": "PDF Knowledge Graph Embeddings",
        "description": "Visualization of document embeddings and topics",
        "embedding_dimension": 1024,
        "total_points": len(points),
        "types": types,
        "colors": {t: type_colors.get(t, "#757575") for t in types},
        "settings": {
            "point_size": 5,
            "opacity": 0.8,
            "hover_enabled": True,
            "clustering_enabled": True
        }
    }


@router.get("/centroids")
async def get_cluster_centroids():
    """Get centroids for each type cluster."""
    services = get_services()
    return await services["embedding"].compute_cluster_centroids()


@router.get("/stats")
async def get_embedding_stats():
    """Get statistics about stored embeddings."""
    services = get_services()
    embedding_service = services["embedding"]
    
    points = embedding_service.get_all_points()
    
    # Count by type
    type_counts = {}
    for point in points:
        type_counts[point.type] = type_counts.get(point.type, 0) + 1
    
    return {
        "total_embeddings": len(points),
        "embedding_dimension": embedding_service.embedding_dim,
        "embeddings_by_type": type_counts,
        "types": list(type_counts.keys())
    }


@router.post("/project")
async def project_query(query: str):
    """Get 2D projection for a query embedding."""
    services = get_services()
    mistral = services["mistral"]
    embedding_service = services["embedding"]
    
    # Get query embedding
    query_embedding = await mistral.get_embedding(query)
    
    # Get visualization data to find projection
    viz_data = await embedding_service.get_visualization_data()
    
    if not viz_data.points:
        return {
            "query": query,
            "embedding": query_embedding,
            "x": 0.0,
            "y": 0.0,
            "nearest_points": []
        }
    
    # Find nearest points
    results = await embedding_service.search(
        query_embedding=query_embedding,
        top_k=5
    )
    
    # Use average of nearest points for projection
    import numpy as np
    nearest = [p for p in viz_data.points if p.id in [r["id"] for r in results]]
    if nearest:
        x = np.mean([p.x for p in nearest if p.x is not None])
        y = np.mean([p.y for p in nearest if p.y is not None])
    else:
        x, y = 0.0, 0.0
    
    return {
        "query": query,
        "embedding": query_embedding,
        "x": float(x),
        "y": float(y),
        "nearest_points": results
    }
