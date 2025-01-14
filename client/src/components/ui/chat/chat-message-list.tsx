import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import { useAutoScroll } from "./hooks/useAutoScroll";

const ChatMessageList = forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    useAutoScroll(ref as React.RefObject<HTMLDivElement>);

    return (
        <div
            ref={ref}
            className={cn(
                "flex flex-col gap-4 overflow-y-auto p-4 scroll-smooth",
                "scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent hover:scrollbar-thumb-primary/20",
                "bg-gradient-to-b from-background/50 to-background",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
});
ChatMessageList.displayName = "ChatMessageList";

export { ChatMessageList };
