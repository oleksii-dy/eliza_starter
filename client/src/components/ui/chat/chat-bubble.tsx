import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "sent" | "received";
}

const ChatBubble = forwardRef<HTMLDivElement, ChatBubbleProps>(
    ({ className, variant = "received", ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-4 py-3",
                    variant === "received"
                        ? "bg-card text-card-foreground"
                        : "ml-auto bg-primary text-primary-foreground",
                    className
                )}
                {...props}
            />
        );
    }
);
ChatBubble.displayName = "ChatBubble";

interface ChatBubbleMessageProps extends React.HTMLAttributes<HTMLDivElement> {
    isLoading?: boolean;
}

const ChatBubbleMessage = forwardRef<HTMLDivElement, ChatBubbleMessageProps>(
    ({ className, children, isLoading, ...props }, ref) => {
        if (isLoading) {
            return (
                <div
                    ref={ref}
                    className={cn("flex items-center gap-2", className)}
                    {...props}
                >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
                </div>
            );
        }

        return (
            <div
                ref={ref}
                className={cn("text-sm leading-relaxed", className)}
                {...props}
            >
                {children}
            </div>
        );
    }
);
ChatBubbleMessage.displayName = "ChatBubbleMessage";

interface ChatBubbleTimestampProps extends React.HTMLAttributes<HTMLDivElement> {
    timestamp: string;
}

const ChatBubbleTimestamp = forwardRef<HTMLDivElement, ChatBubbleTimestampProps>(
    ({ className, timestamp, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "text-[10px] uppercase text-muted-foreground",
                    className
                )}
                {...props}
            >
                {timestamp}
            </div>
        );
    }
);
ChatBubbleTimestamp.displayName = "ChatBubbleTimestamp";

export { ChatBubble, ChatBubbleMessage, ChatBubbleTimestamp };
