import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to detect container width and determine if labels should be shown
 * @param threshold - Width threshold in pixels (default: 768)
 * @returns Object with containerRef and showLabels boolean
 */
export const useContainerWidth = (threshold: number = 768) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLabels, setShowLabels] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setShowLabels(width >= threshold);
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.unobserve(container);
    };
  }, [threshold]);

  return { containerRef, showLabels };
};