import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Upload, Network, Search, Layers, Home } from 'lucide-react';
import DocumentUpload from './pages/DocumentUpload';
import GraphVisualization from './pages/GraphVisualization';
import SearchPage from './pages/SearchPage';
import EmbeddingVisualization from './pages/EmbeddingVisualization';
import Dashboard from './pages/Dashboard';

const NavLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={\`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors \${
        isActive 
          ? 'bg-blue-600 text-white' 
          : 'text-gray-600 hover:bg-gray-100'
      }\`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
};

const Navigation: React.FC = () => {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Network className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-800">PDF Knowledge Graph</span>
          </div>
          <div className="flex items-center gap-2">
            <NavLink to="/" icon={<Home size={18} />} label="Dashboard" />
            <NavLink to="/upload" icon={<Upload size={18} />} label="Upload" />
            <NavLink to="/graph" icon={<Network size={18} />} label="Graph" />
            <NavLink to="/search" icon={<Search size={18} />} label="Search" />
            <NavLink to="/embeddings" icon={<Layers size={18} />} label="Embeddings" />
          </div>
        </div>
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<DocumentUpload />} />
            <Route path="/graph" element={<GraphVisualization />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/embeddings" element={<EmbeddingVisualization />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
