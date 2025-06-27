import React, { useState, useRef, useEffect } from 'react';
import type { AgentMessage, CoordinationRequest } from '../types/gameTypes';

interface ChatRoomProps {
  rooms: [string, AgentMessage[]][];
  activeRequests: CoordinationRequest[];
  onSendMessage: (roomId: string, content: string, targetAgent?: string) => void;
  onRespondToRequest: (requestId: string, response: string, data?: any) => void;
  onBroadcast: (roomId: string, content: string) => void;
  allowUserParticipation: boolean;
  isConnected: boolean;
}

export function ChatRoom({ 
  rooms, 
  activeRequests,
  onSendMessage, 
  onRespondToRequest,
  onBroadcast,
  allowUserParticipation,
  isConnected 
}: ChatRoomProps) {
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [messageInput, setMessageInput] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [showRequests, setShowRequests] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-select first room if none selected
  useEffect(() => {
    if (!selectedRoom && rooms.length > 0) {
      setSelectedRoom(rooms[0][0]);
    }
  }, [rooms, selectedRoom]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rooms, selectedRoom]);

  const selectedRoomMessages = rooms.find(([roomId]) => roomId === selectedRoom)?.[1] || [];

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedRoom || !isConnected) return;

    onSendMessage(selectedRoom, messageInput.trim(), selectedTarget || undefined);
    setMessageInput('');
    setSelectedTarget('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRespondToRequest = (request: CoordinationRequest, response: string) => {
    onRespondToRequest(request.requestId, response);
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getMessageIcon = (type: AgentMessage['type']): string => {
    switch (type) {
      case 'status': return '📊';
      case 'request': return '❓';
      case 'response': return '✅';
      case 'coordination': return '🤝';
      case 'completion': return '🎉';
      case 'error': return '❌';
      default: return '💬';
    }
  };

  const getAgentIcon = (agentName: string): string => {
    if (agentName === 'system') return '🖥️';
    if (agentName === 'user') return '👤';
    if (agentName.includes('Orchestrator')) return '🎭';
    if (agentName.includes('Coder')) return '👨‍💻';
    return '🤖';
  };

  const getPriorityColor = (priority: CoordinationRequest['priority']): string => {
    switch (priority) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'medium';
    }
  };

  return (
    <div className="chat-room">
      <div className="chat-header">
        <div className="room-selector">
          <select 
            value={selectedRoom} 
            onChange={(e) => setSelectedRoom(e.target.value)}
            disabled={!isConnected}
          >
            <option value="">Select Room</option>
            {rooms.map(([roomId]) => (
              <option key={roomId} value={roomId}>
                {roomId.replace(/^room_/, '').replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="chat-controls">
          <button 
            className={`control-btn ${showRequests ? 'active' : ''}`}
            onClick={() => setShowRequests(!showRequests)}
            title="Show coordination requests"
          >
            🤝 Requests ({activeRequests.length})
          </button>
          
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span>{isConnected ? 'Connected' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {showRequests && activeRequests.length > 0 && (
        <div className="coordination-requests">
          <h4>🤝 Active Coordination Requests</h4>
          {activeRequests.map(request => (
            <div key={request.requestId} className={`request-card ${getPriorityColor(request.priority)}`}>
              <div className="request-header">
                <span className="request-type">{request.type.replace(/_/g, ' ')}</span>
                <span className="request-priority">{request.priority}</span>
                <span className="request-from">from {request.fromAgent}</span>
              </div>
              <div className="request-description">{request.description}</div>
              {request.requirements.length > 0 && (
                <div className="request-requirements">
                  <strong>Requirements:</strong>
                  <ul>
                    {request.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="request-actions">
                <button 
                  className="respond-btn accept"
                  onClick={() => handleRespondToRequest(request, 'I can help with this request')}
                >
                  ✅ Accept
                </button>
                <button 
                  className="respond-btn decline"
                  onClick={() => handleRespondToRequest(request, 'I cannot assist with this request at the moment')}
                >
                  ❌ Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="chat-messages" data-testid="chat-messages">
        {selectedRoom ? (
          <>
            {selectedRoomMessages.length === 0 ? (
              <div className="no-messages">
                <span className="icon">💭</span>
                <p>No messages in this room yet</p>
                <small>Send a message to start the conversation</small>
              </div>
            ) : (
              selectedRoomMessages.map(message => (
                <div key={message.id} className={`message ${message.fromAgent === 'user' ? 'user-message' : 'agent-message'}`}>
                  <div className="message-header">
                    <span className="message-icon">{getAgentIcon(message.fromAgent)}</span>
                    <span className="agent-name">{message.fromAgent}</span>
                    <span className="message-type-icon">{getMessageIcon(message.type)}</span>
                    <span className="message-type">{message.type}</span>
                    <span className="timestamp">{formatTimestamp(message.timestamp)}</span>
                  </div>
                  
                  <div className="message-content">
                    <div className="message-text">{message.content.text}</div>
                    
                    {message.content.data && (
                      <div className="message-data">
                        <details>
                          <summary>📋 Additional Data</summary>
                          <pre>{JSON.stringify(message.content.data, null, 2)}</pre>
                        </details>
                      </div>
                    )}

                    {message.content.attachments && message.content.attachments.length > 0 && (
                      <div className="message-attachments">
                        <strong>📎 Attachments:</strong>
                        {message.content.attachments.map((attachment, index) => (
                          <span key={index} className="attachment">
                            {attachment.name || `Attachment ${index + 1}`}
                          </span>
                        ))}
                      </div>
                    )}

                    {message.toAgent && (
                      <div className="message-target">
                        <span>→ Directed to: {message.toAgent}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="select-room-prompt">
            <span className="icon">🏠</span>
            <p>Select a room to view messages</p>
          </div>
        )}
      </div>

      {allowUserParticipation && (
        <div className="chat-input">
          <div className="input-controls">
            <select 
              value={selectedTarget} 
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="target-selector"
              disabled={!isConnected || !selectedRoom}
            >
              <option value="">Broadcast to all</option>
              <option value="orchestrator">🎭 Orchestrator</option>
              {/* Add coder agents dynamically */}
            </select>

            <button 
              className="broadcast-btn"
              onClick={() => selectedRoom && onBroadcast(selectedRoom, messageInput.trim())}
              disabled={!isConnected || !selectedRoom || !messageInput.trim()}
              title="Broadcast to entire room"
            >
              📢
            </button>
          </div>

          <div className="message-input-container">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                !isConnected 
                  ? "Disconnected - cannot send messages"
                  : !selectedRoom 
                    ? "Select a room first"
                    : "Type your message... (Enter to send, Shift+Enter for new line)"
              }
              disabled={!isConnected || !selectedRoom}
              className="message-input"
              data-testid="user-message"
            />
            
            <button 
              onClick={handleSendMessage}
              disabled={!isConnected || !selectedRoom || !messageInput.trim()}
              className="send-button"
              data-testid="send-btn"
            >
              📤 Send
            </button>
          </div>
        </div>
      )}

      {!allowUserParticipation && (
        <div className="participation-disabled">
          <span className="icon">🤖</span>
          <p>Autonomous mode active - agents working independently</p>
          <small>Switch to manual mode to participate in conversations</small>
        </div>
      )}
    </div>
  );
}