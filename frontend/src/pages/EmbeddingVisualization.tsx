import React, { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCw, Download, Search, Layers } from 'lucide-react';
import { getEmbeddingVisualization, getAtlasConfig, projectQuery, getEmbeddingStats } from '../services/api';
import * as d3 from 'd3';
import type { EmbeddingPoint, EmbeddingVisualizationData } from '../types';

const EmbeddingVisualization: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<EmbeddingVisualizationData | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<EmbeddingPoint | null>(null);
  const [query, setQuery] = useState('');
  const [queryPoint, setQueryPoint] = useState<{ x: number; y: number } | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vizData, configData, statsData] = await Promise.all([
        getEmbeddingVisualization(1000),
        getAtlasConfig(),
        getEmbeddingStats()
      ]);
      setData(vizData);
      setConfig(configData);
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

  // Canvas rendering
  useEffect(() => {
    if (!data || !canvasRef.current || !config) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    // Clear canvas
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, width, height);

    // Filter points
    let points = data.points;
    if (typeFilter) {
      points = points.filter(p => p.type === typeFilter);
    }

    if (points.length === 0) return;

    // Calculate scales
    const xExtent = d3.extent(points, d => d.x) as [number, number];
    const yExtent = d3.extent(points, d => d.y) as [number, number];

    const xScale = d3.scaleLinear()
      .domain(xExtent)
      .range([padding, width - padding]);

    const yScale = d3.scaleLinear()
      .domain(yExtent)
      .range([height - padding, padding]);

    // Apply transform
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    // Draw points
    points.forEach(point => {
      if (point.x === undefined || point.y === undefined) return;

      const x = xScale(point.x);
      const y = yScale(point.y);
      const color = config.colors[point.type] || '#666';
      const radius = config.settings.point_size || 5;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.globalAlpha = config.settings.opacity || 0.8;
      ctx.fill();

      // Highlight selected point
      if (selectedPoint && selectedPoint.id === point.id) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Draw query point if exists
    if (queryPoint) {
      const qx = xScale(queryPoint.x);
      const qy = yScale(queryPoint.y);

      ctx.beginPath();
      ctx.arc(qx, qy, 10, 0, 2 * Math.PI);
      ctx.fillStyle = '#F44336';
      ctx.globalAlpha = 1;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw label
      ctx.fillStyle = '#F44336';
      ctx.font = '12px sans-serif';
      ctx.fillText('Query', qx + 15, qy + 4);
    }

    ctx.restore();

    // Draw legend
    const types = Object.keys(config.colors);
    ctx.globalAlpha = 1;
    types.forEach((type, i) => {
      const x = 20;
      const y = 30 + i * 25;

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = config.colors[type];
      ctx.fill();

      ctx.fillStyle = '#333';
      ctx.font = '12px sans-serif';
      ctx.fillText(type, x + 15, y + 4);
    });

  }, [data, config, selectedPoint, queryPoint, typeFilter, transform]);

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!data || !canvasRef.current || !config) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    let points = data.points;
    if (typeFilter) {
      points = points.filter(p => p.type === typeFilter);
    }

    const xExtent = d3.extent(points, d => d.x) as [number, number];
    const yExtent = d3.extent(points, d => d.y) as [number, number];

    const xScale = d3.scaleLinear()
      .domain(xExtent)
      .range([padding, width - padding]);

    const yScale = d3.scaleLinear()
      .domain(yExtent)
      .range([height - padding, padding]);

    // Find nearest point
    let nearest: EmbeddingPoint | null = null;
    let minDist = Infinity;

    points.forEach(point => {
      if (point.x === undefined || point.y === undefined) return;

      const px = xScale(point.x);
      const py = yScale(point.y);
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

      if (dist < minDist && dist < 20) {
        minDist = dist;
        nearest = point;
      }
    });

    setSelectedPoint(nearest);
  };

  const handleProjectQuery = async () => {
    if (!query.trim()) return;

    try {
      const result = await projectQuery(query);
      setQueryPoint({ x: result.x, y: result.y });
    } catch (error) {
      console.error('Failed to project query:', error);
    }
  };

  const handleDownloadAtlasData = async () => {
    try {
      const response = await fetch('/api/embeddings/atlas');
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'embeddings-atlas.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download atlas data:', error);
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
          <h1 className="text-2xl font-bold text-gray-800">Embedding Visualization</h1>
          <p className="text-gray-600">Explore document embeddings in 2D space (embedding-atlas compatible)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadAtlasData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Download size={18} />
            Export for Atlas
          </button>
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
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Embeddings</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total_embeddings}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Dimensions</p>
            <p className="text-2xl font-bold text-gray-800">{stats.embedding_dimension}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Types</p>
            <p className="text-2xl font-bold text-gray-800">{stats.types?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Query Projection */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Project Query</h3>
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter a query to project onto the embedding space..."
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleProjectQuery}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Search size={18} />
            Project
          </button>
        </div>
      </div>

      {/* Filter */}
      {config?.types && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Filter by type:</span>
          <button
            onClick={() => setTypeFilter(null)}
            className={\`px-3 py-1 rounded text-sm \${
              typeFilter === null ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }\`}
          >
            All
          </button>
          {config.types.map((type: string) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={\`px-3 py-1 rounded text-sm capitalize \${
                typeFilter === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }\`}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div className="bg-white rounded-lg shadow p-4">
        <canvas
          ref={canvasRef}
          width={1000}
          height={600}
          onClick={handleCanvasClick}
          className="w-full h-auto cursor-crosshair border rounded-lg"
        />
      </div>

      {/* Selected Point Info */}
      {selectedPoint && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Selected Point
          </h3>
          <div className="mt-2 space-y-2">
            <p className="text-sm"><span className="text-gray-500">Type:</span> {selectedPoint.type}</p>
            <p className="text-sm"><span className="text-gray-500">Text:</span> {selectedPoint.text}</p>
            <p className="text-sm"><span className="text-gray-500">Position:</span> ({selectedPoint.x?.toFixed(3)}, {selectedPoint.y?.toFixed(3)})</p>
          </div>
        </div>
      )}

      {/* Atlas Integration Info */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Apple Embedding Atlas Integration</h3>
        <p className="text-sm text-blue-700">
          Export your embeddings in a format compatible with Apple's embedding-atlas tool for advanced visualization.
          Click "Export for Atlas" to download the data, then load it into embedding-atlas for interactive exploration.
        </p>
        <a
          href="https://github.com/apple/embedding-atlas"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline mt-2 inline-block"
        >
          Learn more about embedding-atlas →
        </a>
      </div>
    </div>
  );
};

export default EmbeddingVisualization;
