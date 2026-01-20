"""Search service combining topic and embedding search."""
import asyncio
from typing import List, Dict, Any, Optional

from ..models.schemas import Topic, TopicSearchResult, EmbeddingSearchResult
from .mistral_service import MistralService
from .embedding_service import EmbeddingService
from .graphrag_service import GraphRAGService


class SearchService:
    """Unified search service for topics and embeddings."""

    def __init__(
        self,
        mistral_service: MistralService,
        embedding_service: EmbeddingService,
        graphrag_service: GraphRAGService
    ):
        self.mistral = mistral_service
        self.embeddings = embedding_service
        self.graphrag = graphrag_service

    async def search_topics(
        self,
        query: str,
        top_k: int = 10,
        threshold: float = 0.5
    ) -> TopicSearchResult:
        """Search for topics using semantic similarity."""
        # Get query embedding
        query_embedding = await self.mistral.get_embedding(query)
        
        # Get all topics
        topics = self.graphrag.get_topics()
        
        # Calculate similarity for each topic
        results = []
        for topic in topics:
            if topic.embedding:
                similarity = self.embeddings.cosine_similarity(
                    query_embedding, topic.embedding
                )
                if similarity >= threshold:
                    topic.relevance_score = similarity
                    results.append(topic)
            else:
                # If no embedding, do simple text matching
                query_lower = query.lower()
                if query_lower in topic.name.lower() or any(
                    query_lower in kw.lower() for kw in topic.keywords
                ):
                    topic.relevance_score = 0.5
                    results.append(topic)

        # Sort by relevance
        results.sort(key=lambda x: x.relevance_score, reverse=True)
        
        return TopicSearchResult(
            topics=results[:top_k],
            query_embedding=query_embedding
        )

    async def search_embeddings(
        self,
        query: str,
        top_k: int = 20,
        type_filter: Optional[str] = None,
        include_embeddings: bool = False
    ) -> EmbeddingSearchResult:
        """Search embeddings using semantic similarity."""
        # Get query embedding
        query_embedding = await self.mistral.get_embedding(query)
        
        # Search in embedding store
        results = await self.embeddings.search(
            query_embedding=query_embedding,
            top_k=top_k,
            type_filter=type_filter
        )

        # Optionally remove embeddings from results for smaller response
        if not include_embeddings:
            for r in results:
                r.pop("embedding", None)

        return EmbeddingSearchResult(
            results=results,
            query_embedding=query_embedding if include_embeddings else None
        )

    async def hybrid_search(
        self,
        query: str,
        top_k: int = 10,
        topic_weight: float = 0.5,
        embedding_weight: float = 0.5
    ) -> Dict[str, Any]:
        """Perform hybrid search combining topics and embeddings."""
        # Run both searches in parallel
        topic_task = self.search_topics(query, top_k=top_k * 2)
        embedding_task = self.search_embeddings(query, top_k=top_k * 2)
        
        topic_results, embedding_results = await asyncio.gather(
            topic_task, embedding_task
        )

        # Combine and re-rank results
        combined = {}
        
        # Add topic results
        for topic in topic_results.topics:
            combined[topic.id] = {
                "id": topic.id,
                "text": topic.name,
                "description": topic.description,
                "type": "topic",
                "topic_score": topic.relevance_score * topic_weight,
                "embedding_score": 0,
                "combined_score": topic.relevance_score * topic_weight
            }

        # Add/merge embedding results
        for result in embedding_results.results:
            result_id = result["id"]
            if result_id in combined:
                combined[result_id]["embedding_score"] = result["similarity"] * embedding_weight
                combined[result_id]["combined_score"] += result["similarity"] * embedding_weight
            else:
                combined[result_id] = {
                    "id": result_id,
                    "text": result["text"],
                    "description": "",
                    "type": result["type"],
                    "topic_score": 0,
                    "embedding_score": result["similarity"] * embedding_weight,
                    "combined_score": result["similarity"] * embedding_weight
                }

        # Sort by combined score
        results = sorted(
            combined.values(),
            key=lambda x: x["combined_score"],
            reverse=True
        )[:top_k]

        return {
            "results": results,
            "query": query,
            "topic_count": len(topic_results.topics),
            "embedding_count": len(embedding_results.results)
        }

    async def get_related_topics(
        self,
        topic_id: str,
        top_k: int = 5
    ) -> List[Topic]:
        """Get topics related to a given topic."""
        topic = self.graphrag.get_topic_by_id(topic_id)
        if not topic or not topic.embedding:
            return []

        all_topics = self.graphrag.get_topics()
        results = []

        for other_topic in all_topics:
            if other_topic.id == topic_id:
                continue
            if other_topic.embedding:
                similarity = self.embeddings.cosine_similarity(
                    topic.embedding, other_topic.embedding
                )
                other_topic.relevance_score = similarity
                results.append(other_topic)

        results.sort(key=lambda x: x.relevance_score, reverse=True)
        return results[:top_k]

    async def get_document_topics(self, doc_id: str) -> List[Topic]:
        """Get all topics for a specific document."""
        all_topics = self.graphrag.get_topics()
        return [t for t in all_topics if doc_id in t.document_ids]
