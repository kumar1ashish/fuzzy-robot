# PDF Knowledge Graph

A comprehensive system for building knowledge graphs from PDF documents with semantic search and embedding visualization.

## Features

- **Bulk PDF Upload**: Upload multiple PDF documents at once
- **Mistral AI Extraction**: Extract structured content using Mistral AI
- **GraphRAG Knowledge Graphs**: Build knowledge graphs using Microsoft GraphRAG-inspired approach
- **Topic Detection**: Automatic topic extraction and categorization
- **Semantic Search**: Search by topics or embeddings with Mistral embeddings
- **Knowledge Graph Visualization**: Interactive D3.js graph visualization
- **Embedding Visualization**: 2D projection of embeddings with Apple embedding-atlas integration
- **Embedding Search**: Find similar content using vector similarity

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PDF Upload    │────▶│  Mistral AI     │────▶│   GraphRAG      │
│   (Bulk)        │     │  Extraction     │     │   Knowledge     │
└─────────────────┘     └─────────────────┘     │   Graph         │
                                                 └────────┬────────┘
                                                          │
                        ┌─────────────────┐               │
                        │  Mistral        │◀──────────────┘
                        │  Embeddings     │
                        └────────┬────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Topic         │     │   Embedding     │     │   Graph         │
│   Search        │     │   Search        │     │   Visualization │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  embedding-atlas│
                        │  Integration    │
                        └─────────────────┘
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Mistral API Key (optional, works with mock data without it)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env and add your MISTRAL_API_KEY

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend will be available at http://localhost:3000

## API Endpoints

### Documents
- `POST /documents/upload` - Upload PDF documents
- `GET /documents/` - List all documents
- `GET /documents/{id}` - Get document info
- `GET /documents/{id}/content` - Get extracted content
- `GET /documents/{id}/progress` - Get processing progress

### Knowledge Graph
- `GET /graph/` - Get complete knowledge graph
- `GET /graph/visualization` - Get visualization data
- `GET /graph/topics` - Get all topics
- `GET /graph/stats` - Get graph statistics

### Search
- `GET /search/topics?query=...` - Search topics
- `GET /search/embeddings?query=...` - Search embeddings
- `GET /search/hybrid?query=...` - Hybrid search

### Embeddings
- `GET /embeddings/` - Get all embedding points
- `GET /embeddings/visualization` - Get 2D visualization data
- `GET /embeddings/atlas` - Get data for embedding-atlas
- `POST /embeddings/project?query=...` - Project query to embedding space

## Integration with Apple embedding-atlas

Export your embeddings for use with [Apple's embedding-atlas](https://github.com/apple/embedding-atlas):

1. Click "Export for Atlas" in the Embeddings page
2. Download the JSON file
3. Load it into embedding-atlas for advanced visualization

## Technology Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **Mistral AI** - Text extraction and embeddings
- **NetworkX** - Graph data structure and algorithms
- **PyPDF/pdfplumber** - PDF text extraction
- **NumPy** - Numerical computations

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **D3.js** - Graph visualization
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## Configuration

Environment variables in `backend/.env`:

```
MISTRAL_API_KEY=your_api_key_here
UPLOAD_DIR=uploads
DATA_DIR=data
```

## License

MIT
