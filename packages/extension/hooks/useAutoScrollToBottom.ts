import { useRef, useEffect } from "react";

/**
 * useAutoScrollToBottom
 * Returns a ref for a scrollable container and auto-scrolls to bottom when the dependency changes.
 * @param dep Typically the length of the messages array
 */
export function useAutoScrollToBottom(dep: any) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [dep]);
  return scrollRef;
}
