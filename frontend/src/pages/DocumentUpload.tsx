import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { uploadDocuments, getDocuments, getDocumentProgress } from '../services/api';
import type { DocumentInfo } from '../types';

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-5 h-5 text-gray-400" />,
  extracting: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />,
  building_graph: <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />,
  embedding: <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />,
  completed: <CheckCircle className="w-5 h-5 text-green-500" />,
  failed: <XCircle className="w-5 h-5 text-red-500" />
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  extracting: 'Extracting text...',
  building_graph: 'Building graph...',
  embedding: 'Creating embeddings...',
  completed: 'Completed',
  failed: 'Failed'
};

const DocumentUpload: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const pdfFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      alert('Please upload PDF files only');
      return;
    }

    setUploading(true);
    try {
      await uploadDocuments(pdfFiles);
      await fetchDocuments();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Upload Documents</h1>
        <p className="text-gray-600">Upload PDF documents to build your knowledge graph</p>
      </div>

      {/* Upload Area */}
      <div
        className={\`border-2 border-dashed rounded-lg p-8 text-center transition-colors \${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }\`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple
          accept=".pdf"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          {uploading ? (
            <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
          ) : (
            <Upload className="w-12 h-12 mx-auto text-gray-400" />
          )}
          <p className="mt-4 text-lg font-medium text-gray-700">
            {uploading ? 'Uploading...' : 'Drop PDF files here or click to upload'}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Support for bulk upload - drag multiple files at once
          </p>
        </label>
      </div>

      {/* Document List */}
      {documents.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">
              Uploaded Documents ({documents.length})
            </h2>
          </div>
          <div className="divide-y">
            {documents.map((doc) => (
              <div key={doc.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FileText className="w-8 h-8 text-red-500" />
                  <div>
                    <p className="font-medium text-gray-800">{doc.filename}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(doc.file_size)} • {doc.page_count || '?'} pages
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusIcons[doc.status]}
                  <span className={\`text-sm \${
                    doc.status === 'completed' ? 'text-green-600' :
                    doc.status === 'failed' ? 'text-red-600' : 'text-gray-600'
                  }\`}>
                    {statusLabels[doc.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
