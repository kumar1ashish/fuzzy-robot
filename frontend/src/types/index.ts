export interface DocumentInfo {
  id: string;
  filename: string;
  file_size: number;
  upload_time: string;
  status: 'pending' | 'extracting' | 'building_graph' | 'embedding' | 'completed' | 'failed';
  page_count: number | null;
  error_message: string | null;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
  color?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  weight: number;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: Record<string, any>;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  document_ids: string[];
  relevance_score: number;
}

export interface EmbeddingPoint {
  id: string;
  text: string;
  type: string;
  embedding: number[];
  metadata: Record<string, any>;
  x?: number;
  y?: number;
}

export interface SearchResult {
  id: string;
  text: string;
  type: string;
  similarity: number;
  metadata: Record<string, any>;
}

export interface EmbeddingVisualizationData {
  points: EmbeddingPoint[];
  labels: string[];
  clusters: Record<string, string[]> | null;
}
