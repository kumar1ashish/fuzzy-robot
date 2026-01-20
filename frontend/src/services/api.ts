import axios from 'axios';
import type { DocumentInfo, KnowledgeGraph, Topic, EmbeddingVisualizationData, SearchResult } from '../types';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
});

// Document endpoints
export const uploadDocuments = async (files: File[]): Promise<{ documents: DocumentInfo[] }> => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  const response = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const getDocuments = async (): Promise<DocumentInfo[]> => {
  const response = await api.get('/documents/');
  return response.data;
};

export const getDocumentProgress = async (docId: string) => {
  const response = await api.get(\`/documents/\${docId}/progress\`);
  return response.data;
};

// Graph endpoints
export const getKnowledgeGraph = async (): Promise<KnowledgeGraph> => {
  const response = await api.get('/graph/');
  return response.data;
};

export const getGraphVisualization = async () => {
  const response = await api.get('/graph/visualization');
  return response.data;
};

export const getTopics = async (): Promise<Topic[]> => {
  const response = await api.get('/graph/topics');
  return response.data;
};

export const getGraphStats = async () => {
  const response = await api.get('/graph/stats');
  return response.data;
};

// Search endpoints
export const searchTopics = async (query: string, topK: number = 10): Promise<{ topics: Topic[] }> => {
  const response = await api.get('/search/topics', { params: { query, top_k: topK } });
  return response.data;
};

export const searchEmbeddings = async (query: string, topK: number = 20): Promise<{ results: SearchResult[] }> => {
  const response = await api.get('/search/embeddings', { params: { query, top_k: topK } });
  return response.data;
};

export const hybridSearch = async (query: string, topK: number = 10) => {
  const response = await api.get('/search/hybrid', { params: { query, top_k: topK } });
  return response.data;
};

// Embedding endpoints
export const getEmbeddingVisualization = async (maxPoints: number = 1000): Promise<EmbeddingVisualizationData> => {
  const response = await api.get('/embeddings/visualization', { params: { max_points: maxPoints } });
  return response.data;
};

export const getAtlasData = async () => {
  const response = await api.get('/embeddings/atlas');
  return response.data;
};

export const getAtlasConfig = async () => {
  const response = await api.get('/embeddings/atlas/config');
  return response.data;
};

export const getEmbeddingStats = async () => {
  const response = await api.get('/embeddings/stats');
  return response.data;
};

export const projectQuery = async (query: string) => {
  const response = await api.post('/embeddings/project', null, { params: { query } });
  return response.data;
};

export default api;
