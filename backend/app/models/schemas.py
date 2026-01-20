"""Pydantic schemas for the application."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ProcessingStatus(str, Enum):
    """Status of document processing."""
    PENDING = "pending"
    EXTRACTING = "extracting"
    BUILDING_GRAPH = "building_graph"
    EMBEDDING = "embedding"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentInfo(BaseModel):
    """Information about an uploaded document."""
    id: str
    filename: str
    file_size: int
    upload_time: datetime
    status: ProcessingStatus = ProcessingStatus.PENDING
    page_count: Optional[int] = None
    error_message: Optional[str] = None


class DocumentUploadResponse(BaseModel):
    """Response after document upload."""
    documents: List[DocumentInfo]
    total_uploaded: int
    message: str


class ExtractedContent(BaseModel):
    """Extracted content from a PDF."""
    document_id: str
    text: str
    page_texts: List[str]
    metadata: Dict[str, Any] = {}


class GraphNode(BaseModel):
    """A node in the knowledge graph."""
    id: str
    label: str
    type: str
    properties: Dict[str, Any] = {}
    embedding: Optional[List[float]] = None


class GraphEdge(BaseModel):
    """An edge in the knowledge graph."""
    source: str
    target: str
    label: str
    weight: float = 1.0
    properties: Dict[str, Any] = {}


class KnowledgeGraph(BaseModel):
    """Knowledge graph structure."""
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    metadata: Dict[str, Any] = {}


class Topic(BaseModel):
    """A topic extracted from documents."""
    id: str
    name: str
    description: str
    keywords: List[str]
    document_ids: List[str]
    embedding: Optional[List[float]] = None
    relevance_score: float = 0.0


class TopicSearchRequest(BaseModel):
    """Request for topic search."""
    query: str
    top_k: int = Field(default=10, ge=1, le=100)
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)


class TopicSearchResult(BaseModel):
    """Result of topic search."""
    topics: List[Topic]
    query_embedding: Optional[List[float]] = None


class EmbeddingSearchRequest(BaseModel):
    """Request for embedding-based search."""
    query: str
    top_k: int = Field(default=20, ge=1, le=100)
    include_embeddings: bool = False


class EmbeddingPoint(BaseModel):
    """A point in embedding space."""
    id: str
    text: str
    type: str  # 'document', 'chunk', 'topic', 'entity'
    embedding: List[float]
    metadata: Dict[str, Any] = {}
    x: Optional[float] = None  # 2D projection
    y: Optional[float] = None


class EmbeddingSearchResult(BaseModel):
    """Result of embedding search."""
    results: List[Dict[str, Any]]
    query_embedding: Optional[List[float]] = None


class EmbeddingVisualizationData(BaseModel):
    """Data for embedding visualization."""
    points: List[EmbeddingPoint]
    labels: List[str]
    clusters: Optional[Dict[str, List[str]]] = None


class GraphVisualizationData(BaseModel):
    """Data for graph visualization."""
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    communities: Optional[Dict[str, List[str]]] = None


class ProcessingProgress(BaseModel):
    """Progress of document processing."""
    document_id: str
    status: ProcessingStatus
    progress: float = Field(ge=0.0, le=1.0)
    current_step: str
    message: str
