"""GraphRAG service for knowledge graph creation."""
import os
import uuid
import asyncio
from typing import List, Dict, Any, Optional
import networkx as nx
from datetime import datetime

from ..models.schemas import (
    GraphNode, GraphEdge, KnowledgeGraph, Topic, 
    ExtractedContent, ProcessingStatus
)


class GraphRAGService:
    """Service for building knowledge graphs using GraphRAG-inspired approach."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.graph = nx.DiGraph()
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: List[GraphEdge] = []
        self.topics: Dict[str, Topic] = {}
        self.communities: Dict[str, List[str]] = {}
        os.makedirs(data_dir, exist_ok=True)

    def _chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks."""
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start = end - overlap
            if start < 0:
                break
        return chunks

    async def build_graph_from_extraction(
        self,
        doc_id: str,
        extracted_content: ExtractedContent,
        structured_data: Dict[str, Any]
    ) -> KnowledgeGraph:
        """Build knowledge graph from extracted content and structured data."""
        
        # Create document node
        doc_node = GraphNode(
            id=f"doc_{doc_id}",
            label=extracted_content.metadata.get("filename", "Document"),
            type="document",
            properties={
                "page_count": extracted_content.metadata.get("page_count", 0),
                "text_length": len(extracted_content.text)
            }
        )
        self._add_node(doc_node)

        # Add entity nodes
        for entity in structured_data.get("entities", []):
            entity_id = f"entity_{uuid.uuid4().hex[:8]}"
            entity_node = GraphNode(
                id=entity_id,
                label=entity.get("name", "Unknown"),
                type=entity.get("type", "entity"),
                properties={"source_doc": doc_id}
            )
            self._add_node(entity_node)
            
            # Link entity to document
            self._add_edge(GraphEdge(
                source=doc_node.id,
                target=entity_id,
                label="contains",
                properties={"type": "containment"}
            ))

        # Add topic nodes
        for topic_name in structured_data.get("topics", []):
            topic_id = f"topic_{uuid.uuid4().hex[:8]}"
            topic_node = GraphNode(
                id=topic_id,
                label=topic_name,
                type="topic",
                properties={"source_doc": doc_id}
            )
            self._add_node(topic_node)
            
            # Create Topic object
            topic = Topic(
                id=topic_id,
                name=topic_name,
                description=f"Topic: {topic_name}",
                keywords=structured_data.get("keywords", []),
                document_ids=[doc_id]
            )
            self.topics[topic_id] = topic
            
            # Link topic to document
            self._add_edge(GraphEdge(
                source=doc_node.id,
                target=topic_id,
                label="discusses",
                properties={"type": "topic_relation"}
            ))

        # Add relationship edges
        for rel in structured_data.get("relationships", []):
            source_id = self._find_node_by_label(rel.get("source", ""))
            target_id = self._find_node_by_label(rel.get("target", ""))
            
            if source_id and target_id:
                self._add_edge(GraphEdge(
                    source=source_id,
                    target=target_id,
                    label=rel.get("relation", "related_to"),
                    properties={"source_doc": doc_id}
                ))

        # Detect communities
        await self._detect_communities()

        return self.get_knowledge_graph()

    def _add_node(self, node: GraphNode):
        """Add a node to the graph."""
        self.nodes[node.id] = node
        self.graph.add_node(node.id, **node.model_dump())

    def _add_edge(self, edge: GraphEdge):
        """Add an edge to the graph."""
        self.edges.append(edge)
        self.graph.add_edge(
            edge.source, 
            edge.target, 
            label=edge.label,
            weight=edge.weight,
            **edge.properties
        )

    def _find_node_by_label(self, label: str) -> Optional[str]:
        """Find a node ID by its label."""
        for node_id, node in self.nodes.items():
            if node.label.lower() == label.lower():
                return node_id
        return None

    async def _detect_communities(self):
        """Detect communities in the graph using Louvain algorithm."""
        try:
            from networkx.algorithms import community
            
            # Convert to undirected for community detection
            undirected = self.graph.to_undirected()
            
            if len(undirected.nodes()) > 0:
                communities = community.louvain_communities(undirected)
                
                for i, comm in enumerate(communities):
                    self.communities[f"community_{i}"] = list(comm)
        except Exception:
            # Community detection failed, continue without it
            pass

    def get_knowledge_graph(self) -> KnowledgeGraph:
        """Get the current knowledge graph."""
        return KnowledgeGraph(
            nodes=list(self.nodes.values()),
            edges=self.edges,
            metadata={
                "node_count": len(self.nodes),
                "edge_count": len(self.edges),
                "community_count": len(self.communities),
                "updated_at": datetime.utcnow().isoformat()
            }
        )

    def get_topics(self) -> List[Topic]:
        """Get all topics."""
        return list(self.topics.values())

    def get_topic_by_id(self, topic_id: str) -> Optional[Topic]:
        """Get a topic by ID."""
        return self.topics.get(topic_id)

    def get_nodes_by_type(self, node_type: str) -> List[GraphNode]:
        """Get all nodes of a specific type."""
        return [n for n in self.nodes.values() if n.type == node_type]

    def get_graph_for_visualization(self) -> Dict[str, Any]:
        """Get graph data formatted for visualization."""
        nodes = []
        for node in self.nodes.values():
            node_data = {
                "id": node.id,
                "label": node.label,
                "type": node.type,
                "properties": node.properties
            }
            # Assign colors based on type
            type_colors = {
                "document": "#4CAF50",
                "topic": "#2196F3",
                "entity": "#FF9800",
                "concept": "#9C27B0"
            }
            node_data["color"] = type_colors.get(node.type, "#757575")
            nodes.append(node_data)

        edges = []
        for edge in self.edges:
            edges.append({
                "source": edge.source,
                "target": edge.target,
                "label": edge.label,
                "weight": edge.weight
            })

        return {
            "nodes": nodes,
            "edges": edges,
            "communities": self.communities
        }

    def merge_graphs(self, other_graph: KnowledgeGraph):
        """Merge another knowledge graph into this one."""
        for node in other_graph.nodes:
            if node.id not in self.nodes:
                self._add_node(node)

        for edge in other_graph.edges:
            # Check if edge already exists
            exists = any(
                e.source == edge.source and e.target == edge.target and e.label == edge.label
                for e in self.edges
            )
            if not exists:
                self._add_edge(edge)

    def export_to_graphml(self, filepath: str):
        """Export graph to GraphML format."""
        nx.write_graphml(self.graph, filepath)

    def export_to_gexf(self, filepath: str):
        """Export graph to GEXF format (for Gephi)."""
        nx.write_gexf(self.graph, filepath)
