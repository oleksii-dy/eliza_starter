'use client'

import { useState, useEffect } from 'react'
import { Project, BuildLog } from './AutocoderWorkspace'
import type { SelectChangeEvent } from '@/lib/types/common'

interface JobQueueProps {
  projects: Project[]
  buildLogs: BuildLog[]
  onCancelBuild: (projectId: string) => void
}

interface QueueJob {
  id: string
  project: Project
  position: number
  estimatedTime: number
  startTime?: Date
}

export function JobQueue({ projects, buildLogs, onCancelBuild }: JobQueueProps) {
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'building' | 'queued' | 'testing'>('all')

  const createQueueJobs = (): QueueJob[] => {
    return projects
      .filter(p => ['building', 'testing'].includes(p.status))
      .map((project, index) => ({
        id: project.id,
        project,
        position: index + 1,
        estimatedTime: getEstimatedTime(project),
        startTime: project.status === 'building' ? new Date(Date.now() - 60000) : undefined
      }))
  }

  const getEstimatedTime = (project: Project): number => {
    // Mock estimation based on project complexity
    const baseTime = 180 // 3 minutes base
    const dependencyTime = (project.specification?.dependencies.length || 0) * 30
    const featureTime = (project.specification?.features.length || 0) * 60
    return baseTime + dependencyTime + featureTime
  }

  const getElapsedTime = (startTime: Date): number => {
    return Math.floor((Date.now() - startTime.getTime()) / 1000)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getBuildProgress = (project: Project, logs: BuildLog[]): number => {
    const projectLogs = logs.filter((log: any) => log.projectId === project.id)
    if (projectLogs.length === 0) return 0
    
    // Mock progress calculation based on log patterns
    const steps = [
      'Installing dependencies',
      'Generating code',
      'Running tests',
      'Building package',
      'Finalizing'
    ]
    
    const completedSteps = steps.filter(step => 
      projectLogs.some(log => log.message.toLowerCase().includes(step.toLowerCase()))
    ).length
    
    return Math.min((completedSteps / steps.length) * 100, 95) // Never show 100% until truly complete
  }

  const getLatestLogMessage = (projectId: string): string => {
    const projectLogs = buildLogs.filter((log: any) => log.projectId === projectId)
    if (projectLogs.length === 0) return 'Initializing...'
    
    const latest = projectLogs[projectLogs.length - 1]
    return latest.message
  }

  const queueJobs = createQueueJobs()
  const filteredJobs = queueJobs.filter(job => {
    if (filter === 'all') return true
    if (filter === 'building') return job.project.status === 'building'
    if (filter === 'testing') return job.project.status === 'testing'
    return false
  })

  const selectedJobLogs = selectedJob 
    ? buildLogs.filter(log => log.projectId === selectedJob).slice(-50) // Show last 50 logs
    : []

  return (
    <div className="h-full flex">
      {/* Queue List */}
      <div className="w-1/2 border-r border-gray-200 flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Build Queue</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {queueJobs.length} active jobs
              </span>
            </div>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex space-x-4">
            {[
              { key: 'all', label: 'All' },
              { key: 'building', label: 'Building' },
              { key: 'testing', label: 'Testing' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as 'all' | 'building' | 'queued' | 'testing')}
                className={`pb-2 border-b-2 font-medium text-sm transition-colors ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Active Builds
              </h3>
              <p className="text-gray-600">
                When you start a build, it will appear here with live progress updates.
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {filteredJobs.map((job) => {
                const progress = getBuildProgress(job.project, buildLogs)
                const latestMessage = getLatestLogMessage(job.id)
                const elapsedTime = job.startTime ? getElapsedTime(job.startTime) : 0
                
                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedJob === job.id
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{job.project.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{job.project.type}</p>
                      </div>
                      
                      <div className="text-right">
                        <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          job.project.status === 'building' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {job.project.status}
                        </div>
                        {job.startTime && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatTime(elapsedTime)} elapsed
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            job.project.status === 'building' 
                              ? 'bg-blue-500' 
                              : 'bg-purple-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Latest Message */}
                    <div className="text-sm text-gray-600 mb-3 truncate">
                      <span className="font-medium">Latest:</span> {latestMessage}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        ETA: {formatTime(job.estimatedTime - elapsedTime)} remaining
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onCancelBuild(job.id)
                        }}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Log Viewer */}
      <div className="w-1/2 flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedJob ? 'Build Logs' : 'Select a Job'}
            </h3>
            {selectedJob && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    // Download logs functionality
                    const logs = selectedJobLogs.map(log => 
                      `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.message}`
                    ).join('\n')
                    
                    const blob = new Blob([logs], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `build-logs-${selectedJob}.txt`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Download
                </button>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {selectedJob ? (
            <div className="h-full bg-gray-900 text-gray-100 p-4 overflow-y-auto font-mono text-sm">
              {selectedJobLogs.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  No logs available yet...
                </div>
              ) : (
                <div className="space-y-1">
                  {selectedJobLogs.map((log, index) => (
                    <div key={index} className="flex">
                      <span className="text-gray-400 w-20 shrink-0">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      <span className={`w-12 shrink-0 ${
                        log.level === 'error' ? 'text-red-400' :
                        log.level === 'warn' ? 'text-yellow-400' :
                        log.level === 'debug' ? 'text-blue-400' :
                        'text-green-400'
                      }`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))}
                  
                  {/* Auto-scroll indicator */}
                  <div className="text-gray-500 text-center py-2">
                    — Live logs —
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Build Job
                </h3>
                <p className="text-gray-600">
                  Choose a job from the queue to view its live build logs and progress.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}