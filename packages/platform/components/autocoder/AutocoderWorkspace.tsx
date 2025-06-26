'use client'

import { useState, useEffect, useRef } from 'react'
import { AgentChat } from './AgentChat'
import { ProjectPlanner } from './ProjectPlanner'
import { JobQueue } from './JobQueue'
import { PluginPreview } from './PluginPreview'
import { RegistryManager } from './RegistryManager'
import { useAutocoderWebSocket } from '@/lib/hooks/useAutocoderWebSocket'

export interface Project {
  id: string
  name: string
  description: string
  type: 'mcp' | 'plugin' | 'service'
  status: 'planning' | 'building' | 'testing' | 'completed' | 'failed'
  specification?: ProjectSpecification
  buildLogs?: BuildLog[]
  result?: PluginBuild
  createdAt: Date
  updatedAt: Date
}

export interface ProjectSpecification {
  name: string
  description: string
  type: string
  dependencies: string[]
  features: string[]
  testCases: string[]
  securityRequirements: string[]
}

export interface BuildLog {
  id: string
  projectId: string
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  source: string
}

export interface PluginBuild {
  id: string
  files: Record<string, string>
  packageJson: any
  tests: TestResult[]
  quality: QualityMetrics
}

export interface TestResult {
  name: string
  status: 'passed' | 'failed' | 'skipped'
  message?: string
  duration: number
}

export interface QualityMetrics {
  codeQuality: number
  testCoverage: number
  security: number
  performance: number
  documentation: number
}

interface AutocoderWorkspaceProps {
  userId: string
}

export function AutocoderWorkspace({ userId }: AutocoderWorkspaceProps) {
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentView, setCurrentView] = useState<'chat' | 'planner' | 'queue' | 'preview' | 'registry'>('chat')
  const [isLoading, setIsLoading] = useState(false)
  
  // WebSocket connection for real-time updates
  const { 
    isConnected, 
    messages, 
    sendMessage, 
    projectUpdates,
    buildLogs,
    subscribe,
    unsubscribe 
  } = useAutocoderWebSocket(userId)

  useEffect(() => {
    // Load user's projects
    loadProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    // Subscribe to project updates if we have an active project
    if (activeProject) {
      subscribe(activeProject.id)
      return () => unsubscribe(activeProject.id)
    }
  }, [activeProject, subscribe, unsubscribe])

  useEffect(() => {
    // Handle real-time project updates
    if (projectUpdates.length > 0) {
      const latestUpdate = projectUpdates[projectUpdates.length - 1]
      if (latestUpdate.projectId === activeProject?.id) {
        setActiveProject(prev => {
          if (!prev) return null
          
          // Destructure updates and handle status separately
          const { status: newStatus, ...otherUpdates } = latestUpdate.updates
          
          // Create updated project without status first
          const updatedProject: Project = {
            ...prev,
            ...otherUpdates
          }
          
          // Handle status update separately with proper typing
          if (newStatus) {
            const validStatuses: Project['status'][] = ['planning', 'building', 'testing', 'completed', 'failed']
            
            if (validStatuses.includes(newStatus as Project['status'])) {
              updatedProject.status = newStatus as Project['status']
            } else {
              console.warn(`Invalid project status received: ${newStatus}`)
              // Keep existing status
            }
          }
          
          return updatedProject
        })
      }
    }
  }, [projectUpdates, activeProject])

  const loadProjects = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/autocoder/projects?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createNewProject = async (description: string, type: Project['type'] = 'mcp') => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/autocoder/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          description,
          type,
          name: `Project ${Date.now()}`
        })
      })

      if (response.ok) {
        const newProject = await response.json()
        setProjects(prev => [newProject, ...prev])
        setActiveProject(newProject)
        setCurrentView('chat')
      }
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startBuild = async (projectId: string, specification: ProjectSpecification) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/autocoder/projects/${projectId}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specification })
      })

      if (response.ok) {
        const updatedProject = await response.json()
        setActiveProject(updatedProject)
        setCurrentView('queue')
      }
    } catch (error) {
      console.error('Failed to start build:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const cancelBuild = async (projectId: string) => {
    try {
      await fetch(`/api/autocoder/projects/${projectId}/cancel`, {
        method: 'POST'
      })
    } catch (error) {
      console.error('Failed to cancel build:', error)
    }
  }

  const handleChatMessage = (message: string) => {
    if (activeProject) {
      sendMessage({
        type: 'AGENT_MESSAGE',
        projectId: activeProject.id,
        message,
        timestamp: new Date()
      })
    }
  }

  const handleSpecificationUpdate = (specification: ProjectSpecification) => {
    if (activeProject) {
      setActiveProject(prev => prev ? { ...prev, specification } : null)
    }
  }

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Project Navigation */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => createNewProject('Describe what you want to build...')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            disabled={isLoading}
          >
            New Project
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Projects</h3>
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => setActiveProject(project)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  activeProject?.id === project.id 
                    ? 'bg-blue-100 border-blue-200' 
                    : 'bg-white hover:bg-gray-50'
                } border`}
              >
                <div className="font-medium text-sm truncate">{project.name}</div>
                <div className="text-xs text-gray-500 mt-1">{project.type}</div>
                <div className={`text-xs mt-1 inline-block px-2 py-1 rounded ${
                  project.status === 'completed' ? 'bg-green-100 text-green-800' :
                  project.status === 'building' ? 'bg-blue-100 text-blue-800' :
                  project.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Connection Status */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-xs text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            {[
              { key: 'chat', label: 'Chat', icon: '💬' },
              { key: 'planner', label: 'Planner', icon: '📋' },
              { key: 'queue', label: 'Build Queue', icon: '⚡' },
              { key: 'preview', label: 'Preview', icon: '👀' },
              { key: 'registry', label: 'Registry', icon: '📦' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCurrentView(tab.key as 'chat' | 'planner' | 'queue' | 'preview' | 'registry')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  currentView === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {!activeProject ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🤖</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome to Autocoder
                </h2>
                <p className="text-gray-600 mb-6 max-w-md">
                  Create a new project to start collaborating with AI agents to build, 
                  test, and deploy plugins automatically.
                </p>
                <button
                  onClick={() => createNewProject('Describe what you want to build...')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your First Project
                </button>
              </div>
            </div>
          ) : (
            <>
              {currentView === 'chat' && (
                <AgentChat
                  project={activeProject}
                  messages={messages.filter(m => m.projectId === activeProject.id)}
                  onSendMessage={handleChatMessage}
                  isConnected={isConnected}
                />
              )}
              
              {currentView === 'planner' && (
                <ProjectPlanner
                  project={activeProject}
                  onSpecificationUpdate={handleSpecificationUpdate}
                  onStartBuild={(spec) => startBuild(activeProject.id, spec)}
                />
              )}
              
              {currentView === 'queue' && (
                <JobQueue
                  projects={projects.filter(p => ['building', 'testing'].includes(p.status))}
                  buildLogs={buildLogs.filter((log: any) => log.projectId === activeProject.id)}
                  onCancelBuild={cancelBuild}
                />
              )}
              
              {currentView === 'preview' && (
                <PluginPreview
                  project={activeProject}
                  build={activeProject.result}
                />
              )}
              
              {currentView === 'registry' && (
                <RegistryManager
                  project={activeProject}
                  userId={userId}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}