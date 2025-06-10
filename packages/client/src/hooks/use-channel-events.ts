import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SocketIOManager } from '@/lib/socketio-manager';
import type { ChannelDeletedData, ChannelUpdatedData, ChannelClearedData, MessageDeletedData } from '@/lib/socketio-manager';
import { getEntityId } from '@/lib/utils';
import clientLogger from '@/lib/logger';

/**
 * Hook to handle real-time channel events and invalidate appropriate query caches
 */
export function useChannelEvents() {
  const queryClient = useQueryClient();
  const socketIOManager = SocketIOManager.getInstance();
  const currentUserId = getEntityId();

  useEffect(() => {
    // Handle channel deletion events
    const channelDeletedSub = socketIOManager.evtChannelDeleted.attach((data: ChannelDeletedData) => {
      clientLogger.info('[useChannelEvents] Channel deleted event received:', data);
      
      // Invalidate all channel-related queries
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      
      // Invalidate specific server channel queries (we don't know the serverId, so invalidate all)
      queryClient.invalidateQueries({ queryKey: ['channels'], type: 'all' });
      
      // Invalidate DM channel queries for all agents (since we don't know which agent this was for)
      queryClient.invalidateQueries({ queryKey: ['dmChannels'] });
      
      // Remove any cached channel details
      queryClient.removeQueries({ queryKey: ['channelDetails', data.channelId] });
      queryClient.removeQueries({ queryKey: ['channelParticipants', data.channelId] });
      
      // Clear any cached messages for this channel
      queryClient.removeQueries({ queryKey: ['messages', data.channelId] });
    });

    // Handle channel update events
    const channelUpdatedSub = socketIOManager.evtChannelUpdated.attach((data: ChannelUpdatedData) => {
      clientLogger.info('[useChannelEvents] Channel updated event received:', data);
      
      // Invalidate channel queries to reflect the updates
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channelDetails', data.channelId] });
      queryClient.invalidateQueries({ queryKey: ['channelParticipants', data.channelId] });
      
      // Invalidate DM channels if this was a DM channel update
      queryClient.invalidateQueries({ queryKey: ['dmChannels'] });
    });

    // Handle channel cleared events
    const channelClearedSub = socketIOManager.evtChannelCleared.attach((data: ChannelClearedData) => {
      clientLogger.info('[useChannelEvents] Channel cleared event received:', data);
      
      // Clear the messages cache for this channel
      queryClient.setQueryData(['messages', data.channelId], []);
      queryClient.invalidateQueries({ queryKey: ['messages', data.channelId] });
    });

    // Handle message deleted events
    const messageDeletedSub = socketIOManager.evtMessageDeleted.attach((data: MessageDeletedData) => {
      clientLogger.info('[useChannelEvents] Message deleted event received:', data);
      
      // Invalidate messages for this channel
      queryClient.invalidateQueries({ queryKey: ['messages', data.channelId] });
    });

    // Cleanup subscriptions on unmount
    return () => {
      channelDeletedSub?.detach();
      channelUpdatedSub?.detach();
      channelClearedSub?.detach();
      messageDeletedSub?.detach();
    };
  }, [queryClient, socketIOManager, currentUserId]);
} 