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
export function useChannels(
  serverId: UUID | undefined,
  options: Partial<UseQueryOptions<{ channels: MessageChannel[] }>> = {}
) {
  return useQuery({
    queryKey: ['server-channels', serverId],
    queryFn: async () => {
      if (!serverId) return { channels: [] };
      const response = await elizaClient.messaging.getServerChannels(serverId);
      return response;
    },
    enabled: !!serverId,
    staleTime: STALE_TIMES.STANDARD,
    ...options,
  });
}

/**
 * Alias for useChannels for compatibility
 */
export const useServerChannels = useChannels;

/**
 * Hook to get channel details
 */
export function useChannelDetails(
  channelId: UUID | undefined,
  options: Partial<UseQueryOptions<MessageChannel | null>> = {}
) {
  return useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      if (!channelId) return null;
      const response = await elizaClient.messaging.getChannelDetails(channelId);
      return response;
    },
    enabled: !!channelId,
    staleTime: STALE_TIMES.STANDARD,
    ...options,
  });
}

/**
 * Alias for useChannelDetails
 */
export const useChannel = useChannelDetails;

/**
 * Hook to get channel participants
 */
export function useChannelParticipants(
  channelId: UUID | undefined,
  options: Partial<UseQueryOptions<{ participants: any[] }>> = {}
) {
  return useQuery({
    queryKey: ['channel-participants', channelId],
    queryFn: async () => {
      if (!channelId) return { participants: [] };
      // TODO: Implement when API endpoint is available
      return { participants: [] };
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