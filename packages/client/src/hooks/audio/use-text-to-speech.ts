import { useMutation } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { UUID } from '@elizaos/api-client';
import clientLogger from '@/lib/logger';

/**
 * Hook for text-to-speech generation
 */
export function useTextToSpeech() {
  return useMutation({
    mutationFn: async ({ agentId, text }: { agentId: UUID; text: string }) => {
      const result = await elizaClient.audio.generateSpeech(agentId, {
        text,
      });
      
      // Convert the audio data to a blob URL for playback
      const audioBlob = new Blob([Buffer.from(result.audio, 'base64')], { 
        type: `audio/${result.format}` 
      });
      
      return {
        url: URL.createObjectURL(audioBlob),
        blob: audioBlob,
        format: result.format,
      };
    },
    onError: (error) => {
      clientLogger.error('Failed to generate speech:', error);
    },
  });
}

/**
 * Hook to play text as speech
 */
export function usePlayTextAsSpeech() {
  const tts = useTextToSpeech();
  
  const play = async (agentId: UUID, text: string) => {
    try {
      const result = await tts.mutateAsync({ agentId, text });
      
      const audio = new Audio(result.url);
      audio.play();
      
      // Clean up the blob URL when done
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(result.url);
      });
      
      return audio;
    } catch (error) {
      clientLogger.error('Failed to play text as speech:', error);
      throw error;
    }
  };
  
  return {
    play,
    isLoading: tts.isPending,
    error: tts.error,
  };
}