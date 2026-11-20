"use client";

import { useQuery } from "@tanstack/react-query";
import { conversationPageSchema, type ConversationPage } from "@carepath/shared/contracts";
import { api } from "../../../lib/api/client";

/** One cache entry for the conversation list; the nav badge and the Messages screen both read it. */
export const conversationsKey = ["patient", "conversations"] as const;

/** Queue-style polling, 30 seconds (ADR-12). A thread that is open polls every 5 seconds instead. */
export const LIST_POLL_MS = 30_000;
export const THREAD_POLL_MS = 5_000;

const fetchConversations = () => api.get("/conversations?limit=25", conversationPageSchema);

export function useConversations(initialData?: ConversationPage) {
  return useQuery({
    queryKey: conversationsKey,
    queryFn: fetchConversations,
    refetchInterval: LIST_POLL_MS,
    ...(initialData ? { initialData } : {}),
  });
}

/** Unread total for the nav badge; the server's count from page load until the first poll answers. */
export function useUnreadTotal(initial: number, enabled = true): number {
  const q = useQuery({
    queryKey: conversationsKey,
    queryFn: fetchConversations,
    refetchInterval: LIST_POLL_MS,
    select: (d) => d.unreadTotal,
    enabled,
  });
  return q.data ?? initial;
}
