import { RefObject, useEffect } from "react";

export function useAutoScroll(ref: RefObject<HTMLDivElement>) {
    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new MutationObserver(() => {
            element.scrollTop = element.scrollHeight;
        });

        observer.observe(element, {
            childList: true,
            subtree: true
        });

        return () => observer.disconnect();
    }, [ref]);
}
