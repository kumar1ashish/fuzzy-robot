"""Knowledge graph endpoints."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import List, Optional

from ..models.schemas import KnowledgeGraph, GraphNode, Topic, GraphVisualizationData
from ..dependencies import get_services

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/", response_model=KnowledgeGraph)
async def get_knowledge_graph():
    """Get the complete knowledge graph."""
    services = get_services()
    return services["graphrag"].get_knowledge_graph()


@router.get("/visualization")
async def get_graph_visualization():
    """Get graph data formatted for visualization."""
    services = get_services()
    return services["graphrag"].get_graph_for_visualization()


@router.get("/nodes", response_model=List[GraphNode])
async def get_nodes(node_type: Optional[str] = None):
    """Get graph nodes, optionally filtered by type."""
    services = get_services()
    graphrag = services["graphrag"]
    
    if node_type:
        return graphrag.get_nodes_by_type(node_type)
    return list(graphrag.nodes.values())


@router.get("/nodes/{node_id}", response_model=GraphNode)
async def get_node(node_id: str):
    """Get a specific node by ID."""
    services = get_services()
    node = services["graphrag"].nodes.get(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


@router.get("/topics", response_model=List[Topic])
async def get_topics():
    """Get all topics from the knowledge graph."""
    services = get_services()
    return services["graphrag"].get_topics()


@router.get("/topics/{topic_id}", response_model=Topic)
async def get_topic(topic_id: str):
    """Get a specific topic by ID."""
    services = get_services()
    topic = services["graphrag"].get_topic_by_id(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@router.get("/topics/{topic_id}/related", response_model=List[Topic])
async def get_related_topics(topic_id: str, top_k: int = 5):
    """Get topics related to a specific topic."""
    services = get_services()
    return await services["search"].get_related_topics(topic_id, top_k)


@router.get("/communities")
async def get_communities():
    """Get detected communities in the graph."""
    services = get_services()
    return services["graphrag"].communities


@router.get("/export/graphml")
async def export_graphml():
    """Export graph to GraphML format."""
    services = get_services()
    import tempfile
    import os
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.graphml') as f:
        filepath = f.name
    
    services["graphrag"].export_to_graphml(filepath)
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    os.unlink(filepath)
    
    return JSONResponse(
        content={"graphml": content},
        media_type="application/json"
    )


@router.get("/export/gexf")
async def export_gexf():
    """Export graph to GEXF format (for Gephi)."""
    services = get_services()
    import tempfile
    import os
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.gexf') as f:
        filepath = f.name
    
    services["graphrag"].export_to_gexf(filepath)
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    os.unlink(filepath)
    
    return JSONResponse(
        content={"gexf": content},
        media_type="application/json"
    )


@router.get("/stats")
async def get_graph_stats():
    """Get statistics about the knowledge graph."""
    services = get_services()
    graphrag = services["graphrag"]
    graph = graphrag.get_knowledge_graph()
    
    # Count by type
    type_counts = {}
    for node in graph.nodes:
        type_counts[node.type] = type_counts.get(node.type, 0) + 1
    
    return {
        "total_nodes": len(graph.nodes),
        "total_edges": len(graph.edges),
        "total_topics": len(graphrag.topics),
        "total_communities": len(graphrag.communities),
        "nodes_by_type": type_counts,
        "metadata": graph.metadata
    }
