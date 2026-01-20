"""Document upload and management endpoints."""
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from typing import List
import asyncio

from ..models.schemas import (
    DocumentInfo, DocumentUploadResponse, ExtractedContent,
    ProcessingStatus, ProcessingProgress
)
from ..dependencies import get_services

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_documents(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None
):
    """Upload multiple PDF documents for processing."""
    services = get_services()
    pdf_service = services["pdf"]
    
    uploaded_docs = []
    
    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail=f"File {file.filename} is not a PDF"
            )
        
        content = await file.read()
        doc_info = await pdf_service.save_uploaded_file(content, file.filename)
        uploaded_docs.append(doc_info)
        
        # Queue processing in background
        if background_tasks:
            background_tasks.add_task(process_document_pipeline, doc_info.id)

    return DocumentUploadResponse(
        documents=uploaded_docs,
        total_uploaded=len(uploaded_docs),
        message=f"Successfully uploaded {len(uploaded_docs)} documents"
    )


async def process_document_pipeline(doc_id: str):
    """Full document processing pipeline."""
    services = get_services()
    pdf_service = services["pdf"]
    mistral_service = services["mistral"]
    graphrag_service = services["graphrag"]
    embedding_service = services["embedding"]

    try:
        # Extract text
        doc = pdf_service.get_document(doc_id)
        if not doc:
            return
            
        extracted = await pdf_service.process_document(doc_id)
        
        # Extract structured content with Mistral
        doc.status = ProcessingStatus.BUILDING_GRAPH
        structured = await mistral_service.extract_structured_content(extracted.text)
        
        # Build knowledge graph
        await graphrag_service.build_graph_from_extraction(
            doc_id, extracted, structured
        )
        
        # Generate embeddings
        doc.status = ProcessingStatus.EMBEDDING
        
        # Chunk the text
        chunks = chunk_text(extracted.text)
        
        # Get embeddings for chunks
        items = [{"text": chunk, "type": "chunk", "metadata": {"doc_id": doc_id}} for chunk in chunks]
        embeddings = await mistral_service.get_embeddings(chunks)
        await embedding_service.store_embeddings_batch(items, embeddings)
        
        # Embed topics
        for topic in graphrag_service.get_topics():
            if topic.document_ids and doc_id in topic.document_ids:
                topic_embedding = await mistral_service.get_embedding(
                    f"{topic.name}: {topic.description}"
                )
                topic.embedding = topic_embedding
                
                # Also store in embedding service
                await embedding_service.store_embedding(
                    text=f"{topic.name}: {topic.description}",
                    embedding=topic_embedding,
                    point_type="topic",
                    metadata={"topic_id": topic.id, "doc_id": doc_id}
                )

        doc.status = ProcessingStatus.COMPLETED

    except Exception as e:
        doc = pdf_service.get_document(doc_id)
        if doc:
            doc.status = ProcessingStatus.FAILED
            doc.error_message = str(e)


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk)
        start = end - overlap
        if start >= len(text):
            break
    return chunks if chunks else [text]


@router.get("/", response_model=List[DocumentInfo])
async def list_documents():
    """List all uploaded documents."""
    services = get_services()
    return services["pdf"].get_all_documents()


@router.get("/{doc_id}", response_model=DocumentInfo)
async def get_document(doc_id: str):
    """Get a specific document by ID."""
    services = get_services()
    doc = services["pdf"].get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/{doc_id}/content", response_model=ExtractedContent)
async def get_document_content(doc_id: str):
    """Get extracted content for a document."""
    services = get_services()
    content = services["pdf"].get_extracted_content(doc_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return content


@router.post("/{doc_id}/process")
async def process_document(doc_id: str, background_tasks: BackgroundTasks):
    """Manually trigger processing for a document."""
    services = get_services()
    doc = services["pdf"].get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    background_tasks.add_task(process_document_pipeline, doc_id)
    return {"message": f"Processing started for document {doc_id}"}


@router.get("/{doc_id}/progress", response_model=ProcessingProgress)
async def get_processing_progress(doc_id: str):
    """Get processing progress for a document."""
    services = get_services()
    doc = services["pdf"].get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    progress_map = {
        ProcessingStatus.PENDING: 0.0,
        ProcessingStatus.EXTRACTING: 0.25,
        ProcessingStatus.BUILDING_GRAPH: 0.5,
        ProcessingStatus.EMBEDDING: 0.75,
        ProcessingStatus.COMPLETED: 1.0,
        ProcessingStatus.FAILED: 0.0
    }
    
    step_names = {
        ProcessingStatus.PENDING: "Waiting to start",
        ProcessingStatus.EXTRACTING: "Extracting text from PDF",
        ProcessingStatus.BUILDING_GRAPH: "Building knowledge graph",
        ProcessingStatus.EMBEDDING: "Generating embeddings",
        ProcessingStatus.COMPLETED: "Processing complete",
        ProcessingStatus.FAILED: "Processing failed"
    }
    
    return ProcessingProgress(
        document_id=doc_id,
        status=doc.status,
        progress=progress_map.get(doc.status, 0.0),
        current_step=step_names.get(doc.status, "Unknown"),
        message=doc.error_message or ""
    )
