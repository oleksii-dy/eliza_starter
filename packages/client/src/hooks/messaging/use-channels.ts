import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { 
  MessageChannel, 
  ChannelCreateParams,
  GroupChannelCreateParams,
  DmChannelParams,
  UUID 
} from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';
import { useToast } from '../use-toast';
import clientLogger from '@/lib/logger';

/**
 * Hook to fetch channels for a server
 */
export function useServerChannels(
  serverId: UUID | undefined,
  options?: Omit<UseQueryOptions<{ channels: MessageChannel[] }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['server-channels', serverId],
    queryFn: async () => {
      if (!serverId) throw new Error('Server ID is required');
      return elizaClient.messaging.getServerChannels(serverId);
    },
    enabled: !!serverId,
    staleTime: STALE_TIMES.STANDARD,
    ...options,
  });
}

/**
 * Hook to get channel details
 */
export function useChannel(
  channelId: UUID | undefined,
  options?: Omit<UseQueryOptions<MessageChannel>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      if (!channelId) throw new Error('Channel ID is required');
      return elizaClient.messaging.getChannelDetails(channelId);
    },
    enabled: !!channelId,
    staleTime: STALE_TIMES.STANDARD,
    ...options,
  });
}

/**
 * Hook to create a channel
 */
export function useCreateChannel() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: ChannelCreateParams) => {
      return elizaClient.messaging.createChannel(params);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['server-channels', variables.serverId] });
      showToast('Channel created successfully', 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to create channel:', error);
      showToast('Failed to create channel', 'error');
    },
  });
}

/**
 * Hook to create or get a DM channel
 */
export function useGetOrCreateDmChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DmChannelParams) => {
      return elizaClient.messaging.getOrCreateDmChannel(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

/**
 * Hook to create a group channel
 */
export function useCreateGroupChannel() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: GroupChannelCreateParams) => {
      return elizaClient.messaging.createGroupChannel(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      showToast('Group channel created successfully', 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to create group channel:', error);
      showToast('Failed to create group channel', 'error');
    },
  });
}

/**
 * Hook to delete a channel
 */
export function useDeleteChannel() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (channelId: UUID) => {
      return elizaClient.messaging.deleteChannel(channelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['server-channels'] });
      showToast('Channel deleted successfully', 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to delete channel:', error);
      showToast('Failed to delete channel', 'error');
    },
  });
}