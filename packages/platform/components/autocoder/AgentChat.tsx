'use client'

import { useState, useRef, useEffect } from 'react'
import { Project } from './AutocoderWorkspace'

export interface ChatMessage {
  id: string
  projectId: string
  type: 'user' | 'agent' | 'system'
  message: string
  timestamp: Date
  metadata?: {
    step?: string
    progress?: number
    action?: string
  }
}

interface AgentChatProps {
  project: Project
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isConnected: boolean
}

export function AgentChat({ project, messages, onSendMessage, isConnected }: AgentChatProps) {
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Auto-focus input when component mounts
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = () => {
    if (inputMessage.trim() && isConnected) {
      onSendMessage(inputMessage.trim())
      setInputMessage('')
      setIsTyping(true)
      
      // Simulate agent thinking/typing
      setTimeout(() => setIsTyping(false), 2000)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp)
  }

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user'
    const isSystem = message.type === 'system'

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
          <div
            className={`rounded-lg px-4 py-3 ${
              isUser
                ? 'bg-blue-600 text-white'
                : isSystem
                ? 'bg-gray-100 text-gray-700 border border-gray-200'
                : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
            }`}
          >
            {!isUser && !isSystem && (
              <div className="flex items-center mb-2">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  AI
                </div>
                <span className="ml-2 text-xs text-gray-500">
                  Autocoder Agent
                </span>
              </div>
            )}
            
            <div className="whitespace-pre-wrap">
              {message.message}
            </div>
            
            {message.metadata?.step && (
              <div className="mt-2 text-xs opacity-75">
                <span className="font-medium">Step:</span> {message.metadata.step}
                {message.metadata.progress && (
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${message.metadata.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </div>
    )
  }

  const projectMessages = messages.filter(m => m.projectId === project.id)

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
            <p className="text-sm text-gray-600">{project.description}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
              project.status === 'planning' ? 'bg-blue-100 text-blue-800' :
              project.status === 'building' ? 'bg-yellow-100 text-yellow-800' :
              project.status === 'testing' ? 'bg-purple-100 text-purple-800' :
              project.status === 'completed' ? 'bg-green-100 text-green-800' :
              project.status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                project.status === 'building' ? 'animate-pulse bg-yellow-600' : ''
              }`} />
              {project.status}
            </div>
            
            {!isConnected && (
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs bg-red-100 text-red-800">
                <div className="w-2 h-2 rounded-full bg-red-600" />
                Reconnecting...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {projectMessages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Start Collaborating
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Describe what you want to build and I'll help you research, plan, and implement it step by step.
            </p>
          </div>
        ) : (
          <>
            {projectMessages.map(renderMessage)}
            
            {isTyping && (
              <div className="flex justify-start mb-4">
                <div className="max-w-[80%]">
                  <div className="bg-white text-gray-900 border border-gray-200 shadow-sm rounded-lg px-4 py-3">
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        AI
                      </div>
                      <span className="ml-2 text-xs text-gray-500">
                        Autocoder Agent
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isConnected 
                  ? "Describe what you want to build, ask for research, or refine your requirements..."
                  : "Reconnecting to agent..."
              }
              disabled={!isConnected}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={3}
              maxLength={2000}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">
                {inputMessage.length}/2000 characters
              </span>
              <span className="text-xs text-gray-500">
                Press Enter to send, Shift+Enter for new line
              </span>
            </div>
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || !isConnected}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}