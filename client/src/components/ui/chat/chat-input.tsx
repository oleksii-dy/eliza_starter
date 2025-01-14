import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const ChatInput = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                ref={ref}
                className={cn(
                    "flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200",
                    "min-h-[80px] resize-none",
                    className
                )}
                {...props}
            />
        );
    }
);
ChatInput.displayName = "ChatInput";

export { ChatInput };
