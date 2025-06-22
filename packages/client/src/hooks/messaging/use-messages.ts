import { useQuery, useInfiniteQuery, type UseQueryOptions, type UseInfiniteQueryOptions } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { Message, UUID } from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';

/**
 * Hook to fetch messages for a channel
 */
export function useChannelMessages(
  channelId: UUID | undefined,
  options?: {
    limit?: number;
  } & Omit<UseQueryOptions<{ messages: Message[] }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['channel-messages', channelId, options?.limit],
    queryFn: async () => {
      if (!channelId) throw new Error('Channel ID is required');
      return elizaClient.messaging.getChannelMessages(channelId, {
        limit: options?.limit || 50,
      });
    },
    enabled: !!channelId,
    staleTime: STALE_TIMES.FREQUENT,
    refetchInterval: STALE_TIMES.FREQUENT,
    ...options,
  });
}

/**
 * Hook to fetch messages with infinite scroll
 */
export function useInfiniteChannelMessages(
  channelId: UUID | undefined,
  options?: Omit<UseInfiniteQueryOptions<{ messages: Message[] }>, 'queryKey' | 'queryFn' | 'getNextPageParam'>
) {
  return useInfiniteQuery({
    queryKey: ['infinite-channel-messages', channelId],
    queryFn: async ({ pageParam = undefined }) => {
      if (!channelId) throw new Error('Channel ID is required');
      return elizaClient.messaging.getChannelMessages(channelId, {
        limit: 50,
        before: pageParam,
      });
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.messages || lastPage.messages.length < 50) return undefined;
      const oldestMessage = lastPage.messages[lastPage.messages.length - 1];
      return oldestMessage?.createdAt;
    },
    enabled: !!channelId,
    staleTime: STALE_TIMES.FREQUENT,
    ...options,
  });
}

/**
 * Hook to get a specific message
 */
export function useMessage(
  messageId: UUID | undefined,
  options?: Omit<UseQueryOptions<Message>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['message', messageId],
    queryFn: async () => {
      if (!messageId) throw new Error('Message ID is required');
      return elizaClient.messaging.getMessage(messageId);
    },
    enabled: !!messageId,
    staleTime: STALE_TIMES.STANDARD,
    ...options,
  });
}