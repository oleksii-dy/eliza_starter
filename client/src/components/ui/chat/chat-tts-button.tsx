import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { UUID } from "@elizaos/core";
import { useMutation } from "@tanstack/react-query";
import { Volume2, VolumeX } from "lucide-react";
import { useState, useRef } from "react";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ChatTtsButtonProps {
    agentId: UUID;
    text: string;
}

export default function ChatTtsButton({ agentId, text }: ChatTtsButtonProps) {
    const { toast } = useToast();
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const ttsQuery = useMutation({
        mutationKey: ["tts", agentId, text],
        mutationFn: () => apiClient.tts(agentId, text),
        onSuccess: (audioBlob: Blob) => {
            if (audioRef.current) {
                const url = URL.createObjectURL(audioBlob);
                audioRef.current.src = url;
                audioRef.current.play();
                setIsPlaying(true);
            }
        },
        onError: (error: Error) => {
            toast({
                variant: "destructive",
                title: "Text-to-speech failed",
                description: error.message,
            });
        },
    });

    const handlePlayPause = () => {
        if (!audioRef.current?.src && !isPlaying) {
            ttsQuery.mutate();
        } else if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play();
                setIsPlaying(true);
            }
        }
    };

    return (
        <>
            <audio
                ref={audioRef}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
            />
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "size-6 hover:text-primary transition-colors duration-200",
                            isPlaying && "text-primary"
                        )}
                        onClick={handlePlayPause}
                        disabled={ttsQuery.isPending}
                    >
                        {isPlaying ? (
                            <Volume2 className="size-3.5 animate-pulse" />
                        ) : (
                            <VolumeX className="size-3.5" />
                        )}
                        <span className="sr-only">
                            {isPlaying ? "Stop" : "Play"} text-to-speech
                        </span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>{isPlaying ? "Stop" : "Play"} text-to-speech</p>
                </TooltipContent>
            </Tooltip>
        </>
    );
}
