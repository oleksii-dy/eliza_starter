/**
 * Character Chat Page - Real-time chat interface with character
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Bot, User, Clock } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    cost?: number;
  };
}

interface Conversation {
  id: string;
  characterId: string;
  title?: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface Character {
  id: string;
  name: string;
  avatarUrl?: string;
  characterConfig: {
    name: string;
    bio: string;
    personality?: string;
  };
  visibility: string;
}

export default function CharacterChatPage() {
  const params = useParams();
  const conversationId = (params?.id as string) || '';

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [totalCost, setTotalCost] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchConversation = useCallback(async () => {
    try {
      const response = await fetch(`/api/characters/conversations/${conversationId}`);
      const data = await response.json();

      if (data.success) {
        setConversation(data.data);

        // Calculate total cost from messages
        const cost = data.data.messages.reduce((sum: number, msg: Message) => {
          return sum + (msg.metadata?.cost || 0);
        }, 0);
        setTotalCost(cost);

        // Fetch character details
        if (data.data.characterId) {
          fetchCharacter(data.data.characterId);
        }
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchConversation();
  }, [conversationId, fetchConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const fetchCharacter = async (characterId: string) => {
    try {
      const response = await fetch(`/api/characters/${characterId}`);
      const data = await response.json();

      if (data.success) {
        setCharacter(data.data);
      }
    } catch (error) {
      console.error('Error fetching character:', error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || sending) return;

    const messageContent = message.trim();
    setMessage('');
    setSending(true);

    try {
      const response = await fetch(`/api/characters/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageContent,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConversation(data.data.conversation);
        if (data.data.usage) {
          setTotalCost(prev => prev + data.data.usage.cost);
        }
      } else {
        // If AI response failed, still update with user message
        if (data.data?.conversation) {
          setConversation(data.data.conversation);
        }
        console.error('Failed to generate AI response:', data.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!conversation || !character) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Conversation not found</h1>
          <p className="text-gray-600 mt-2">The conversation you're looking for doesn't exist.</p>
          <Link href="/characters" className="mt-4 inline-block">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Characters
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/characters">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Avatar className="h-10 w-10">
              <AvatarImage src={character.avatarUrl} alt={character.name} />
              <AvatarFallback>
                {character.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-semibold">{character.name}</h1>
              <p className="text-sm text-gray-600 line-clamp-1">
                {character.characterConfig.bio}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              Total Cost: {formatCost(totalCost)}
            </Badge>
            <Badge variant={character.visibility === 'public' ? 'default' : 'secondary'}>
              {character.visibility}
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {conversation.messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Start a conversation with {character.name}
              </h3>
              <p className="text-gray-600">
                Type a message below to begin chatting.
              </p>
            </div>
          ) : (
            conversation.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                {msg.role === 'assistant' && (
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarImage src={character.avatarUrl} alt={character.name} />
                    <AvatarFallback>
                      {character.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border'
                    }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(msg.timestamp)}
                    </span>
                    {msg.metadata?.cost && (
                      <span>{formatCost(msg.metadata.cost)}</span>
                    )}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8 mt-1">
                <AvatarImage src={character.avatarUrl} alt={character.name} />
                <AvatarFallback>
                  {character.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="bg-white border rounded-lg px-4 py-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${character.name}...`}
              disabled={sending}
              className="flex-1"
              autoFocus
            />
            <Button
              onClick={sendMessage}
              disabled={!message.trim() || sending}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Powered by AI • Costs will be deducted from your organization's credits
          </div>
        </div>
      </div>
    </div>
  );
}