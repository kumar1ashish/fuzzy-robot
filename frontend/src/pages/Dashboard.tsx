import React, { useEffect, useState } from 'react';
import { FileText, Network, Hash, Layers } from 'lucide-react';
import { getDocuments, getGraphStats, getEmbeddingStats } from '../services/api';

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, label, value, color }) => (
  <div className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
    <div className={`p-3 rounded-full ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    documents: 0,
    nodes: 0,
    topics: 0,
    embeddings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [docs, graphStats, embeddingStats] = await Promise.all([
          getDocuments(),
          getGraphStats().catch(() => ({ total_nodes: 0, total_topics: 0 })),
          getEmbeddingStats().catch(() => ({ total_embeddings: 0 }))
        ]);
        
        setStats({
          documents: docs.length,
          nodes: graphStats.total_nodes || 0,
          topics: graphStats.total_topics || 0,
          embeddings: embeddingStats.total_embeddings || 0
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600">Overview of your PDF knowledge graph</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          icon={<FileText className="w-6 h-6 text-white" />}
          label="Documents"
          value={stats.documents}
          color="bg-blue-500"
        />
        <StatsCard
          icon={<Network className="w-6 h-6 text-white" />}
          label="Graph Nodes"
          value={stats.nodes}
          color="bg-green-500"
        />
        <StatsCard
          icon={<Hash className="w-6 h-6 text-white" />}
          label="Topics"
          value={stats.topics}
          color="bg-orange-500"
        />
        <StatsCard
          icon={<Layers className="w-6 h-6 text-white" />}
          label="Embeddings"
          value={stats.embeddings}
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Getting Started</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Upload PDF documents in the Upload section</li>
            <li>Wait for processing (text extraction, graph building, embeddings)</li>
            <li>Explore the knowledge graph in the Graph section</li>
            <li>Search for topics and content in the Search section</li>
            <li>Visualize embeddings in the Embeddings section</li>
          </ol>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Features</h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Bulk PDF upload and processing
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Knowledge graph extraction with Mistral AI
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              Topic detection and semantic search
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Embedding visualization with embedding-atlas
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
