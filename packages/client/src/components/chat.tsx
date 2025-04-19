import { Button } from '@/components/ui/button';
import {
  ChatBubble,
  ChatBubbleMessage,
  ChatBubbleTimestamp,
} from '@/components/ui/chat/chat-bubble';
import { ChatInput } from '@/components/ui/chat/chat-input';
import { ChatMessageList } from '@/components/ui/chat/chat-message-list';
import { USER_NAME } from '@/constants';
import { useMessages } from '@/hooks/use-query-hooks';
import socketIOManager from '@/lib/socketio-manager';
import { cn, getEntityId, moment, randomUUID } from '@/lib/utils';
import { WorldManager } from '@/lib/world-manager';
import type { IAttachment } from '@/types';
import type { Agent, Content, UUID } from '@elizaos/core';
import { AgentStatus } from '@elizaos/core';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible';
import clientLogger from '@/lib/logger';

import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  File,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  PanelRight,
  Paperclip,
  Send,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AIWriter from 'react-aiwriter';
import { AudioRecorder } from './audio-recorder';
import CopyButton from './copy-button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import ChatTtsButton from './ui/chat/chat-tts-button';
import { useAutoScroll } from './ui/chat/hooks/useAutoScroll';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

import { CHAT_SOURCE } from '@/constants';
import { Evt } from 'evt';

type ExtraContentFields = {
  name: string;
  createdAt: number;
  isLoading?: boolean;
};

type ContentWithUser = Content & ExtraContentFields;

// Helper function to determine file icon based on file type
function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType.startsWith('audio/')) return FileAudio;
  if (fileType.startsWith('video/')) return FileVideo;
  if (fileType.includes('text')) return FileText;
  return File;
}

const MemoizedMessageContent = React.memo(MessageContent);

export function MessageContent({
  message,
  agentId,
  shouldAnimate,
}: {
  message: ContentWithUser;
  agentId: UUID;
  shouldAnimate: boolean;
}) {
  return (
    <div className="flex flex-col w-full">
      <ChatBubbleMessage
        isLoading={message.isLoading}
        {...(message.name === USER_NAME ? { variant: 'sent' } : {})}
        {...(!message.text && !message.attachments?.length
          ? { className: 'bg-transparent p-0' }
          : {})}
      >
        {message.name !== USER_NAME && (
          <div className="w-full">
            {message.text && message.thought && (
              <Collapsible className="mb-1">
                <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                  <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                  Thought Process
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-5 pt-1">
                  <Badge variant="outline" className="text-xs">
                    {message.thought}
                  </Badge>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        <div className="py-2">
          {message.name === USER_NAME ? (
            message.text
          ) : shouldAnimate ? (
            <AIWriter>{message.text}</AIWriter>
          ) : (
            message.text
          )}
        </div>
        {!message.text &&
          message.thought &&
          (message.name === USER_NAME ? (
            message.thought
          ) : shouldAnimate ? (
            <AIWriter>
              <span className="italic text-muted-foreground">{message.thought}</span>
            </AIWriter>
          ) : (
            <span className="italic text-muted-foreground">{message.thought}</span>
          ))}

        {message.attachments?.map((attachment: IAttachment) => (
          <div className="flex flex-col gap-1" key={`${attachment.url}-${attachment.title}`}>
            <img
              alt="attachment"
              src={attachment.url}
              width="100%"
              height="100%"
              className="w-64 rounded-md"
            />
            <div className="flex items-center justify-between gap-4">
              <span />
              <span />
            </div>
          </div>
        ))}
        {(message.text || message.attachments?.length > 0) && message.createdAt && (
          <ChatBubbleTimestamp timestamp={moment(message.createdAt).format('LT')} />
        )}
      </ChatBubbleMessage>
      {message.name !== USER_NAME && (
        <div className="flex justify-between items-end w-full">
          <div>
            {message.text && !message.isLoading ? (
              <div className="flex items-center gap-2">
                <CopyButton text={message.text} />
                <ChatTtsButton agentId={agentId} text={message.text} />
              </div>
            ) : (
              <div />
            )}
          </div>
          <div>
            {message.text && message.actions && (
              <Badge variant="outline" className="text-sm">
                {message.actions}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page({
  agentId,
  worldId,
  agentData,
  showDetails,
  toggleDetails,
}: {
  agentId: UUID;
  worldId: UUID;
  agentData: Agent;
  showDetails: boolean;
  toggleDetails: () => void;
}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [input, setInput] = useState('');
  const [messageProcessing, setMessageProcessing] = useState<boolean>(false);
  const [inputDisabled, setInputDisabled] = useState<boolean>(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();

  const entityId = getEntityId();
  const roomId = WorldManager.generateRoomId(agentId);

  const { data: messages = [] } = useMessages(agentId, roomId);

  // The imported socketIOManager is already an instance
  const animatedMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Initialize Socket.io connection once with our entity ID
    socketIOManager.initialize(entityId, [agentId]);

    // Join the room for this agent
    socketIOManager.joinRoom(roomId);

    console.log(`[Chat] Joined room ${roomId} with entityId ${entityId}`);

    // Setup a reconnection check
    const checkConnection = () => {
      if (!socketIOManager.isConnected) {
        console.log('[Chat] Detected socket disconnect, attempting to reconnect...');
        // Don't reinitialize here, just join the room
        socketIOManager.joinRoom(roomId);
      }
    };

    // Check connection status periodically (less frequently to avoid excessive logs)
    const connectionInterval = setInterval(checkConnection, 30000);

    const handleMessageBroadcasting = (data: ContentWithUser) => {
      console.log('[Chat] Received message broadcast:', data);

      // Skip messages that don't have required content
      if (!data) {
        console.warn('[Chat] Received empty or invalid message data:', data);
        return;
      }

      // Skip messages not for this room
      if (data.roomId !== roomId) {
        console.log(
          `[Chat] Ignoring message for different room: ${data.roomId}, we're in ${roomId}`
        );
        return;
      }

      // Check if the message is from the current user or from the agent
      const isCurrentUser = data.senderId === entityId;

      // Build a proper ContentWithUser object that matches what the messages query expects
      const newMessage: ContentWithUser = {
        ...data,
        // Set the correct name based on who sent the message
        name: isCurrentUser ? USER_NAME : (data.senderName as string),
        createdAt: data.createdAt || Date.now(),
        isLoading: false,
      };

      console.log(`[Chat] Adding new message to UI from ${newMessage.name}:`, newMessage);

      // Update the message list without triggering a re-render cascade
      queryClient.setQueryData(
        ['messages', agentId, roomId, worldId],
        (old: ContentWithUser[] = []) => {
          console.log('[Chat] Current messages:', old?.length || 0);

          // Check for duplicates more carefully, handling both local echoes and server responses
          const isDuplicate = old.some((msg) => {
            // First check if this is a duplicate by matching IDs
            if (msg.id === newMessage.id) {
              return true;
            }

            // Then check by content and timing for a broader match
            const sameContent = msg.text === newMessage.text;
            const sameSender = msg.name === newMessage.name;
            const closeTimestamp =
              Math.abs((msg.createdAt || 0) - (newMessage.createdAt || 0)) < 5000; // Within 5 seconds

            // Local echo check - if this is a server response for a message we already showed locally
            const isServerResponse =
              !data._isLocalEcho && sameContent && sameSender && closeTimestamp;

            return isServerResponse;
          });

          if (isDuplicate) {
            console.log('[Chat] Skipping duplicate message');
            return old;
          }

          // Add animation ID for immediate feedback
          const newMessageId =
            typeof newMessage.id === 'string' ? newMessage.id : String(newMessage.id);
          animatedMessageIdRef.current = newMessageId;

          return [...old, newMessage];
        }
      );
    };

    const handleMessageComplete = (data: any) => {
      if (data.roomId === roomId) {
        setMessageProcessing(false);
      }
    };

    // Add listener for message broadcasts
    console.log('[Chat] Adding messageBroadcast listener');
    const msgHandler = socketIOManager.evtMessageBroadcast.attach((data) => [
      data as unknown as ContentWithUser,
    ]);
    const completeHandler = socketIOManager.evtMessageComplete.attach((data) => [
      data as unknown as any,
    ]);

    msgHandler.attach(handleMessageBroadcasting);
    completeHandler.attach(handleMessageComplete);

    return () => {
      // When leaving this chat, leave the room but don't disconnect
      console.log(`[Chat] Leaving room ${roomId}`);
      socketIOManager.leaveRoom(roomId);
      msgHandler.detach();
      completeHandler.detach();
      // Clear the reconnection interval
      clearInterval(connectionInterval);
    };
  }, [roomId, agentId, entityId, queryClient, worldId]);

  // Handle control messages
  useEffect(() => {
    // Function to handle control messages (enable/disable input)
    const handleControlMessage = (data: any) => {
      // Extract action and roomId with type safety
      const { action, roomId: messageRoomId } = data || {};
      const isInputControl = action === 'enable_input' || action === 'disable_input';

      // Check if this is a valid input control message for this room
      if (isInputControl && messageRoomId === roomId) {
        clientLogger.info(`[Chat] Received control message: ${action} for room ${messageRoomId}`);

        if (action === 'disable_input') {
          setInputDisabled(true);
          setMessageProcessing(true);
        } else if (action === 'enable_input') {
          setInputDisabled(false);
          setMessageProcessing(false);
        }
      }
    };

    // Subscribe to control messages
    socketIOManager.on('controlMessage', handleControlMessage);

    // Cleanup subscription on unmount
    return () => {
      socketIOManager.off('controlMessage', handleControlMessage);
    };
  }, [roomId]);

  // Use a stable ID for refs to avoid excessive updates
  const scrollRefId = useRef(`scroll-${Math.random().toString(36).substring(2, 9)}`).current;

  const { scrollRef, isAtBottom, scrollToBottom, disableAutoScroll } = useAutoScroll({
    smooth: true,
  });

  // Use a ref to track the previous message count to avoid excessive scrolling
  const prevMessageCountRef = useRef(0);

  // Update scroll without creating a circular dependency
  const safeScrollToBottom = useCallback(() => {
    // Add a small delay to avoid render loops
    setTimeout(() => {
      scrollToBottom();
    }, 0);
  }, []);

  useEffect(() => {
    // Only scroll if the message count has changed
    if (messages.length !== prevMessageCountRef.current) {
      console.log(`[Chat][${scrollRefId}] Messages updated, scrolling to bottom`);
      safeScrollToBottom();
      prevMessageCountRef.current = messages.length;
    }
  }, [messages.length, safeScrollToBottom, scrollRefId]);

  useEffect(() => {
    safeScrollToBottom();
  }, [safeScrollToBottom]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (e.nativeEvent.isComposing) return;
      handleSendMessage(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((!input && selectedFiles.length === 0) || messageProcessing) return;

    const messageId = randomUUID();

    // Convert selected files to attachments if any
    const attachments =
      selectedFiles.length > 0
        ? selectedFiles.map((file) => ({
            url: URL.createObjectURL(file),
            title: file.name,
            type: file.type,
          }))
        : undefined;

    // No longer needed - socketIOManager will handle the local update
    // Instead, directly send the message to the server which will handle both local and remote updates
    console.log('[Chat] Sending message via socketIOManager:', {
      messageId,
      text: input,
      fileCount: selectedFiles.length,
    });

    // Send the message to the server/agent
    socketIOManager.sendMessage(input, roomId, CHAT_SOURCE, selectedFiles);

    setMessageProcessing(true);
    setSelectedFiles([]);
    setInput('');
    formRef.current?.reset();
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length) {
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
      if (imageFiles.length) {
        setSelectedFiles((prev) => [...prev, ...imageFiles]);
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveAllFiles = () => {
    setSelectedFiles([]);
  };

  return (
    <div
      className={`flex flex-col w-full h-screen p-4 ${showDetails ? 'col-span-3' : 'col-span-4'}`}
    >
      {/* Agent Header */}
      <div className="flex items-center justify-between mb-4 p-3 bg-card rounded-lg border">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 border rounded-full">
            <AvatarImage
              src={agentData?.settings?.avatar ? agentData?.settings?.avatar : '/elizaos-icon.png'}
            />
            <AvatarFallback>{agentData?.name?.[0] || 'A'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg">{agentData?.name || 'Agent'}</h2>
              {agentData?.status === AgentStatus.ACTIVE ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="size-2.5 rounded-full bg-green-500 ring-2 ring-green-500/20 animate-pulse" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Agent is active</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="size-2.5 rounded-full bg-gray-300 ring-2 ring-gray-300/20" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Agent is inactive</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {agentData?.bio && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {Array.isArray(agentData.bio) ? agentData.bio[0] : agentData.bio}
              </p>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleDetails}
          className={cn('gap-1.5', showDetails && 'bg-secondary')}
        >
          <PanelRight className="size-4" />
        </Button>
      </div>

      <div className="flex flex-row w-full overflow-y-auto grow gap-4">
        {/* Main Chat Area */}
        <div className={cn('flex flex-col transition-all duration-300 w-full')}>
          {/* Chat Messages */}
          <ChatMessageList
            scrollRef={scrollRef}
            isAtBottom={isAtBottom}
            scrollToBottom={safeScrollToBottom}
            disableAutoScroll={disableAutoScroll}
          >
            {messages.map((message: ContentWithUser, index: number) => {
              const isUser = message.name === USER_NAME;
              const shouldAnimate =
                index === messages.length - 1 &&
                message.name !== USER_NAME &&
                message.id === animatedMessageIdRef.current;
              return (
                <div
                  key={`${message.id as string}-${message.createdAt}`}
                  className={cn(
                    'flex flex-col gap-1 p-1',
                    isUser ? 'justify-end' : 'justify-start'
                  )}
                >
                  <ChatBubble
                    variant={isUser ? 'sent' : 'received'}
                    className={`flex flex-row items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}
                  >
                    {!isUser && (message.text || message.attachments?.length > 0) && (
                      <Avatar className="size-8 border rounded-full select-none mb-2">
                        <AvatarImage
                          src={
                            isUser
                              ? '/user-icon.png'
                              : agentData?.settings?.avatar
                                ? agentData?.settings?.avatar
                                : '/elizaos-icon.png'
                          }
                        />
                        <AvatarFallback>{agentData?.name?.[0] || 'A'}</AvatarFallback>
                      </Avatar>
                    )}

                    <MemoizedMessageContent
                      message={message}
                      agentId={agentId}
                      shouldAnimate={shouldAnimate}
                    />
                  </ChatBubble>
                </div>
              );
            })}
          </ChatMessageList>

          {/* Chat Input */}
          <div className="px-4 pb-4 mt-auto">
            <form
              ref={formRef}
              onSubmit={handleSendMessage}
              className="relative rounded-md border bg-card"
            >
              {selectedFiles.length > 0 && (
                <div className="p-3 flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => {
                    const FileIcon = getFileIcon(file.type);
                    return (
                      <div key={index} className="relative rounded-md border p-2">
                        <Button
                          onClick={() => handleRemoveFile(index)}
                          className="absolute -right-2 -top-2 size-[22px] ring-2 ring-background"
                          variant="outline"
                          size="icon"
                        >
                          <X className="size-3" />
                        </Button>
                        {file.type.startsWith('image/') ? (
                          <img
                            alt={file.name}
                            src={URL.createObjectURL(file)}
                            height="100%"
                            width="100%"
                            className="aspect-square object-contain w-16"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center w-16 h-16">
                            <FileIcon className="size-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate max-w-16 mt-1">
                              {file.name}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {selectedFiles.length > 1 && (
                    <Button
                      onClick={handleRemoveAllFiles}
                      variant="ghost"
                      size="sm"
                      className="h-8 mt-2"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              )}
              <ChatInput
                ref={inputRef}
                onKeyDown={handleKeyDown}
                value={input}
                onChange={({ target }) => setInput(target.value)}
                placeholder={
                  inputDisabled
                    ? 'Input disabled while agent is processing...'
                    : 'Type your message here...'
                }
                className="min-h-12 resize-none rounded-md bg-card border-0 p-3 shadow-none focus-visible:ring-0"
                disabled={inputDisabled || messageProcessing}
              />
              <div className="flex items-center p-3 pt-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.click();
                          }
                        }}
                      >
                        <Paperclip className="size-4" />
                        <span className="sr-only">Attach file</span>
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                        multiple
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Attach file</p>
                  </TooltipContent>
                </Tooltip>
                <AudioRecorder
                  agentId={agentId}
                  onChange={(newInput: string) => setInput(newInput)}
                />
                <Button
                  disabled={messageProcessing || (!input.trim() && selectedFiles.length === 0)}
                  type="submit"
                  size="sm"
                  className="ml-auto gap-1.5 h-[30px]"
                >
                  {messageProcessing ? (
                    <div className="flex gap-0.5 items-center justify-center">
                      <span className="w-[4px] h-[4px] bg-gray-500 rounded-full animate-bounce [animation-delay:0s]" />
                      <span className="w-[4px] h-[4px] bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-[4px] h-[4px] bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  ) : (
                    <Send className="size-3.5" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
