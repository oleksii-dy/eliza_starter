import { useMutation, useQueryClient } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { Message, UUID } from '@elizaos/api-client';
import { useToast } from '../use-toast';
import clientLogger from '@/lib/logger';

/**
 * Hook to send a message to a channel
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, content, metadata }: { 
      channelId: UUID; 
      content: string;
      metadata?: Record<string, any>;
    }) => {
      return elizaClient.messaging.postMessage(channelId, content, metadata);
    },
    onSuccess: (data, variables) => {
      // Optimistically update the messages query
      queryClient.setQueryData(
        ['channel-messages', variables.channelId],
        (old: { messages: Message[] } | undefined) => {
          if (!old) return { messages: [data] };
          return { messages: [data, ...old.messages] };
        }
      );
      
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['channel-messages', variables.channelId] });
    },
    onError: (error) => {
      clientLogger.error('Failed to send message:', error);
    },
  });
}

/**
 * Hook to delete a message
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ messageId, channelId }: { messageId: UUID; channelId: UUID }) => {
      return elizaClient.messaging.deleteMessage(messageId);
    },
    onSuccess: (data, variables) => {
      // Remove message from cache
      queryClient.setQueryData(
        ['channel-messages', variables.channelId],
        (old: { messages: Message[] } | undefined) => {
          if (!old) return old;
          return { 
            messages: old.messages.filter(msg => msg.id !== variables.messageId) 
          };
        }
      );
      
      queryClient.invalidateQueries({ queryKey: ['channel-messages', variables.channelId] });
      showToast('Message deleted', 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to delete message:', error);
      showToast('Failed to delete message', 'error');
    },
  });
}

/**
 * Hook to update a message
 */
export function useUpdateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, content, channelId }: { 
      messageId: UUID; 
      content: string;
      channelId: UUID;
    }) => {
      return elizaClient.messaging.updateMessage(messageId, content);
    },
    onSuccess: (data, variables) => {
      // Update message in cache
      queryClient.setQueryData(
        ['channel-messages', variables.channelId],
        (old: { messages: Message[] } | undefined) => {
          if (!old) return old;
          return { 
            messages: old.messages.map(msg => 
              msg.id === variables.messageId ? data : msg
            ) 
          };
        }
      );
      
      queryClient.invalidateQueries({ queryKey: ['channel-messages', variables.channelId] });
      queryClient.invalidateQueries({ queryKey: ['message', variables.messageId] });
    },
    onError: (error) => {
      clientLogger.error('Failed to update message:', error);
    },
  });
}

/**
 * Hook to clear channel history
 */
export function useClearChannelHistory() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (channelId: UUID) => {
      return elizaClient.messaging.clearChannelHistory(channelId);
    },
    onSuccess: (data, channelId) => {
      queryClient.setQueryData(['channel-messages', channelId], { messages: [] });
      queryClient.invalidateQueries({ queryKey: ['channel-messages', channelId] });
      showToast(`Cleared ${data.deleted} messages`, 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to clear channel history:', error);
      showToast('Failed to clear channel history', 'error');
    },
  });
}