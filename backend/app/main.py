"""Main FastAPI application."""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .routers import documents_router, graph_router, search_router, embeddings_router
from .dependencies import initialize_services


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Initialize services on startup
    upload_dir = os.getenv("UPLOAD_DIR", "uploads")
    data_dir = os.getenv("DATA_DIR", "data")
    mistral_api_key = os.getenv("MISTRAL_API_KEY", "")
    
    initialize_services(
        upload_dir=upload_dir,
        data_dir=data_dir,
        mistral_api_key=mistral_api_key
    )
    
    yield
    
    # Cleanup on shutdown (if needed)


app = FastAPI(
    title="PDF Knowledge Graph API",
    description="""
    A comprehensive API for building knowledge graphs from PDF documents.
    
    Features:
    - Bulk PDF upload and processing
    - Text extraction using Mistral AI
    - Knowledge graph construction with GraphRAG
    - Topic and embedding-based search
    - Graph and embedding visualization
    - Integration with Apple embedding-atlas
    """,
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents_router)
app.include_router(graph_router)
app.include_router(search_router)
app.include_router(embeddings_router)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "PDF Knowledge Graph API",
        "version": "1.0.0",
        "endpoints": {
            "documents": "/documents - Upload and manage PDF documents",
            "graph": "/graph - Knowledge graph operations",
            "search": "/search - Topic and embedding search",
            "embeddings": "/embeddings - Embedding visualization and atlas integration",
            "docs": "/docs - Interactive API documentation"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
