import type { Task, Goal, Project } from '../types/gameTypes';

interface TaskProgressProps {
  tasks: Task[];
  goals: Goal[];
  projects: Project[];
}

export function TaskProgress({ tasks, goals, projects }: TaskProgressProps) {

  const getStatusIcon = (status: Project['status']): string => {
    switch (status) {
      case 'planning': return '📋';
      case 'coding': return '⚡';
      case 'testing': return '🧪';
      case 'deploying': return '🚀';
      case 'complete': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: Project['status']): string => {
    switch (status) {
      case 'planning': return 'planning';
      case 'coding': return 'coding';
      case 'testing': return 'testing';
      case 'deploying': return 'deploying';
      case 'complete': return 'complete';
      case 'failed': return 'failed';
      default: return 'unknown';
    }
  };

  // Calculate overall statistics
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === 'complete').length;
  const activeProjects = projects.filter(p => p.status !== 'complete' && p.status !== 'failed').length;
  const failedProjects = projects.filter(p => p.status === 'failed').length;

  const overallProgress = totalProjects > 0 
    ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / totalProjects)
    : 0;

  return (
    <div className="task-progress">
      {/* Overall Statistics */}
      <div className="progress-overview">
        <h4>📊 Progress Overview</h4>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{totalProjects}</div>
            <div className="stat-label">Total Projects</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{completedProjects}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{activeProjects}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card">
            <div className="stat-value error">{failedProjects}</div>
            <div className="stat-label">Failed</div>
          </div>
        </div>

        <div className="overall-progress">
          <label>Overall Progress:</label>
          <div className="progress-bar large">
            <div 
              className="progress-fill" 
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
          <span className="progress-text">{overallProgress}%</span>
        </div>
      </div>

      {/* Active Projects Progress */}
      {activeProjects > 0 && (
        <div className="active-projects-progress">
          <h4>🔄 Active Projects</h4>
          <div className="project-progress-list">
            {projects
              .filter(p => p.status !== 'complete' && p.status !== 'failed')
              .map(project => (
                <div key={project.id} className="project-progress-item">
                  <div className="project-header">
                    <div className="project-info">
                      <span className="project-name">{project.name}</span>
                      <span className={`status-badge ${getStatusColor(project.status)}`}>
                        <span className="status-icon">{getStatusIcon(project.status)}</span>
                        {project.status}
                      </span>
                    </div>
                    <div className="project-stats">
                      <span className="progress-percent">{project.progress}%</span>
                    </div>
                  </div>
                  
                  <div className="project-progress-bar">
                    <div 
                      className={`progress-fill ${getStatusColor(project.status)}`}
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>

                  {project.assignedAgent && (
                    <div className="project-agent">
                      <span>👨‍💻 {project.assignedAgent}</span>
                    </div>
                  )}

                  <div className="project-timing">
                    <span>Started: {new Date(project.createdAt).toLocaleString()}</span>
                    {project.estimatedCompletion && (
                      <span>ETA: {new Date(project.estimatedCompletion).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {tasks.length > 0 && (
        <div className="completed-tasks">
          <h4>✅ Completed Tasks</h4>
          <div className="task-list">
            {tasks.slice(-10).map(task => (
              <div key={task.id} className="task-item">
                <div className="task-info">
                  <span className="task-name">{task.name}</span>
                  <span className="task-description">{task.description}</span>
                </div>
                <div className="task-meta">
                  {task.metadata?.completionTime && typeof task.metadata.completionTime === 'number' ? (
                    <span className="completion-time">
                      {new Date(task.metadata.completionTime as number).toLocaleString()}
                    </span>
                  ) : null}
                  <div className="task-tags">
                    {task.tags.map((tag: string) => (
                      <span key={tag} className="task-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals Progress */}
      {goals.length > 0 && (
        <div className="goals-progress">
          <h4>🎯 Active Goals</h4>
          <div className="goals-list">
            {goals.map(goal => (
              <div key={goal.id} className="goal-item">
                <div className="goal-header">
                  <span className="goal-name">{goal.name}</span>
                  <span className="goal-status">{goal.status}</span>
                </div>
                <div className="goal-description">{goal.description}</div>
                {goal.objectives && (
                  <div className="goal-objectives">
                    <strong>Objectives:</strong>
                    <ul>
                      {goal.objectives.map((objective: { description: string; completed: boolean }, index: number) => (
                        <li key={index} className={objective.completed ? 'completed' : 'pending'}>
                          <span className="objective-icon">
                            {objective.completed ? '✅' : '⏳'}
                          </span>
                          {objective.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalProjects === 0 && tasks.length === 0 && goals.length === 0 && (
        <div className="empty-progress">
          <span className="icon">📈</span>
          <p>No progress data available yet</p>
          <small>Create projects to start tracking progress</small>
        </div>
      )}
    </div>
  );
}