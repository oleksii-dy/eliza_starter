import { useState } from 'react';
import type { Project, ExecutionEnvironment } from '../types/gameTypes';

interface CodeViewerProps {
  projects: Project[];
  executionEnvironment: ExecutionEnvironment;
}

export function CodeViewer({ projects, executionEnvironment }: CodeViewerProps) {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedArtifact, setSelectedArtifact] = useState<string>('');
  const [viewMode, setViewMode] = useState<'artifacts' | 'logs' | 'output'>('artifacts');

  const selectedProjectData = projects.find(p => p.id === selectedProject);
  const hasArtifacts = selectedProjectData?.artifacts && selectedProjectData.artifacts.length > 0;

  // Mock code content for demonstration
  const getArtifactContent = (artifactPath: string): string => {
    if (artifactPath.endsWith('.ts') || artifactPath.endsWith('.js')) {
      return `// Generated code for ${selectedProjectData?.name}
import { Plugin, Action, Provider } from '@elizaos/core';

export const ${selectedProjectData?.name.replace(/\s+/g, '')}Plugin: Plugin = {
  name: '${selectedProjectData?.name.toLowerCase().replace(/\s+/g, '-')}',
  description: '${selectedProjectData?.description}',
  
  actions: [
    {
      name: 'MAIN_ACTION',
      description: 'Primary functionality for ${selectedProjectData?.name}',
      validate: async (runtime, message) => {
        return true;
      },
      handler: async (runtime, message, state, options, callback) => {
        // Implementation here
        await callback({
          text: 'Action completed successfully',
          actions: ['MAIN_ACTION']
        });
      }
    }
  ],
  
  providers: [
    {
      name: 'PLUGIN_PROVIDER',
      get: async (runtime, message, state) => {
        return {
          text: 'Provider context for ${selectedProjectData?.name}'
        };
      }
    }
  ]
};

export default ${selectedProjectData?.name.replace(/\s+/g, '')}Plugin;`;
    } else if (artifactPath.endsWith('.json')) {
      return JSON.stringify({
        name: selectedProjectData?.name.toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
        description: selectedProjectData?.description,
        main: 'dist/index.js',
        dependencies: {
          '@elizaos/core': 'workspace:*'
        }
      }, null, 2);
    } else if (artifactPath.endsWith('.md')) {
      return `# ${selectedProjectData?.name}

${selectedProjectData?.description}

## Requirements

${selectedProjectData?.requirements.map(req => `- ${req}`).join('\n')}

## Installation

\`\`\`bash
npm install ${selectedProjectData?.name.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

## Usage

\`\`\`typescript
import { ${selectedProjectData?.name.replace(/\s+/g, '')}Plugin } from './${selectedProjectData?.name.toLowerCase().replace(/\s+/g, '-')}';

// Add to your agent's plugins array
const agent = {
  plugins: [${selectedProjectData?.name.replace(/\s+/g, '')}Plugin]
};
\`\`\`
`;
    }
    return 'File content not available';
  };

  const getExecutionLogs = (): string => {
    return `[${new Date().toISOString()}] Starting execution in ${executionEnvironment} environment
[${new Date().toISOString()}] Code generation completed
[${new Date().toISOString()}] Running tests...
[${new Date().toISOString()}] ✅ All tests passed
[${new Date().toISOString()}] Building plugin...
[${new Date().toISOString()}] ✅ Build successful
[${new Date().toISOString()}] Plugin ready for deployment`;
  };

  const getExecutionOutput = (): string => {
    return `Execution Environment: ${executionEnvironment}
Project: ${selectedProjectData?.name}
Status: ${selectedProjectData?.status}
Progress: ${selectedProjectData?.progress}%

Generated Files:
${selectedProjectData?.artifacts.map(artifact => `  - ${artifact}`).join('\n')}

Test Results:
✅ Unit tests: 12/12 passed
✅ Integration tests: 5/5 passed
✅ Linting: No issues found
✅ Type checking: Passed

Performance Metrics:
- Generation time: 2.3s
- Test execution: 1.8s
- Build time: 3.1s
- Total time: 7.2s

Resource Usage:
- CPU: 45%
- Memory: 128MB
- Disk: 2.4MB`;
  };

  const getLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts': return 'typescript';
      case 'js': return 'javascript';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'py': return 'python';
      case 'rs': return 'rust';
      default: return 'text';
    }
  };

  return (
    <div className="code-viewer">
      <div className="viewer-header">
        <div className="project-selector">
          <select 
            value={selectedProject} 
            onChange={(e) => {
              setSelectedProject(e.target.value);
              setSelectedArtifact('');
            }}
          >
            <option value="">Select Project</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.status})
              </option>
            ))}
          </select>
        </div>

        {selectedProject && (
          <div className="view-mode-selector">
            <button 
              className={`mode-btn ${viewMode === 'artifacts' ? 'active' : ''}`}
              onClick={() => setViewMode('artifacts')}
            >
              📄 Code
            </button>
            <button 
              className={`mode-btn ${viewMode === 'logs' ? 'active' : ''}`}
              onClick={() => setViewMode('logs')}
            >
              📋 Logs
            </button>
            <button 
              className={`mode-btn ${viewMode === 'output' ? 'active' : ''}`}
              onClick={() => setViewMode('output')}
            >
              📊 Output
            </button>
          </div>
        )}
      </div>

      {selectedProject ? (
        <div className="viewer-content">
          {viewMode === 'artifacts' && (
            <div className="artifacts-view">
              {hasArtifacts ? (
                <>
                  <div className="artifact-selector">
                    <select 
                      value={selectedArtifact} 
                      onChange={(e) => setSelectedArtifact(e.target.value)}
                    >
                      <option value="">Select File</option>
                      {selectedProjectData.artifacts.map(artifact => (
                        <option key={artifact} value={artifact}>
                          {artifact}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedArtifact ? (
                    <div className="code-display">
                      <div className="file-header">
                        <span className="file-name">{selectedArtifact}</span>
                        <span className="file-language">{getLanguage(selectedArtifact)}</span>
                        <button 
                          className="copy-btn"
                          onClick={() => navigator.clipboard.writeText(getArtifactContent(selectedArtifact))}
                        >
                          📋 Copy
                        </button>
                      </div>
                      <pre className={`code-content language-${getLanguage(selectedArtifact)}`}>
                        <code>{getArtifactContent(selectedArtifact)}</code>
                      </pre>
                    </div>
                  ) : (
                    <div className="select-file-prompt">
                      <span className="icon">📁</span>
                      <p>Select a file to view its contents</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-artifacts">
                  <span className="icon">📝</span>
                  <p>No code artifacts generated yet</p>
                  <small>Code will appear here once the agent starts generating</small>
                </div>
              )}
            </div>
          )}

          {viewMode === 'logs' && (
            <div className="logs-view">
              <div className="logs-header">
                <h4>Execution Logs</h4>
                <button 
                  className="refresh-btn"
                  onClick={() => console.log('Refresh logs')}
                >
                  🔄 Refresh
                </button>
              </div>
              <pre className="logs-content">
                {getExecutionLogs()}
              </pre>
            </div>
          )}

          {viewMode === 'output' && (
            <div className="output-view">
              <div className="output-header">
                <h4>Execution Output</h4>
                <div className="environment-badge">
                  <span className="env-icon">🖥️</span>
                  <span>{executionEnvironment}</span>
                </div>
              </div>
              <pre className="output-content">
                {getExecutionOutput()}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div className="select-project-prompt">
          <span className="icon">🎯</span>
          <p>Select a project to view generated code</p>
          <small>Code artifacts, logs, and output will be displayed here</small>
        </div>
      )}

      {selectedProject && selectedProjectData && (
        <div className="project-summary">
          <div className="summary-item">
            <label>Status:</label>
            <span className={`status-badge ${selectedProjectData.status}`}>
              {selectedProjectData.status}
            </span>
          </div>
          <div className="summary-item">
            <label>Progress:</label>
            <span>{selectedProjectData.progress}%</span>
          </div>
          <div className="summary-item">
            <label>Artifacts:</label>
            <span>{selectedProjectData.artifacts.length} files</span>
          </div>
          <div className="summary-item">
            <label>Last Updated:</label>
            <span>{new Date(selectedProjectData.updatedAt).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}