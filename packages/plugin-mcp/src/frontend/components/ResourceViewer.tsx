import React, { useState } from 'react';
import type { McpServer, McpResource } from '../McpViewer';

export interface ResourceViewerProps {
  server: McpServer;
  onRead: (serverName: string, uri: string) => Promise<any>;
}

export const ResourceViewer: React.FC<ResourceViewerProps> = ({ server, onRead }) => {
  const [selectedResource, setSelectedResource] = useState<McpResource | null>(null);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResourceSelect = async (resource: McpResource) => {
    setSelectedResource(resource);
    setContent(null);
    setError(null);
    setLoading(true);
    
    try {
      const response = await onRead(server.name, resource.uri);
      if (response.success && response.data) {
        setContent(response.data.contents);
      } else {
        setError(response.error || 'Failed to read resource');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read resource');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!content) return null;
    
    // Handle different content types
    if (Array.isArray(content)) {
      return content.map((item, index) => (
        <div key={index} className="content-item">
          {item.text && (
            <div className="content-text">
              {item.mimeType?.startsWith('text/') ? (
                <pre>{item.text}</pre>
              ) : (
                <p>{item.text}</p>
              )}
            </div>
          )}
          {item.blob && (
            <div className="content-blob">
              <p>Binary content ({item.mimeType || 'unknown type'})</p>
            </div>
          )}
        </div>
      ));
    }
    
    // Fallback for unexpected content format
    return <pre>{JSON.stringify(content, null, 2)}</pre>;
  };

  const getMimeTypeIcon = (mimeType?: string) => {
    if (!mimeType) return '📄';
    
    if (mimeType.startsWith('text/')) return '📝';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('json')) return '📊';
    if (mimeType.includes('xml')) return '📋';
    if (mimeType.includes('pdf')) return '📑';
    
    return '📄';
  };

  return (
    <div className="resource-viewer">
      <div className="resource-list">
        <h3>Available Resources</h3>
        {server.resources.length === 0 ? (
          <p className="no-resources">No resources available</p>
        ) : (
          <ul>
            {server.resources.map((resource) => (
              <li
                key={resource.uri}
                className={`resource-item ${selectedResource?.uri === resource.uri ? 'selected' : ''}`}
                onClick={() => handleResourceSelect(resource)}
              >
                <div className="resource-header">
                  <span className="resource-icon">
                    {getMimeTypeIcon(resource.mimeType)}
                  </span>
                  <div className="resource-info">
                    <div className="resource-name">
                      {resource.name || resource.uri}
                    </div>
                    {resource.description && (
                      <div className="resource-description">
                        {resource.description}
                      </div>
                    )}
                    <div className="resource-meta">
                      <span className="resource-uri">{resource.uri}</span>
                      {resource.mimeType && (
                        <span className="resource-mime">{resource.mimeType}</span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {selectedResource && (
        <div className="resource-content">
          <h3>{selectedResource.name || selectedResource.uri}</h3>
          {selectedResource.description && (
            <p className="resource-description">{selectedResource.description}</p>
          )}
          
          <div className="resource-meta-details">
            <div className="meta-item">
              <strong>URI:</strong> <code>{selectedResource.uri}</code>
            </div>
            {selectedResource.mimeType && (
              <div className="meta-item">
                <strong>Type:</strong> {selectedResource.mimeType}
              </div>
            )}
          </div>
          
          {loading && (
            <div className="loading-content">
              <div className="spinner"></div>
              <p>Loading resource content...</p>
            </div>
          )}
          
          {error && (
            <div className="content-error">
              <h4>Error</h4>
              <p>{error}</p>
            </div>
          )}
          
          {content && !loading && (
            <div className="content-display">
              <h4>Content</h4>
              <div className="content-wrapper">
                {renderContent()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 