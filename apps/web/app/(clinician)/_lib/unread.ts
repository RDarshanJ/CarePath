"use client";

import { useQuery } from "@tanstack/react-query";
import { keys, reads } from "./queries";

/**
 * Unread messages across the clinician's conversations, for the Messages item in the side rail. It
 * shares the conversation list's query key, so the list and the rail never disagree, and it polls
 * at the list's pace (ADR-12). Undefined until known or when the list cannot be read.
 */
export function useUnreadTotal(): number | undefined {
  const list = useQuery({
    queryKey: keys.conversations,
    queryFn: reads.conversations,
    refetchInterval: 15_000,
    retry: false,
  });
  return list.data?.unreadTotal;
}
