"use client";

import NextLink from "next/link";
import { messagesNotSentText } from "@carepath/shared";
import type { ConversationPage } from "@carepath/shared/contracts";
import { EmptyState, Icon } from "@carepath/ui";
import { useConversations } from "../_lib/use-conversations";
import { formatInstantDateTime } from "../_lib/format";

/**
 * The patient's threads, newest first, with unread shown in words and a count (REQ-MSG-01). The
 * list follows the 30 second poll, so a reply that arrives while it is open shows up without a reload.
 */
export function ConversationList({
  initial,
  timezone,
}: {
  initial: ConversationPage;
  timezone: string;
}) {
  const { data } = useConversations(initial);
  const page = data ?? initial;

  if (page.items.length === 0) {
    return (
      <EmptyState icon="message" title="No conversations yet">
        Your conversation with your care team starts when a therapist is assigned to you. It will
        appear here.
      </EmptyState>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {page.items.map((c) => {
        const people = c.participants
          .filter((p) => p.role !== "patient")
          .map((p) => `${p.name}, ${p.roleLabel.toLowerCase()}`);
        return (
          <li key={c.id}>
            <NextLink
              href={`/messages/${c.id}`}
              className="flex items-start gap-3 rounded-container border border-border bg-surface p-4 hover:bg-surface-sunken focus-visible:focus-ring"
            >
              <Icon
                name="message"
                size={22}
                className={
                  c.unreadCount > 0 ? "mt-1 shrink-0 text-primary" : "mt-1 shrink-0 text-ink-muted"
                }
              />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span
                    className={
                      c.unreadCount > 0
                        ? "text-body font-semibold text-ink"
                        : "text-body font-medium text-ink"
                    }
                  >
                    {c.subject}
                  </span>
                  {c.lastMessageAt ? (
                    <span className="text-small text-ink-muted">
                      {formatInstantDateTime(c.lastMessageAt, timezone)}
                    </span>
                  ) : null}
                </span>
                <span className="text-small text-ink-muted">With {people.join("; ")}</span>
                {c.preview ? (
                  <span className="line-clamp-2 text-body text-ink">{c.preview}</span>
                ) : (
                  <span className="text-body text-ink-muted">No messages yet.</span>
                )}
                {c.unreadCount > 0 ? (
                  <span className="flex items-center gap-1.5 text-small font-semibold text-primary">
                    <Icon name="dot" size={14} />
                    {c.unreadCount === 1 ? "1 unread message" : `${c.unreadCount} unread messages`}
                  </span>
                ) : null}
                {c.failedCount > 0 ? (
                  <span className="flex items-center gap-1.5 text-small font-semibold text-error-ink">
                    <Icon name="alert-circle" size={14} />
                    {messagesNotSentText(c.failedCount)}
                  </span>
                ) : null}
              </span>
            </NextLink>
          </li>
        );
      })}
    </ul>
  );
}
