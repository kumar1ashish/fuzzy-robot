import React, { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCw, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { getGraphVisualization, getGraphStats } from '../services/api';
import * as d3 from 'd3';

interface Node {
  id: string;
  label: string;
  type: string;
  color: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Edge {
  source: string | Node;
  target: string | Node;
  label: string;
  weight: number;
}

const GraphVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const [vizData, statsData] = await Promise.all([
        getGraphVisualization(),
        getGraphStats()
      ]);
      setGraphData(vizData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch graph:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    if (!graphData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const g = svg.append('g');

    // Create simulation
    const simulation = d3.forceSimulation<Node>(graphData.nodes)
      .force('link', d3.forceLink<Node, Edge>(graphData.edges)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.edges)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.weight));

    // Create link labels
    const linkLabel = g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(graphData.edges)
      .join('text')
      .attr('font-size', 10)
      .attr('fill', '#666')
      .text(d => d.label);

    // Create nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(graphData.nodes)
      .join('g')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    node.append('circle')
      .attr('r', d => d.type === 'document' ? 15 : 10)
      .attr('fill', d => d.color || '#666')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('click', (event, d) => setSelectedNode(d));

    node.append('text')
      .attr('dx', 15)
      .attr('dy', 4)
      .attr('font-size', 12)
      .attr('fill', '#333')
      .text(d => d.label.length > 20 ? d.label.substring(0, 20) + '...' : d.label);

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      linkLabel
        .attr('x', d => ((d.source as Node).x! + (d.target as Node).x!) / 2)
        .attr('y', d => ((d.source as Node).y! + (d.target as Node).y!) / 2);

      node.attr('transform', d => `translate(\${d.x},\${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData]);

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
          <h1 className="text-2xl font-bold text-gray-800">Knowledge Graph</h1>
          <p className="text-gray-600">Interactive visualization of document relationships</p>
        </div>
        <button
          onClick={fetchGraph}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Nodes</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total_nodes}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Edges</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total_edges}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Topics</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total_topics}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Communities</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total_communities}</p>
          </div>
        </div>
      )}

      {/* Graph Container */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-sm text-gray-600">Document</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span className="text-sm text-gray-600">Topic</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span className="text-sm text-gray-600">Entity</span>
            </div>
          </div>
        </div>
        <div className="graph-container">
          <svg ref={svgRef} width="100%" height="100%"></svg>
        </div>
      </div>

      {/* Selected Node Info */}
      {selectedNode && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800">Selected: {selectedNode.label}</h3>
          <p className="text-sm text-gray-600">Type: {selectedNode.type}</p>
          <p className="text-sm text-gray-600">ID: {selectedNode.id}</p>
        </div>
      )}
    </div>
  );
};

export default GraphVisualization;
