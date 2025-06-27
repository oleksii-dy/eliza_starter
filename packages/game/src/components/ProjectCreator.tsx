import React, { useState } from 'react';

interface ProjectCreatorProps {
  onCreateProject: (projectData: {
    name: string;
    description: string;
    requirements: string[];
  }) => Promise<void>;
  disabled: boolean;
}

export function ProjectCreator({ onCreateProject, disabled }: ProjectCreatorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    requirements: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim()) return;

    setIsCreating(true);
    try {
      const requirements = formData.requirements
        .split('\n')
        .map(req => req.trim())
        .filter(req => req.length > 0);

      await onCreateProject({
        name: formData.name.trim(),
        description: formData.description.trim(),
        requirements
      });

      // Reset form
      setFormData({ name: '', description: '', requirements: '' });
    } catch (error) {
      console.error('[ProjectCreator] Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const projectTemplates = [
    {
      name: 'Simple Calculator Plugin',
      description: 'A basic calculator plugin with arithmetic operations',
      requirements: ['Basic math operations', 'User interface', 'Error handling']
    },
    {
      name: 'Weather Widget Plugin',
      description: 'Display current weather information',
      requirements: ['Weather API integration', 'Location detection', 'Display widget']
    },
    {
      name: 'Todo List Plugin',
      description: 'Simple todo list management',
      requirements: ['Add/remove todos', 'Mark complete', 'Local storage']
    }
  ];

  const loadTemplate = (template: typeof projectTemplates[0]) => {
    setFormData({
      name: template.name,
      description: template.description,
      requirements: template.requirements.join('\n')
    });
  };

  return (
    <div className="project-creator">
      <div className="creator-header">
        <h3>🚀 Create New Project</h3>
      </div>

      <div className="quick-templates">
        <h4>Quick Templates:</h4>
        <div className="template-buttons">
          {projectTemplates.map((template, index) => (
            <button
              key={index}
              className="template-btn"
              onClick={() => loadTemplate(template)}
              disabled={disabled || isCreating}
              title={template.description}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="project-form">
        <div className="form-group">
          <label htmlFor="project-name">Project Name:</label>
          <input
            id="project-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter project name..."
            disabled={disabled || isCreating}
            required
            data-testid="project-name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="project-description">Description:</label>
          <textarea
            id="project-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe what this project should accomplish..."
            disabled={disabled || isCreating}
            required
            rows={3}
            data-testid="project-description"
          />
        </div>

        <div className="form-group">
          <label htmlFor="project-requirements">Requirements (one per line):</label>
          <textarea
            id="project-requirements"
            value={formData.requirements}
            onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
            placeholder="List project requirements, one per line..."
            disabled={disabled || isCreating}
            rows={4}
          />
        </div>

        <button
          type="submit"
          className="create-btn"
          disabled={disabled || isCreating || !formData.name.trim() || !formData.description.trim()}
          data-testid="create-project-btn"
        >
          {isCreating ? (
            <>
              <span className="loading-spinner small"></span>
              Creating Project...
            </>
          ) : (
            <>
              🚀 Create Project
            </>
          )}
        </button>
      </form>
    </div>
  );
}