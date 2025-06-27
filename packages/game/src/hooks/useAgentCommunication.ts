import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { AgentMessage, CoordinationRequest } from '../types/gameTypes';

export function useAgentCommunication(roomIds: string[] = []) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Map<string, AgentMessage[]>>(new Map());
  const [activeRequests, setActiveRequests] = useState<Map<string, CoordinationRequest>>(new Map());
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize WebSocket connection to actual ElizaOS server
  useEffect(() => {
    const socket = io('http://localhost:3000', {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[AgentComm] Connected to ElizaOS WebSocket server');
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('[AgentComm] Disconnected from ElizaOS WebSocket server:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        setConnectionError('Server disconnected. Please check if ElizaOS is running.');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[AgentComm] Connection error:', error);
      setConnectionError('Failed to connect to ElizaOS server. Please ensure it is running on port 3000.');
    });

    // Listen for ElizaOS message broadcasts
    socket.on('messageBroadcast', (data: any) => {
      console.log('[AgentComm] Received message broadcast:', data);
      
      const message: AgentMessage = {
        id: data.id || `msg_${Date.now()}`,
        type: 'response',
        fromAgent: data.senderId || data.agentId || 'unknown',
        roomId: data.channelId || data.roomId || 'general',
        content: {
          text: data.text || data.message || '',
          metadata: {
            source: 'elizaos_broadcast',
            originalData: data
          }
        },
        timestamp: data.createdAt || Date.now()
      };

      handleAgentMessage(message);
    });

    // Listen for agent-specific events
    socket.on('agent_message', (message: AgentMessage) => {
      console.log('[AgentComm] Received direct agent message:', message);
      handleAgentMessage(message);
    });

    // Listen for control messages (like input disable/enable)
    socket.on('controlMessage', (data: { action: string; channelId: string }) => {
      console.log('[AgentComm] Received control message:', data);
      
      const controlMessage: AgentMessage = {
        id: `control_${Date.now()}`,
        type: 'status',
        fromAgent: 'system',
        roomId: data.channelId,
        content: {
          text: `Control: ${data.action}`,
          metadata: {
            controlAction: data.action,
            source: 'elizaos_control'
          }
        },
        timestamp: Date.now()
      };

      handleAgentMessage(controlMessage);
    });

    // Listen for message completion events
    socket.on('messageComplete', (data: { channelId: string; messageId?: string }) => {
      console.log('[AgentComm] Message complete:', data);
      
      const completeMessage: AgentMessage = {
        id: `complete_${Date.now()}`,
        type: 'completion',
        fromAgent: 'system',
        roomId: data.channelId,
        content: {
          text: 'Message processing complete',
          metadata: {
            messageId: data.messageId,
            source: 'elizaos_completion'
          }
        },
        timestamp: Date.now()
      };

      handleAgentMessage(completeMessage);
    });

    // Listen for log streaming if available
    socket.on('log_stream', (data: { type: string; payload: any }) => {
      if (data.type === 'log_entry' && data.payload.level === 'info') {
        const logMessage: AgentMessage = {
          id: `log_${Date.now()}`,
          type: 'status',
          fromAgent: 'system',
          roomId: 'system',
          content: {
            text: `[${data.payload.level.toUpperCase()}] ${data.payload.message}`,
            metadata: {
              source: 'elizaos_logs',
              logLevel: data.payload.level,
              timestamp: data.payload.timestamp
            }
          },
          timestamp: Date.now()
        };

        handleAgentMessage(logMessage);
      }
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  // Join rooms when roomIds change (using ElizaOS room joining)
  useEffect(() => {
    if (socketRef.current && isConnected) {
      roomIds.forEach(roomId => {
        // Use ElizaOS room joining event format
        socketRef.current?.emit('1', { // ROOM_JOINING event
          channelId: roomId,
          entityId: 'ui-client',
          serverId: 'game-server'
        });
        console.log('[AgentComm] Joined ElizaOS room:', roomId);
      });
    }
  }, [isConnected, roomIds]);

  const handleAgentMessage = useCallback((message: AgentMessage) => {
    setMessages(prev => {
      const newMap = new Map(prev);
      const roomMessages = newMap.get(message.roomId) || [];
      
      // Avoid duplicates
      const existingMessage = roomMessages.find(m => m.id === message.id);
      if (!existingMessage) {
        newMap.set(message.roomId, [...roomMessages, message]);
      }
      
      return newMap;
    });

    // Handle special message types
    if (message.type === 'completion') {
      console.log('[AgentComm] Task/project completion detected:', message.content.metadata);
    } else if (message.type === 'error') {
      console.error('[AgentComm] Agent error:', message.content.text);
    } else if (message.content.text?.includes('autonomous mode')) {
      console.log('[AgentComm] Game mode change detected:', message.content.text);
    }
  }, []);

  // Send message to agents using ElizaOS messaging format
  const sendMessage = useCallback((roomId: string, content: string, targetAgent?: string) => {
    if (!socketRef.current || !isConnected) {
      console.warn('[AgentComm] Cannot send message - not connected to ElizaOS');
      return;
    }

    // Use ElizaOS SEND_MESSAGE event format
    socketRef.current.emit('2', { // SEND_MESSAGE event
      channelId: roomId,
      senderId: 'ui-client',
      senderName: 'User',
      message: content,
      serverId: 'game-server',
      source: 'ui',
      metadata: {
        targetAgent,
        timestamp: Date.now(),
        source: 'autonomous_game_ui'
      }
    });

    console.log('[AgentComm] Sent message to ElizaOS:', { roomId, content, targetAgent });

    // Add to local messages for immediate UI feedback
    const localMessage: AgentMessage = {
      id: `user_msg_${Date.now()}`,
      type: 'request',
      fromAgent: 'user',
      toAgent: targetAgent,
      roomId,
      content: {
        text: content,
        metadata: { source: 'user_interface' }
      },
      timestamp: Date.now()
    };

    handleAgentMessage(localMessage);
  }, [isConnected, handleAgentMessage]);

  // Send coordination request to agents
  const requestAssistance = useCallback((
    roomId: string, 
    type: CoordinationRequest['type'], 
    description: string,
    requirements: string[] = [],
    priority: CoordinationRequest['priority'] = 'medium'
  ) => {
    if (!socketRef.current || !isConnected) {
      console.warn('[AgentComm] Cannot request assistance - not connected to ElizaOS');
      return;
    }

    const request: CoordinationRequest = {
      type,
      priority,
      description,
      requirements,
      timeoutMs: 300000, // 5 minutes
      requestId: `req_${Date.now()}`,
      fromAgent: 'user'
    };

    // Send as a regular message that agents can interpret
    const requestMessage = `[COORDINATION REQUEST] ${description}\nType: ${type}\nPriority: ${priority}\nRequirements: ${requirements.join(', ')}`;
    
    sendMessage(roomId, requestMessage);

    // Add to active requests
    setActiveRequests(prev => new Map(prev).set(request.requestId, request));

    // Auto-timeout requests
    setTimeout(() => {
      setActiveRequests(prev => {
        const newMap = new Map(prev);
        newMap.delete(request.requestId);
        return newMap;
      });
    }, request.timeoutMs);

    console.log('[AgentComm] Requested assistance via ElizaOS:', request);
  }, [isConnected, sendMessage]);

  // Broadcast to all agents in a room
  const broadcastToRoom = useCallback((roomId: string, content: string) => {
    sendMessage(roomId, `[BROADCAST] ${content}`);
    console.log('[AgentComm] Broadcasted to room via ElizaOS:', roomId);
  }, [sendMessage]);

  // Respond to coordination request
  const respondToRequest = useCallback((requestId: string, response: string, data?: any) => {
    const request = activeRequests.get(requestId);
    if (!request) {
      console.warn('[AgentComm] Cannot respond to request - request not found');
      return;
    }

    const responseMessage = `[COORDINATION RESPONSE] ${response}\nRequest ID: ${requestId}${data ? `\nData: ${JSON.stringify(data)}` : ''}`;
    
    // Send response as a message
    sendMessage('general', responseMessage);

    // Remove from active requests
    setActiveRequests(prev => {
      const newMap = new Map(prev);
      newMap.delete(requestId);
      return newMap;
    });

    console.log('[AgentComm] Sent coordination response via ElizaOS:', { requestId, response });
  }, [activeRequests, sendMessage]);

  // Get messages for a specific room
  const getRoomMessages = useCallback((roomId: string): AgentMessage[] => {
    return messages.get(roomId) || [];
  }, [messages]);

  // Get latest message from any agent
  const getLatestMessage = useCallback((): AgentMessage | null => {
    let latest: AgentMessage | null = null;
    
    messages.forEach(roomMessages => {
      roomMessages.forEach(message => {
        if (!latest || message.timestamp > latest.timestamp) {
          latest = message;
        }
      });
    });

    return latest;
  }, [messages]);

  // Clear messages for a room
  const clearRoomMessages = useCallback((roomId: string) => {
    setMessages(prev => {
      const newMap = new Map(prev);
      newMap.delete(roomId);
      return newMap;
    });
  }, []);

  // Subscribe to log streaming
  const subscribeToLogs = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('subscribe_logs');
      console.log('[AgentComm] Subscribed to ElizaOS logs');
    }
  }, [isConnected]);

  // Unsubscribe from log streaming
  const unsubscribeFromLogs = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('unsubscribe_logs');
      console.log('[AgentComm] Unsubscribed from ElizaOS logs');
    }
  }, [isConnected]);

  return {
    isConnected,
    connectionError,
    messages: Array.from(messages.entries()),
    activeRequests: Array.from(activeRequests.values()),
    actions: {
      sendMessage,
      respondToRequest,
      broadcastToRoom,
      requestAssistance,
      getRoomMessages,
      getLatestMessage,
      clearRoomMessages,
      subscribeToLogs,
      unsubscribeFromLogs
    }
  };
}