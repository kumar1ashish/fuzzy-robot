"""Embedding service for vector storage and retrieval."""
import os
import uuid
import asyncio
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime

from ..models.schemas import EmbeddingPoint, EmbeddingVisualizationData


class EmbeddingService:
    """Service for managing embeddings and vector operations."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.embeddings: Dict[str, EmbeddingPoint] = {}
        self.embedding_dim = 1024  # Mistral embedding dimension
        os.makedirs(data_dir, exist_ok=True)

    async def store_embedding(
        self,
        text: str,
        embedding: List[float],
        point_type: str,
        metadata: Dict[str, Any] = None
    ) -> EmbeddingPoint:
        """Store an embedding point."""
        point_id = str(uuid.uuid4())
        
        point = EmbeddingPoint(
            id=point_id,
            text=text[:500],  # Truncate for storage
            type=point_type,
            embedding=embedding,
            metadata=metadata or {}
        )
        
        self.embeddings[point_id] = point
        return point

    async def store_embeddings_batch(
        self,
        items: List[Dict[str, Any]],
        embeddings: List[List[float]]
    ) -> List[EmbeddingPoint]:
        """Store multiple embeddings at once."""
        points = []
        for item, embedding in zip(items, embeddings):
            point = await self.store_embedding(
                text=item.get("text", ""),
                embedding=embedding,
                point_type=item.get("type", "chunk"),
                metadata=item.get("metadata", {})
            )
            points.append(point)
        return points

    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        a = np.array(vec1)
        b = np.array(vec2)
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10))

    async def search(
        self,
        query_embedding: List[float],
        top_k: int = 10,
        type_filter: Optional[str] = None,
        threshold: float = 0.0
    ) -> List[Dict[str, Any]]:
        """Search for similar embeddings."""
        results = []
        
        for point_id, point in self.embeddings.items():
            if type_filter and point.type != type_filter:
                continue
                
            similarity = self.cosine_similarity(query_embedding, point.embedding)
            
            if similarity >= threshold:
                results.append({
                    "id": point.id,
                    "text": point.text,
                    "type": point.type,
                    "similarity": similarity,
                    "metadata": point.metadata
                })
        
        # Sort by similarity descending
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]

    async def get_visualization_data(
        self,
        type_filter: Optional[str] = None,
        max_points: int = 1000
    ) -> EmbeddingVisualizationData:
        """Get embedding data for visualization with 2D projections."""
        points = list(self.embeddings.values())
        
        if type_filter:
            points = [p for p in points if p.type == type_filter]
        
        points = points[:max_points]
        
        if len(points) == 0:
            return EmbeddingVisualizationData(
                points=[],
                labels=[],
                clusters=None
            )

        # Compute 2D projections using PCA
        embeddings_matrix = np.array([p.embedding for p in points])
        projected = await self._compute_2d_projection(embeddings_matrix)
        
        # Update points with projections
        for i, point in enumerate(points):
            point.x = float(projected[i, 0])
            point.y = float(projected[i, 1])

        labels = list(set(p.type for p in points))
        
        # Simple clustering based on types
        clusters = {}
        for point in points:
            if point.type not in clusters:
                clusters[point.type] = []
            clusters[point.type].append(point.id)

        return EmbeddingVisualizationData(
            points=points,
            labels=labels,
            clusters=clusters
        )

    async def _compute_2d_projection(self, embeddings: np.ndarray) -> np.ndarray:
        """Compute 2D projection using PCA."""
        if len(embeddings) < 2:
            return np.zeros((len(embeddings), 2))

        # Center the data
        mean = np.mean(embeddings, axis=0)
        centered = embeddings - mean

        # Compute SVD for PCA
        try:
            U, S, Vt = np.linalg.svd(centered, full_matrices=False)
            # Project to 2D
            projected = centered @ Vt[:2].T
            
            # Normalize to [-1, 1] range
            max_val = np.max(np.abs(projected)) + 1e-10
            projected = projected / max_val
            
            return projected
        except Exception:
            # Fallback to random projection
            return np.random.randn(len(embeddings), 2)

    def get_all_points(self) -> List[EmbeddingPoint]:
        """Get all embedding points."""
        return list(self.embeddings.values())

    def get_point_by_id(self, point_id: str) -> Optional[EmbeddingPoint]:
        """Get an embedding point by ID."""
        return self.embeddings.get(point_id)

    def get_points_by_type(self, point_type: str) -> List[EmbeddingPoint]:
        """Get all points of a specific type."""
        return [p for p in self.embeddings.values() if p.type == point_type]

    async def compute_cluster_centroids(self) -> Dict[str, List[float]]:
        """Compute centroids for each type cluster."""
        centroids = {}
        types = set(p.type for p in self.embeddings.values())
        
        for t in types:
            points = self.get_points_by_type(t)
            if points:
                embeddings = np.array([p.embedding for p in points])
                centroid = np.mean(embeddings, axis=0).tolist()
                centroids[t] = centroid
        
        return centroids

    def export_for_atlas(self) -> Dict[str, Any]:
        """Export embeddings in format suitable for Apple embedding-atlas."""
        points = list(self.embeddings.values())
        
        return {
            "embeddings": [p.embedding for p in points],
            "labels": [p.type for p in points],
            "texts": [p.text for p in points],
            "metadata": [
                {
                    "id": p.id,
                    "type": p.type,
                    **p.metadata
                }
                for p in points
            ]
        }
