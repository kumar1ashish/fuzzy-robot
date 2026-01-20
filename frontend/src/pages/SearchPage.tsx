import React, { useState } from 'react';
import { Search, Hash, FileText, Loader2 } from 'lucide-react';
import { searchTopics, searchEmbeddings, hybridSearch } from '../services/api';
import type { Topic, SearchResult } from '../types';

type SearchMode = 'topics' | 'embeddings' | 'hybrid';

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('hybrid');
  const [loading, setLoading] = useState(false);
  const [topicResults, setTopicResults] = useState<Topic[]>([]);
  const [embeddingResults, setEmbeddingResults] = useState<SearchResult[]>([]);
  const [hybridResults, setHybridResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setTopicResults([]);
    setEmbeddingResults([]);
    setHybridResults([]);

    try {
      switch (mode) {
        case 'topics':
          const topicsRes = await searchTopics(query);
          setTopicResults(topicsRes.topics);
          break;
        case 'embeddings':
          const embeddingsRes = await searchEmbeddings(query);
          setEmbeddingResults(embeddingsRes.results);
          break;
        case 'hybrid':
          const hybridRes = await hybridSearch(query);
          setHybridResults(hybridRes.results);
          break;
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Search</h1>
        <p className="text-gray-600">Search for topics and content using semantic similarity</p>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search for topics, concepts, or content..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Search
          </button>
        </div>

        {/* Search Mode Tabs */}
        <div className="flex gap-2">
          {(['hybrid', 'topics', 'embeddings'] as SearchMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                mode === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Topic Results */}
          {mode === 'topics' && topicResults.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-800">
                  Topics ({topicResults.length})
                </h2>
              </div>
              <div className="divide-y">
                {topicResults.map((topic) => (
                  <div key={topic.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Hash className="w-5 h-5 text-orange-500" />
                        <span className="font-medium text-gray-800">{topic.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        Score: {(topic.relevance_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-2 text-gray-600 text-sm">{topic.description}</p>
                    {topic.keywords.length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {topic.keywords.slice(0, 5).map((kw, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Embedding Results */}
          {mode === 'embeddings' && embeddingResults.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-800">
                  Content Matches ({embeddingResults.length})
                </h2>
              </div>
              <div className="divide-y">
                {embeddingResults.map((result) => (
                  <div key={result.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs capitalize">
                          {result.type}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        Similarity: {(result.similarity * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-2 text-gray-600 text-sm line-clamp-3">{result.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hybrid Results */}
          {mode === 'hybrid' && hybridResults.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-800">
                  Combined Results ({hybridResults.length})
                </h2>
              </div>
              <div className="divide-y">
                {hybridResults.map((result) => (
                  <div key={result.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {result.type === 'topic' ? (
                          <Hash className="w-5 h-5 text-orange-500" />
                        ) : (
                          <FileText className="w-5 h-5 text-blue-500" />
                        )}
                        <span className="font-medium text-gray-800">{result.text}</span>
                        <span className={`px-2 py-1 rounded text-xs capitalize ${
                          result.type === 'topic' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {result.type}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        Score: {(result.combined_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    {result.description && (
                      <p className="mt-2 text-gray-600 text-sm">{result.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {query && !loading && 
           ((mode === 'topics' && topicResults.length === 0) ||
            (mode === 'embeddings' && embeddingResults.length === 0) ||
            (mode === 'hybrid' && hybridResults.length === 0)) && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="mt-4 text-gray-500">No results found for "{query}"</p>
              <p className="text-sm text-gray-400">Try different keywords or upload more documents</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
