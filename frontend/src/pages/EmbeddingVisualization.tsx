import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { RefreshCw, Layers, ExternalLink } from 'lucide-react';
import { getEmbeddingVisualization, getEmbeddingStats } from '../services/api';
import type { EmbeddingPoint } from '../types';

const EmbeddingVisualization: React.FC = () => {
  const [points, setPoints] = useState<EmbeddingPoint[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vizData, statsData] = await Promise.all([
        getEmbeddingVisualization(2000),
        getEmbeddingStats()
      ]);
      // Filter to only show chunks
      const chunkPoints = vizData.points.filter((p: EmbeddingPoint) => p.type === 'chunk');
      setPoints(chunkPoints);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch embedding data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Convert points to table format for EmbeddingAtlas
  const tableData = useMemo(() => {
    if (points.length === 0) return [];

    return points.map((point, index) => ({
      id: point.id || `chunk_${index}`,
      x: point.x ?? 0,
      y: point.y ?? 0,
      text: point.text || '',
      doc_id: point.metadata?.doc_id || 'unknown',
      type: point.type || 'chunk'
    }));
  }, [points]);

  // Send data to iframe when it's ready
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'ATLAS_READY' && iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage({
          type: 'EMBEDDING_DATA',
          payload: tableData
        }, '*');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [tableData]);

  // Send data when iframe loads
  const handleIframeLoad = () => {
    if (iframeRef.current && tableData.length > 0) {
      setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage({
          type: 'EMBEDDING_DATA',
          payload: tableData
        }, '*');
      }, 1000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Chunk Embeddings</h1>
          <p className="text-gray-600">Visualize extracted document chunks using Apple Embedding Atlas</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/atlas/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <ExternalLink size={18} />
            Open Fullscreen
          </a>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Chunk Embeddings</p>
          <p className="text-2xl font-bold text-gray-800">{points.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Dimensions</p>
          <p className="text-2xl font-bold text-gray-800">{stats?.embedding_dimension || 1024}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Embeddings</p>
          <p className="text-2xl font-bold text-gray-800">{stats?.total_embeddings || 0}</p>
        </div>
      </div>

      {/* Embedding Atlas in iframe */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {points.length > 0 ? (
          <iframe
            ref={iframeRef}
            src="/atlas/"
            title="Embedding Atlas Visualization"
            onLoad={handleIframeLoad}
            style={{
              width: '100%',
              height: '800px',
              border: 'none'
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-96 text-gray-500">
            <div className="text-center">
              <Layers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No chunk embeddings found</p>
              <p className="text-sm">Upload and process PDF documents to generate embeddings</p>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">About This Visualization</h3>
        <p className="text-sm text-blue-700">
          This visualization shows extracted text chunks from your PDF documents projected into 2D space.
          Similar chunks appear closer together. Color coded by document. Use the search, filter, and
          selection tools to explore your data. Powered by{' '}
          <a
            href="https://github.com/apple/embedding-atlas"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-900"
          >
            Apple Embedding Atlas
          </a>.
        </p>
      </div>
    </div>
  );
};

export default EmbeddingVisualization;
