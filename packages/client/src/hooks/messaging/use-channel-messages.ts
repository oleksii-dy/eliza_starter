import { useState, useCallback, useEffect } from 'react';
import { elizaClient } from '@/lib/eliza-client';
import type { UUID, Content } from '@elizaos/api-client';
import type { ServerMessage } from '@/types';
import { getEntityId } from '@/lib/utils';
import { USER_NAME } from '@/constants';
import clientLogger from '@/lib/logger';

// Type for UI message list items
export type UiMessage = Content & {
  id: UUID;
  name: string;
  senderId: UUID;
  isAgent: boolean;
  createdAt: number;
  isLoading?: boolean;
  channelId: UUID;
  serverId?: UUID;
  prompt?: string;
};

/**
 * Custom hook to manage fetching and loading messages for a specific channel.
 */
export function useChannelMessages(
  channelId: UUID | undefined,
  initialServerId?: UUID | undefined
): {
  data: UiMessage[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  fetchNextPage: () => Promise<void>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  addMessage: (newMessage: UiMessage) => void;
  updateMessage: (messageId: string, updates: Partial<UiMessage>) => void;
  removeMessage: (messageId: string) => void;
  clearMessages: () => void;
} {
  const currentClientCentralId = getEntityId();

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [oldestMessageTimestamp, setOldestMessageTimestamp] = useState<number | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);
  const [internalIsLoading, setInternalIsLoading] = useState<boolean>(true);
  const [internalIsError, setInternalIsError] = useState<boolean>(false);
  const [internalError, setInternalError] = useState<unknown>(null);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);

  const transformServerMessageToUiMessage = useCallback(
    (sm: ServerMessage, serverIdToUse?: UUID): UiMessage => {
      const isAgent = sm.authorId !== currentClientCentralId;
      let timestamp = Date.now();

      if (typeof sm.createdAt === 'number') {
        timestamp = sm.createdAt;
      } else if (typeof sm.createdAt === 'string') {
        const parsedTs = Date.parse(sm.createdAt);
        if (!isNaN(parsedTs)) {
          timestamp = parsedTs;
        } else {
          clientLogger.warn(
            '[transformServerMessageToUiMessage] createdAt string was not directly parsable by Date.parse():',
            sm.createdAt,
            'for message id:',
            sm.id
          );
        }
      } else if (sm.createdAt) {
        try {
          const dateObjTimestamp = new Date(sm.createdAt as any).getTime();
          if (!isNaN(dateObjTimestamp)) {
            timestamp = dateObjTimestamp;
          }
        } catch (e) {
          clientLogger.warn(
            '[transformServerMessageToUiMessage] Could not process createdAt (unknown type):',
            sm.createdAt,
            'for message:',
            sm.id
          );
        }
      }

      return {
        id: sm.id,
        text: sm.content,
        name: isAgent
          ? sm.metadata?.agentName ||
            sm.metadata?.authorDisplayName ||
            sm.authorDisplayName ||
            'Agent'
          : USER_NAME,
        senderId: sm.authorId,
        isAgent: isAgent,
        createdAt: timestamp,
        attachments: sm.metadata?.attachments as any[],
        thought: isAgent ? sm.metadata?.thought : undefined,
        actions: isAgent ? sm.metadata?.actions : undefined,
        channelId: sm.channelId,
        serverId: serverIdToUse || sm.metadata?.serverId || sm.serverId || initialServerId,
        source: sm.sourceType,
        isLoading: false,
        prompt: isAgent ? sm.metadata?.prompt : undefined,
      };
    },
    [currentClientCentralId, initialServerId]
  );

  const fetchMessages = useCallback(
    async (beforeTimestamp?: number) => {
      if (!channelId) {
        setMessages([]);
        setInternalIsLoading(false);
        return;
      }
      if (!beforeTimestamp) {
        setInternalIsLoading(true);
      } else {
        setIsFetchingMore(true);
      }
      setInternalIsError(false);
      setInternalError(null);

      try {
        const response = await elizaClient.messaging.getChannelMessages(channelId, {
          limit: 30,
          before: beforeTimestamp,
        });

        const newUiMessages = response.messages.map((msg) =>
          transformServerMessageToUiMessage(msg, initialServerId || msg.metadata?.serverId)
        );

        setMessages((prev) => {
          const combined = beforeTimestamp ? [...newUiMessages, ...prev] : newUiMessages;
          const uniqueMessages = Array.from(
            new Map(combined.map((item) => [item.id, item])).values()
          );
          return uniqueMessages.sort((a, b) => a.createdAt - b.createdAt);
        });

        if (newUiMessages.length > 0) {
          const oldestFetched = Math.min(...newUiMessages.map((m) => m.createdAt));
          if (!beforeTimestamp || oldestFetched < (oldestMessageTimestamp || Infinity)) {
            setOldestMessageTimestamp(oldestFetched);
          }
        }
        setHasMoreMessages(newUiMessages.length >= 30);
      } catch (err) {
        setInternalIsError(true);
        setInternalError(err);
        clientLogger.error(`Failed to fetch messages for channel ${channelId}:`, err);
      } finally {
        setInternalIsLoading(false);
        setIsFetchingMore(false);
      }
    },
    [channelId, initialServerId, oldestMessageTimestamp, transformServerMessageToUiMessage]
  );

  useEffect(() => {
    if (channelId) {
      fetchMessages();
    }
  }, [channelId]);

  const fetchNextPage = useCallback(async () => {
    if (hasMoreMessages && !isFetchingMore && oldestMessageTimestamp) {
      await fetchMessages(oldestMessageTimestamp);
    }
  }, [hasMoreMessages, isFetchingMore, oldestMessageTimestamp, fetchMessages]);

  const addMessage = useCallback((newMessage: UiMessage) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === newMessage.id);
      if (exists) return prev;
      return [...prev, newMessage].sort((a, b) => a.createdAt - b.createdAt);
    });
  }, []);

  const updateMessage = useCallback((messageId: string, updates: Partial<UiMessage>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
    );
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    data: messages.length > 0 ? messages : undefined,
    isLoading: internalIsLoading,
    isError: internalIsError,
    error: internalError,
    fetchNextPage,
    hasNextPage: hasMoreMessages,
    isFetchingNextPage: isFetchingMore,
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
  };
}