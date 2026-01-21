import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { RefreshCw, Search, Layers } from 'lucide-react';
import { EmbeddingView } from 'embedding-atlas/react';
import { getEmbeddingVisualization, projectQuery, getEmbeddingStats } from '../services/api';
import type { EmbeddingPoint } from '../types';

const EmbeddingVisualization: React.FC = () => {
  const [points, setPoints] = useState<EmbeddingPoint[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<number | null>(null);
  const [selection, setSelection] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [queryProjection, setQueryProjection] = useState<{ x: number; y: number } | null>(null);

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

  // Convert points to Float32Arrays for embedding-atlas
  const atlasData = useMemo(() => {
    if (points.length === 0) {
      return { x: new Float32Array(0), y: new Float32Array(0) };
    }

    const x = new Float32Array(points.length);
    const y = new Float32Array(points.length);

    points.forEach((point, i) => {
      x[i] = point.x ?? 0;
      y[i] = point.y ?? 0;
    });

    return { x, y };
  }, [points]);

  const handleProjectQuery = async () => {
    if (!query.trim()) return;

    try {
      const result = await projectQuery(query);
      setQueryProjection({ x: result.x, y: result.y });
    } catch (error) {
      console.error('Failed to project query:', error);
    }
  };

  const selectedPoint = selection !== null ? points[selection] : null;
  const hoveredPoint = tooltip !== null ? points[tooltip] : null;

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
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
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

      {/* Query Projection */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Search in Embedding Space</h3>
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleProjectQuery()}
            placeholder="Enter a query to find similar chunks..."
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleProjectQuery}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Search size={18} />
            Search
          </button>
        </div>
        {queryProjection && (
          <p className="mt-2 text-sm text-gray-500">
            Query projected to: ({queryProjection.x.toFixed(3)}, {queryProjection.y.toFixed(3)})
          </p>
        )}
      </div>

      {/* Embedding Atlas Visualization */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-800">Embedding Space (Apple Embedding Atlas)</h3>
          <p className="text-sm text-gray-500">Click on points to select, hover to preview</p>
        </div>
        {points.length > 0 ? (
          <div style={{ height: '600px', width: '100%' }}>
            <EmbeddingView
              x={atlasData.x}
              y={atlasData.y}
              width={1000}
              height={600}
              tooltip={tooltip}
              onTooltip={setTooltip}
              selection={selection}
              onSelection={setSelection}
              theme="light"
              colorScheme="categorical"
            />
          </div>
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

      {/* Hovered Point Info */}
      {hoveredPoint && (
        <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
          <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Hovering
          </h3>
          <p className="mt-2 text-sm text-yellow-900 line-clamp-3">{hoveredPoint.text}</p>
        </div>
      )}

      {/* Selected Point Info */}
      {selectedPoint && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Selected Chunk
          </h3>
          <div className="mt-2 space-y-2">
            <p className="text-sm">
              <span className="text-gray-500">Position:</span> ({selectedPoint.x?.toFixed(3)}, {selectedPoint.y?.toFixed(3)})
            </p>
            <p className="text-sm">
              <span className="text-gray-500">Document:</span> {selectedPoint.metadata?.doc_id || 'Unknown'}
            </p>
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Content:</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedPoint.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">About This Visualization</h3>
        <p className="text-sm text-blue-700">
          This visualization shows extracted text chunks from your PDF documents projected into 2D space
          using PCA. Similar chunks appear closer together. Powered by{' '}
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
