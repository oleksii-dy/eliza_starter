import { useMutation } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { UUID } from '@elizaos/api-client';
import { useToast } from '../use-toast';
import clientLogger from '@/lib/logger';

/**
 * Hook to upload media for an agent
 */
export function useAgentMediaUpload() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ agentId, file }: { agentId: UUID; file: File }) => {
      return elizaClient.media.uploadAgentMedia(agentId, {
        file,
        filename: file.name,
        contentType: file.type,
      });
    },
    onSuccess: () => {
      showToast('Media uploaded successfully', 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to upload media:', error);
      showToast('Failed to upload media', 'error');
    },
  });
}

/**
 * Hook to upload files to a channel
 */
export function useChannelMediaUpload() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      channelId, 
      files,
      messageId 
    }: { 
      channelId: UUID; 
      files: File[];
      messageId?: UUID;
    }) => {
      return elizaClient.media.uploadChannelFiles(channelId, {
        files,
        messageId,
      });
    },
    onSuccess: (data) => {
      showToast(`Uploaded ${data.uploads.length} file(s)`, 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to upload files:', error);
      showToast('Failed to upload files', 'error');
    },
  });
}