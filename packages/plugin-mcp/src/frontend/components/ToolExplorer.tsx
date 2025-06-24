import React, { useState } from 'react';
import type { McpServer, McpTool } from '../McpViewer';

export interface ToolExplorerProps {
  server: McpServer;
  onExecute: (serverName: string, toolName: string, args: any) => Promise<any>;
}

export const ToolExplorer: React.FC<ToolExplorerProps> = ({ server, onExecute }) => {
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [toolArgs, setToolArgs] = useState<Record<string, any>>({});
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToolSelect = (tool: McpTool) => {
    setSelectedTool(tool);
    setToolArgs({});
    setResult(null);
    setError(null);

    // Initialize args based on schema
    if (tool.inputSchema?.properties) {
      const initialArgs: Record<string, any> = {};
      Object.keys(tool.inputSchema.properties).forEach((key) => {
        const prop = tool.inputSchema.properties[key];
        if (prop.type === 'string') {
          initialArgs[key] = '';
        } else if (prop.type === 'number') {
          initialArgs[key] = 0;
        } else if (prop.type === 'boolean') {
          initialArgs[key] = false;
        } else if (prop.type === 'array') {
          initialArgs[key] = [];
        } else if (prop.type === 'object') {
          initialArgs[key] = {};
        }
      });
      setToolArgs(initialArgs);
    }
  };

  const handleArgChange = (key: string, value: any) => {
    setToolArgs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleExecute = async () => {
    if (!selectedTool) {
      return;
    }

    setExecuting(true);
    setError(null);
    setResult(null);

    try {
      const response = await onExecute(server.name, selectedTool.name, toolArgs);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  const renderArgInput = (key: string, schema: any) => {
    const value = toolArgs[key];

    if (schema.type === 'string') {
      if (schema.enum) {
        return (
          <select
            value={value || ''}
            onChange={(e) => handleArgChange(key, e.target.value)}
            className="arg-input"
          >
            <option value="">Select...</option>
            {schema.enum.map((opt: string) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      }

      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => handleArgChange(key, e.target.value)}
          placeholder={schema.description || key}
          className="arg-input"
        />
      );
    }

    if (schema.type === 'number') {
      return (
        <input
          type="number"
          value={value || 0}
          onChange={(e) => handleArgChange(key, parseFloat(e.target.value))}
          placeholder={schema.description || key}
          className="arg-input"
        />
      );
    }

    if (schema.type === 'boolean') {
      return (
        <label className="arg-checkbox">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => handleArgChange(key, e.target.checked)}
          />
          <span>{schema.description || key}</span>
        </label>
      );
    }

    if (schema.type === 'array' || schema.type === 'object') {
      return (
        <textarea
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              handleArgChange(key, parsed);
            } catch {
              // Keep as string if not valid JSON
              handleArgChange(key, e.target.value);
            }
          }}
          placeholder={`Enter JSON for ${key}`}
          className="arg-input arg-textarea"
          rows={4}
        />
      );
    }

    return <div>Unsupported type: {schema.type}</div>;
  };

  return (
    <div className="tool-explorer">
      <div className="tool-list">
        <h3>Available Tools</h3>
        {server.tools.length === 0 ? (
          <p className="no-tools">No tools available</p>
        ) : (
          <ul>
            {server.tools.map((tool) => (
              <li
                key={tool.name}
                className={`tool-item ${selectedTool?.name === tool.name ? 'selected' : ''}`}
                onClick={() => handleToolSelect(tool)}
              >
                <div className="tool-name">{tool.name}</div>
                {tool.description && <div className="tool-description">{tool.description}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedTool && (
        <div className="tool-details">
          <h3>{selectedTool.name}</h3>
          {selectedTool.description && (
            <p className="tool-description">{selectedTool.description}</p>
          )}

          {selectedTool.inputSchema?.properties && (
            <div className="tool-args">
              <h4>Arguments</h4>
              {Object.entries(selectedTool.inputSchema.properties).map(
                ([key, schema]: [string, any]) => (
                  <div key={key} className="arg-field">
                    <label className="arg-label">
                      {key}
                      {selectedTool.inputSchema.required?.includes(key) && (
                        <span className="required">*</span>
                      )}
                    </label>
                    {renderArgInput(key, schema)}
                    {schema.description && <small className="arg-help">{schema.description}</small>}
                  </div>
                )
              )}
            </div>
          )}

          <button className="execute-btn" onClick={handleExecute} disabled={executing}>
            {executing ? 'Executing...' : 'Execute Tool'}
          </button>

          {error && (
            <div className="execution-error">
              <h4>Error</h4>
              <pre>{error}</pre>
            </div>
          )}

          {result && (
            <div className="execution-result">
              <h4>Result</h4>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
