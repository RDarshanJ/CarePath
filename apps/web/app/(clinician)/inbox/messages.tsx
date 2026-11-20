"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { ConversationPage, ConversationSummary, Message } from "@carepath/shared/contracts";
import { MESSAGE_BODY_MAX } from "@carepath/shared/contracts";
import { Banner, Button, Icon, StatusChip, Textarea, cx, useToast } from "@carepath/ui";
import {
  AppLink,
  Empty,
  ListSkeleton,
  PageHeader,
  QueryError,
  Section,
  errorText,
} from "../_components/common";
import { useClinician } from "../_lib/context";
import { formatDateTime, fullName, plural } from "../_lib/format";
import { keys, reads, writes } from "../_lib/queries";

const LIST_POLL_MS = 10_000;
/** ADR-12: a thread that is open refreshes every 5 seconds; faster while a message is still being delivered. */
const THREAD_POLL_MS = 5_000;
const PENDING_POLL_MS = 1_500;

export function Messages() {
  const params = useSearchParams();
  const selected = params.get("c");
  const list = useQuery({
    queryKey: keys.conversations,
    queryFn: reads.conversations,
    refetchInterval: LIST_POLL_MS,
  });
  const total = list.data?.unreadTotal ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Messages"
        description={
          list.data
            ? total > 0
              ? `${plural(total, "unread message")} across your conversations.`
              : "No unread messages."
            : "Conversations between patients and their care team."
        }
      />
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
        <div className={cx("min-w-0", selected ? "hidden xl:block" : undefined)}>
          <ConversationList list={list} selected={selected} />
        </div>
        <div className={cx("min-w-0 xl:col-span-2", selected ? undefined : "hidden xl:block")}>
          {selected ? (
            <Thread key={selected} conversationId={selected} />
          ) : (
            <Section id="thread-empty" title="Thread">
              <Empty icon="message" title="Choose a conversation">
                Pick a conversation from the list to read it and reply.
              </Empty>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationList({
  list,
  selected,
}: {
  list: UseQueryResult<ConversationPage>;
  selected: string | null;
}) {
  const { timezone } = useClinician();
  const items = list.data?.items ?? [];
  return (
    <Section
      id="conversations"
      title="Conversations"
      {...(list.data ? { count: items.length } : {})}
      description="Most recent first. Only conversations you are part of are listed."
    >
      {list.isError ? (
        <div className="p-4">
          <QueryError error={list.error} onRetry={() => void list.refetch()} />
        </div>
      ) : !list.data ? (
        <div className="p-4">
          <ListSkeleton rows={5} label="Loading conversations" />
        </div>
      ) : items.length === 0 ? (
        <Empty icon="message" title="No conversations yet">
          A conversation appears here once a patient is assigned to you. You are not part of any
          yet.
        </Empty>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((c) => (
            <li key={c.id}>
              <ConversationRow c={c} current={c.id === selected} timezone={timezone} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function ConversationRow({
  c,
  current,
  timezone,
}: {
  c: ConversationSummary;
  current: boolean;
  timezone: string;
}) {
  const name = fullName(c.patient);
  return (
    <NextLink
      href={`/inbox?c=${c.id}`}
      scroll={false}
      aria-current={current ? "true" : undefined}
      className={cx(
        "relative flex flex-col gap-0.5 px-4 py-2.5 focus-visible:focus-ring",
        current ? "bg-primary-subtle" : "hover:bg-surface-sunken",
      )}
    >
      {current ? (
        <span aria-hidden="true" className="absolute inset-y-1 left-0 w-0.5 bg-primary" />
      ) : null}
      <span className="flex items-baseline justify-between gap-2">
        <span
          className={cx(
            "truncate text-label text-ink",
            c.unreadCount > 0 ? "font-semibold" : "font-medium",
          )}
        >
          {name}
        </span>
        {c.lastMessageAt ? (
          <span className="shrink-0 text-small text-ink-muted tabular-nums">
            {formatDateTime(c.lastMessageAt, timezone)}
          </span>
        ) : null}
      </span>
      <span className="truncate text-small text-ink-muted">{c.preview ?? "No messages yet"}</span>
      {c.unreadCount > 0 || c.failedCount > 0 ? (
        <span className="mt-1 flex flex-wrap gap-1.5">
          {c.unreadCount > 0 ? (
            <StatusChip tone="info" icon="message">
              {c.unreadCount} unread
            </StatusChip>
          ) : null}
          {c.failedCount > 0 ? (
            <StatusChip tone="error">
              {c.failedCount === 1 ? "1 message not sent" : `${c.failedCount} messages not sent`}
            </StatusChip>
          ) : null}
        </span>
      ) : null}
    </NextLink>
  );
}

function Thread({ conversationId }: { conversationId: string }) {
  const { timezone } = useClinician();
  const qc = useQueryClient();
  const toast = useToast();
  const logRef = useRef<HTMLDivElement>(null);

  const thread = useInfiniteQuery({
    queryKey: keys.thread(conversationId),
    queryFn: ({ pageParam }) => reads.thread(conversationId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: (q) =>
      q.state.data?.pages.some((p) => p.items.some((m) => m.mine && m.status === "queued"))
        ? PENDING_POLL_MS
        : THREAD_POLL_MS,
  });

  const first = thread.data?.pages[0];
  const conversation = first?.conversation;
  const seen = new Set<string>();
  const messages: Message[] = [];
  for (const m of (thread.data?.pages ?? []).flatMap((p) => p.items)) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      messages.push(m);
    }
  }
  messages.reverse(); // the API sends newest first; the log reads oldest first

  // Opening a thread, and any message that arrives while it is open, clears its unread count.
  const markRead = useMutation({
    mutationFn: () => writes.markRead(conversationId),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.conversations });
      void qc.invalidateQueries({ queryKey: keys.overview });
      void qc.invalidateQueries({ queryKey: keys.thread(conversationId) });
    },
  });
  const unread = conversation?.access === "participant" ? conversation.unreadCount : 0;
  useEffect(() => {
    if (unread > 0 && !markRead.isPending) markRead.mutate();
  }, [unread]);

  // Keep the newest message in view when the log grows.
  const newest = messages[messages.length - 1]?.id;
  const newestStatus = messages[messages.length - 1]?.status;
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [newest, newestStatus]);

  const retry = useMutation({
    mutationFn: (messageId: string) => writes.retryMessage(conversationId, messageId),
    onSuccess: () => {
      toast({ tone: "info", title: "Trying to send again" });
    },
    onError: (e) => {
      const t = errorText(e);
      toast({ tone: "error", title: t.title, description: t.body });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.thread(conversationId) });
      void qc.invalidateQueries({ queryKey: keys.conversations });
    },
  });

  if (thread.isError) {
    return (
      <Section id="thread" title="Thread">
        <div className="flex flex-col gap-3 p-4">
          <AppLink href="/inbox" className="text-small xl:hidden">
            Back to conversations
          </AppLink>
          <QueryError error={thread.error} onRetry={() => void thread.refetch()} />
        </div>
      </Section>
    );
  }
  if (!first || !conversation) {
    return (
      <Section id="thread" title="Thread">
        <div className="p-4">
          <ListSkeleton rows={4} label="Loading messages" />
        </div>
      </Section>
    );
  }

  const patientName = fullName(conversation.patient);
  const people = conversation.participants
    .map((p) => `${p.name} (${p.roleLabel.toLowerCase()})`)
    .join(", ");
  const canWrite = conversation.access === "participant";

  return (
    <section
      aria-labelledby="thread-heading"
      className="flex flex-col rounded-container border border-border bg-surface"
    >
      <div className="flex flex-col gap-1 border-b border-border px-4 py-3">
        <AppLink href="/inbox" className="w-fit text-small xl:hidden">
          Back to conversations
        </AppLink>
        <h2 id="thread-heading" className="font-heading text-h4 font-semibold text-ink">
          {patientName}
          <span className="ml-2 font-normal text-ink-muted">{conversation.subject}</span>
        </h2>
        <p className="text-small text-ink-muted">
          In this conversation: {people}.{" "}
          <AppLink href={`/patients/${conversation.patient.id}`}>Open the patient record</AppLink>
        </p>
      </div>

      <div
        ref={logRef}
        role="log"
        aria-label={`Messages with ${patientName}`}
        tabIndex={0}
        className="flex max-h-96 min-h-48 flex-col gap-3 overflow-y-auto px-4 py-4 focus-visible:focus-ring"
      >
        {thread.hasNextPage ? (
          <div>
            <Button
              variant="secondary"
              size="sm"
              loading={thread.isFetchingNextPage}
              loadingLabel="Loading"
              onClick={() => void thread.fetchNextPage()}
            >
              Show earlier messages
            </Button>
          </div>
        ) : null}
        {messages.length === 0 ? (
          <p className="text-body text-ink-muted">
            No messages yet. Write the first message below.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {messages.map((m) => (
              <MessageItem
                key={m.id}
                m={m}
                timezone={timezone}
                retrying={retry.isPending && retry.variables === m.id}
                onRetry={() => retry.mutate(m.id)}
              />
            ))}
          </ol>
        )}
      </div>

      {canWrite ? (
        <Composer
          conversationId={conversationId}
          patientName={patientName}
          replyTimeText={first.composer.replyTimeText}
          emergencyNotice={first.composer.emergencyNotice}
        />
      ) : (
        <p className="border-t border-border px-4 py-3 text-small text-ink-muted">
          You are reading this conversation as an organization record. Only people in it can reply.
        </p>
      )}
    </section>
  );
}

function MessageItem({
  m,
  timezone,
  retrying,
  onRetry,
}: {
  m: Message;
  timezone: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <li
      className={cx(
        "flex max-w-xl flex-col gap-1 rounded-container border px-3 py-2",
        m.mine
          ? "ml-auto border-border-control bg-primary-subtle"
          : "border-border bg-surface-sunken",
        m.status === "failed" ? "border-error-ink" : undefined,
      )}
    >
      <p className="flex flex-wrap items-baseline gap-x-2 text-small">
        <span className="text-label font-semibold text-ink">
          {m.mine ? `You (${m.sender.name})` : m.sender.name}
        </span>
        <span className="text-ink-muted">{m.sender.roleLabel}</span>
        <span className="text-ink-muted tabular-nums">
          {formatDateTime(m.sentAt ?? m.createdAt, timezone)}
        </span>
      </p>
      <p className="whitespace-pre-wrap break-words text-body text-ink">{m.body}</p>
      {m.mine ? (
        m.status === "queued" ? (
          <p className="flex items-center gap-1.5 text-small text-ink-muted">
            <Icon name="clock" size={14} />
            Sending
          </p>
        ) : m.status === "failed" ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="flex items-center gap-1.5 text-small font-medium text-error-ink">
              <Icon name="alert-circle" size={14} />
              <span>Not sent. {m.failureReason ?? "Delivery failed."}</span>
            </p>
            {m.canRetry ? (
              <Button
                size="sm"
                variant="secondary"
                loading={retrying}
                loadingLabel="Retrying"
                onClick={onRetry}
              >
                Try again
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

function Composer({
  conversationId,
  patientName,
  replyTimeText,
  emergencyNotice,
}: {
  conversationId: string;
  patientName: string;
  replyTimeText: string | null;
  emergencyNotice: string;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const send = useMutation({
    mutationFn: (body: string) => writes.sendMessage(conversationId, body),
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: keys.thread(conversationId) });
      void qc.invalidateQueries({ queryKey: keys.conversations });
    },
  });
  const trimmed = text.trim();

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!trimmed || send.isPending) return;
    send.mutate(trimmed);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 border-t border-border px-4 py-3">
      <label htmlFor="composer" className="text-label font-medium text-ink">
        Message to {patientName}
      </label>
      <Textarea
        id="composer"
        rows={3}
        maxLength={MESSAGE_BODY_MAX}
        value={text}
        aria-describedby="composer-notes"
        onChange={(e) => {
          setText(e.target.value);
          if (send.isError) send.reset();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
        }}
      />
      <div id="composer-notes" className="flex flex-col gap-0.5 text-small text-ink-muted">
        {replyTimeText ? <p>{replyTimeText}</p> : null}
        <p>{emergencyNotice}</p>
        <p>Press Ctrl+Enter to send.</p>
      </div>
      {send.isError ? (
        <Banner tone="error" title={errorText(send.error).title}>
          Your message was not sent and your text is still here. {errorText(send.error).body}
        </Banner>
      ) : null}
      <div>
        <Button type="submit" disabled={!trimmed} loading={send.isPending} loadingLabel="Sending">
          Send message
        </Button>
      </div>
    </form>
  );
}
