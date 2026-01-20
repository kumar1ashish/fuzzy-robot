"""PDF processing service."""
import os
import uuid
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import aiofiles
import pdfplumber
from pypdf import PdfReader

from ..models.schemas import DocumentInfo, ProcessingStatus, ExtractedContent


class PDFService:
    """Service for handling PDF uploads and extraction."""

    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = upload_dir
        self.documents: Dict[str, DocumentInfo] = {}
        self.extracted_content: Dict[str, ExtractedContent] = {}
        os.makedirs(upload_dir, exist_ok=True)

    async def save_uploaded_file(self, file_content: bytes, filename: str) -> DocumentInfo:
        """Save an uploaded PDF file."""
        doc_id = str(uuid.uuid4())
        safe_filename = f"{doc_id}_{filename}"
        file_path = os.path.join(self.upload_dir, safe_filename)

        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)

        # Get page count
        page_count = self._get_page_count(file_path)

        doc_info = DocumentInfo(
            id=doc_id,
            filename=filename,
            file_size=len(file_content),
            upload_time=datetime.utcnow(),
            status=ProcessingStatus.PENDING,
            page_count=page_count
        )

        self.documents[doc_id] = doc_info
        return doc_info

    def _get_page_count(self, file_path: str) -> int:
        """Get the number of pages in a PDF."""
        try:
            reader = PdfReader(file_path)
            return len(reader.pages)
        except Exception:
            return 0

    def get_file_path(self, doc_id: str) -> Optional[str]:
        """Get the file path for a document."""
        if doc_id not in self.documents:
            return None

        doc = self.documents[doc_id]
        safe_filename = f"{doc_id}_{doc.filename}"
        return os.path.join(self.upload_dir, safe_filename)

    def extract_text_from_pdf(self, file_path: str) -> tuple[str, List[str]]:
        """Extract text from a PDF file using pdfplumber."""
        full_text = ""
        page_texts = []

        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    page_texts.append(page_text)
                    full_text += page_text + "\n\n"
        except Exception as e:
            raise Exception(f"Failed to extract text from PDF: {str(e)}")

        return full_text.strip(), page_texts

    async def process_document(self, doc_id: str) -> ExtractedContent:
        """Process a document and extract its content."""
        if doc_id not in self.documents:
            raise ValueError(f"Document {doc_id} not found")

        doc = self.documents[doc_id]
        file_path = self.get_file_path(doc_id)

        if not file_path or not os.path.exists(file_path):
            raise ValueError(f"File not found for document {doc_id}")

        # Update status
        doc.status = ProcessingStatus.EXTRACTING

        try:
            # Extract text in a thread pool to not block
            loop = asyncio.get_event_loop()
            full_text, page_texts = await loop.run_in_executor(
                None, self.extract_text_from_pdf, file_path
            )

            extracted = ExtractedContent(
                document_id=doc_id,
                text=full_text,
                page_texts=page_texts,
                metadata={
                    "filename": doc.filename,
                    "page_count": doc.page_count,
                    "extracted_at": datetime.utcnow().isoformat()
                }
            )

            self.extracted_content[doc_id] = extracted
            return extracted

        except Exception as e:
            doc.status = ProcessingStatus.FAILED
            doc.error_message = str(e)
            raise

    def get_document(self, doc_id: str) -> Optional[DocumentInfo]:
        """Get document info by ID."""
        return self.documents.get(doc_id)

    def get_all_documents(self) -> List[DocumentInfo]:
        """Get all documents."""
        return list(self.documents.values())

    def get_extracted_content(self, doc_id: str) -> Optional[ExtractedContent]:
        """Get extracted content for a document."""
        return self.extracted_content.get(doc_id)

    def get_all_extracted_content(self) -> List[ExtractedContent]:
        """Get all extracted content."""
        return list(self.extracted_content.values())
