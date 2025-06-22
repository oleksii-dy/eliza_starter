import { useMutation } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { UUID } from '@elizaos/api-client';
import { useToast } from '../use-toast';
import clientLogger from '@/lib/logger';

/**
 * Hook for audio transcription
 */
export function useTranscription() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ agentId, audio }: { agentId: UUID; audio: Blob | File }) => {
      return elizaClient.audio.transcribe(agentId, {
        audio,
        format: audio.type.split('/')[1] as any, // Extract format from MIME type
      });
    },
    onError: (error) => {
      clientLogger.error('Failed to transcribe audio:', error);
      showToast('Failed to transcribe audio', 'error');
    },
  });
}

/**
 * Hook for voice recording and transcription
 */
export function useVoiceRecording() {
  const transcription = useTranscription();
  
  const startRecording = async (): Promise<MediaRecorder> => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };
    
    mediaRecorder.start();
    
    // Store chunks reference on the recorder for later access
    (mediaRecorder as any)._chunks = chunks;
    
    return mediaRecorder;
  };
  
  const stopRecording = async (
    mediaRecorder: MediaRecorder, 
    agentId: UUID
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const chunks = (mediaRecorder as any)._chunks as Blob[];
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        try {
          const result = await transcription.mutateAsync({ agentId, audio: audioBlob });
          resolve(result.text);
        } catch (error) {
          reject(error);
        }
        
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.stop();
    });
  };
  
  return {
    startRecording,
    stopRecording,
    isTranscribing: transcription.isPending,
    error: transcription.error,
  };
}