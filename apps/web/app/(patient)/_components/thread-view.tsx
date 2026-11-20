"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MESSAGE_BODY_MAX,
  messagePageSchema,
  messageSchema,
  conversationSummarySchema,
  type Message,
  type MessagePage,
} from "@carepath/shared/contracts";
import { Banner, Button, Field, Heading, Icon, Textarea, cx } from "@carepath/ui";
import { api } from "../../../lib/api/client";
import { TextLink } from "./text-link";
import { formatInstantDateTime } from "../_lib/format";
import { THREAD_POLL_MS, conversationsKey } from "../_lib/use-conversations";

/**
 * One care-team thread (REQ-MSG-01 to 03). Every message carries its sender's name and role
 * (REQ-MSG-02). The composer shows the clinic's reply-time text and the fixed emergency notice, both
 * delivered with the page by the API. The thread polls every 5 seconds while it is open (ADR-12) and
 * moves the read marker when it shows something new, so opening it clears its unread count (AC-E9).
 * A message is Sending (queued), Sent or Not sent, and a failed one is retried in place.
 */
export function ThreadView({
  conversationId,
  initial,
  pageSize,
  timezone,
}: {
  conversationId: string;
  initial: MessagePage;
  pageSize: number;
  timezone: string;
}) {
  const qc = useQueryClient();
  const key = useMemo(() => ["patient", "thread", conversationId] as const, [conversationId]);
  const { data = initial } = useQuery({
    queryKey: key,
    queryFn: () =>
      api.get(`/conversations/${conversationId}/messages?limit=${pageSize}`, messagePageSchema),
    initialData: initial,
    refetchInterval: THREAD_POLL_MS,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });

  const [older, setOlder] = useState<Message[]>([]);
  const [olderCursor, setOlderCursor] = useState<string | null | undefined>(undefined);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [retrying, setRetrying] = useState<Set<string>>(new Set());
  const [retryError, setRetryError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const marking = useRef(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const cursor = olderCursor === undefined ? data.nextCursor : olderCursor;

  // Oldest first on screen; the API sends newest first.
  const shown = useMemo(() => {
    const seen = new Set<string>();
    const all: Message[] = [];
    for (const m of [...data.items, ...older]) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      all.push(m);
    }
    return all.reverse();
  }, [data.items, older]);

  const unread = data.conversation.unreadCount;
  useEffect(() => {
    if (unread <= 0 || marking.current) return;
    marking.current = true;
    // Remember which messages were new on arrival so they can say "New" during this visit.
    const newest = data.items.filter((m) => !m.mine).slice(0, unread);
    setFresh((prev) => new Set([...prev, ...newest.map((m) => m.id)]));
    api
      .post(`/conversations/${conversationId}/read`, conversationSummarySchema, {})
      .then(() => {
        void qc.invalidateQueries({ queryKey: conversationsKey });
        qc.setQueryData<MessagePage>(key, (old) =>
          old ? { ...old, conversation: { ...old.conversation, unreadCount: 0 } } : old,
        );
      })
      .catch(() => {
        // The next poll tries again; the unread count simply stays until then.
      })
      .finally(() => {
        marking.current = false;
      });
  }, [unread, data.items, conversationId, qc, key]);

  function put(message: Message) {
    qc.setQueryData<MessagePage>(key, (old) => {
      if (!old) return old;
      const exists = old.items.some((m) => m.id === message.id);
      return {
        ...old,
        items: exists
          ? old.items.map((m) => (m.id === message.id ? message : m))
          : [message, ...old.items],
      };
    });
    void qc.invalidateQueries({ queryKey: conversationsKey });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (body === "") {
      setFieldError("Write your message before you send it.");
      textRef.current?.focus();
      return;
    }
    setFieldError(undefined);
    setSendError(null);
    setSending(true);
    try {
      const message = await api.post(`/conversations/${conversationId}/messages`, messageSchema, {
        body,
      });
      put(message);
      setDraft("");
      textRef.current?.focus();
    } catch {
      setSendError(
        "Your message was not sent, and what you wrote is still here. Check your connection and send it again.",
      );
    } finally {
      setSending(false);
    }
  }

  async function retry(message: Message) {
    setRetryError(null);
    setRetrying((s) => new Set(s).add(message.id));
    try {
      const again = await api.post(
        `/conversations/${conversationId}/messages/${message.id}/retry`,
        messageSchema,
        {},
      );
      put(again);
    } catch {
      setRetryError("That message still did not send. It is saved here. Try again in a moment.");
    } finally {
      setRetrying((s) => {
        const next = new Set(s);
        next.delete(message.id);
        return next;
      });
    }
  }

  async function loadOlder() {
    if (!cursor) return;
    setLoadingOlder(true);
    try {
      const page = await api.get(
        `/conversations/${conversationId}/messages?limit=${pageSize}&cursor=${encodeURIComponent(cursor)}`,
        messagePageSchema,
      );
      setOlder((o) => [...o, ...page.items]);
      setOlderCursor(page.nextCursor);
    } finally {
      setLoadingOlder(false);
    }
  }

  const team = data.conversation.participants.filter((p) => p.role !== "patient");
  const remaining = MESSAGE_BODY_MAX - draft.length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p>
          <TextLink href="/messages">All messages</TextLink>
        </p>
        <Heading level={1}>{data.conversation.subject}</Heading>
        <p className="text-body text-ink-muted">
          With{" "}
          {team.map((p, i) => (
            <span key={p.userId}>
              {i > 0 ? "; " : ""}
              {p.name}, {p.roleLabel.toLowerCase()}
            </span>
          ))}
          .
        </p>
      </header>

      <section aria-labelledby="messages-heading" className="flex flex-col gap-3">
        <Heading level={2} id="messages-heading" className="sr-only">
          Messages
        </Heading>
        {cursor ? (
          <div>
            <Button
              variant="secondary"
              onClick={loadOlder}
              loading={loadingOlder}
              loadingLabel="Loading"
            >
              Show earlier messages
            </Button>
          </div>
        ) : null}
        {shown.length === 0 ? (
          <p className="text-body text-ink-muted">No messages yet. Write the first one below.</p>
        ) : (
          <div role="log" aria-label="Messages in this conversation">
            <ol className="flex flex-col gap-3">
              {shown.map((m) => (
                <MessageItem
                  key={m.id}
                  message={m}
                  timezone={timezone}
                  isNew={fresh.has(m.id)}
                  retrying={retrying.has(m.id)}
                  onRetry={() => void retry(m)}
                />
              ))}
            </ol>
          </div>
        )}
        {retryError ? (
          <Banner tone="error" title="Still not sent">
            {retryError}
          </Banner>
        ) : null}
      </section>

      <form
        onSubmit={submit}
        noValidate
        aria-label="Write a message"
        className="flex flex-col gap-4 border-t border-border pt-6"
      >
        <Field
          label="Message to your care team"
          requirement="required"
          {...(data.composer.replyTimeText ? { hint: data.composer.replyTimeText } : {})}
          {...(fieldError ? { error: fieldError } : {})}
        >
          {(control) => (
            <Textarea
              {...control}
              ref={textRef}
              rows={4}
              maxLength={MESSAGE_BODY_MAX}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (fieldError) setFieldError(undefined);
              }}
            />
          )}
        </Field>
        {remaining < 200 ? (
          <p className="text-small text-ink-muted">{remaining} characters left.</p>
        ) : null}
        <p className="flex items-start gap-2 rounded-control bg-warning-bg p-3 text-label font-medium text-warning-ink">
          <Icon name="alert-triangle" size={18} className="mt-0.5 shrink-0" />
          <span>{data.composer.emergencyNotice}</span>
        </p>
        {sendError ? (
          <Banner tone="error" title="Not sent">
            {sendError}
          </Banner>
        ) : null}
        <div>
          <Button
            type="submit"
            loading={sending}
            loadingLabel="Sending"
            className="w-full sm:w-auto"
          >
            Send message
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageItem({
  message: m,
  timezone,
  isNew,
  retrying,
  onRetry,
}: {
  message: Message;
  timezone: string;
  isNew: boolean;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <li
      className={cx(
        "flex flex-col gap-1.5 rounded-container border p-4",
        m.mine ? "border-border bg-primary-subtle" : "border-border bg-surface",
        m.status === "failed" && "border-2 border-error-ink",
      )}
    >
      <p className="flex flex-wrap items-baseline gap-x-2 text-small">
        <span className="text-label font-semibold text-ink">{m.sender.name}</span>
        <span className="text-ink-muted">{m.sender.roleLabel}</span>
        <span className="text-ink-muted">
          {formatInstantDateTime(m.sentAt ?? m.createdAt, timezone)}
        </span>
        {isNew ? <span className="font-semibold text-primary">New</span> : null}
      </p>
      <p className="whitespace-pre-wrap break-words text-body">{m.body}</p>
      {m.mine ? (
        m.status === "queued" ? (
          <p className="flex items-center gap-1.5 text-small text-ink-muted">
            <Icon name="clock" size={14} />
            Sending
          </p>
        ) : m.status === "failed" ? (
          <div className="flex flex-col items-start gap-2">
            <p className="flex items-start gap-1.5 text-small font-semibold text-error-ink">
              <Icon name="alert-circle" size={16} className="mt-0.5 shrink-0" />
              <span>
                Not sent. {m.failureReason ?? "Delivery failed."} Your message is saved here.
              </span>
            </p>
            {m.canRetry ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={onRetry}
                loading={retrying}
                loadingLabel="Retrying"
              >
                Retry sending
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-small text-ink-muted">
            <Icon name="check" size={14} />
            Sent
          </p>
        )
      ) : null}
    </li>
  );
}
