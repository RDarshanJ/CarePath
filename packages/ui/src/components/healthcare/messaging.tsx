"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  EMERGENCY_NOTICE,
  MESSAGE_RETRYING_LABEL,
  URGENT_NOTICE,
  URGENT_NOTICE_NO_PHONE,
  formatDateTime,
  messageStatusLabels,
} from "@carepath/shared";
import { MESSAGE_BODY_MAX, type Message } from "@carepath/shared/contracts";
import { cx } from "../../lib/cx";
import { Banner } from "../composed/banner";
import { Button } from "../primitives/button";
import { Field } from "../primitives/field";
import { Icon } from "../primitives/icons";
import { Textarea } from "../primitives/inputs";
import { Skeleton } from "../primitives/surfaces";

/*
 * Messaging (CD-510 to CD-513, DR-002 G). One thread, one composer and one delivery line for both
 * apps; the variants differ only in scroll and surface. Drafts live in the caller's memory (R1):
 * nothing here touches browser storage. Never "Delivered", "Read" or ticks: there is no such data.
 */

export type MessagingAudience = "patient" | "staff";

/** `tel:` link target from a display number. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * The fixed emergency line (CD-513, R3): static text, not an alert, never edited inline. The patient
 * composer adds the urgent line (`URGENT_NOTICE`) with the clinic phone as a real `tel:` link; staff
 * composers show neither (DR-002 G).
 */
export function EmergencyNotice({
  clinicPhone,
  showUrgent = true,
  contactHref,
  className,
}: {
  clinicPhone: string | null;
  showUrgent?: boolean;
  /** Where "Urgent? Contact your clinic." links when there is no clinic phone. */
  contactHref?: string;
  className?: string;
}) {
  const [before = "", after = ""] = URGENT_NOTICE.split("{phone}");
  return (
    <div
      data-emergency-notice=""
      className={cx(
        "flex items-start gap-2 rounded-container border border-warning-ink bg-warning-bg px-3 py-2 text-warning-ink",
        className,
      )}
    >
      <Icon name="alert-triangle" size={18} className="mt-0.5 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1 text-label">
        <p className="font-medium">{EMERGENCY_NOTICE}</p>
        {showUrgent ? (
          <p data-urgent-notice="" className="text-ink">
            {clinicPhone ? (
              <>
                {before}
                <a
                  href={telHref(clinicPhone)}
                  className="rounded-control font-medium whitespace-nowrap text-link underline underline-offset-2 focus-visible:focus-ring"
                >
                  {clinicPhone}
                </a>
                {after}
              </>
            ) : contactHref ? (
              <a
                href={contactHref}
                className="rounded-control text-link underline underline-offset-2 focus-visible:focus-ring"
              >
                {URGENT_NOTICE_NO_PHONE}
              </a>
            ) : (
              URGENT_NOTICE_NO_PHONE
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Own messages only (CD-512): Sending, Sent, or Not sent with the reason and Retry. */
export function DeliveryState({
  message,
  onRetry,
  retrying = false,
}: {
  message: Pick<Message, "status" | "failureReason" | "canRetry" | "mine">;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  if (!message.mine) return null;
  const s = messageStatusLabels[message.status];
  if (message.status !== "failed") {
    return (
      <p
        data-delivery={message.status}
        className="flex items-center gap-1.5 text-small text-ink-muted"
      >
        <Icon name={s.icon === "check" ? "check" : "clock"} size={16} />
        {s.label}
      </p>
    );
  }
  return (
    <div data-delivery="failed" className="flex flex-col items-start gap-2">
      <p className="flex items-start gap-1.5 text-small font-semibold text-error-ink">
        <Icon name="alert-circle" size={16} className="mt-0.5 shrink-0" />
        <span>
          {s.label}. {message.failureReason ? `${message.failureReason} ` : ""}Your message is saved
          here.
          {message.canRetry ? "" : " Call the clinic if it is urgent."}
        </span>
      </p>
      {message.canRetry && onRetry ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          loading={retrying}
          loadingLabel={MESSAGE_RETRYING_LABEL}
        >
          Retry sending
        </Button>
      ) : null}
    </div>
  );
}

export function MessageItem({
  message,
  variant,
  timezone,
  onRetry,
  retrying,
}: {
  message: Message;
  variant: MessagingAudience;
  timezone: string;
  onRetry?: (id: string) => void;
  retrying?: boolean;
}) {
  const failed = message.mine && message.status === "failed";
  return (
    <li
      data-message={message.id}
      className={cx(
        "flex max-w-measure flex-col gap-1 rounded-container border p-3",
        message.mine
          ? "bg-primary-subtle"
          : variant === "staff"
            ? "bg-surface-sunken"
            : "bg-surface",
        failed ? "border-2 border-error-ink" : "border-border",
        message.mine && variant === "staff" && "sm:ml-12",
      )}
    >
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-label font-semibold text-ink">
          {message.mine ? "You" : message.sender.name}
        </span>
        <span className="text-small text-ink-muted">{message.sender.roleLabel}</span>
        <span className="text-small text-ink-muted tabular-nums">
          {formatDateTime(message.createdAt, timezone)}
        </span>
      </p>
      <p className="text-notes whitespace-pre-wrap break-words text-ink">{message.body}</p>
      <DeliveryState
        message={message}
        retrying={retrying}
        onRetry={onRetry ? () => onRetry(message.id) : undefined}
      />
    </li>
  );
}

export interface MessageThreadProps {
  messages: Message[];
  variant: MessagingAudience;
  timezone: string;
  /** Name of the log: "Messages in this conversation", "Messages with Ana Reyes". */
  label: string;
  state?: "ready" | "loading" | "error";
  onReload?: () => void;
  /** The first message after the reader's last visit: a "New messages" separator goes before it. */
  newFromId?: string | null;
  onRetry?: (id: string) => void;
  retryingId?: string | null;
  /** A retry failed again (CD-512). */
  stillNotSent?: boolean;
  earlier?: { hasMore: boolean; loading?: boolean; failed?: boolean; onLoad: () => void };
  emptyText?: string;
  className?: string;
}

/**
 * One conversation (CD-510): `role="log"` with a name, sender name and role and the clinic-zone time on
 * every message, text-keyed delivery states, the failed message with a 2 px border plus words.
 */
export function MessageThread({
  messages,
  variant,
  timezone,
  label,
  state = "ready",
  onReload,
  newFromId,
  onRetry,
  retryingId,
  stillNotSent = false,
  earlier,
  emptyText = "No messages yet. Write the first one below.",
  className,
}: MessageThreadProps) {
  return (
    <section aria-label={label} className={cx("flex flex-col gap-3", className)}>
      {earlier?.hasMore ? (
        <div className="flex flex-col items-start gap-1">
          <Button
            variant="neutral"
            size="sm"
            onClick={earlier.onLoad}
            loading={earlier.loading}
            loadingLabel="Loading earlier messages"
          >
            Show earlier messages
          </Button>
          {earlier.failed ? (
            <p className="text-small text-error-ink">Earlier messages did not load. Try again.</p>
          ) : null}
        </div>
      ) : null}
      {stillNotSent ? (
        <Banner tone="error" title="Still not sent">
          It is saved here. Try again in a moment, or call the clinic if it is urgent.
        </Banner>
      ) : null}
      {state === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <p className="sr-only">Loading messages</p>
          <Skeleton className="h-20 w-full max-w-md" />
          <Skeleton className="h-16 w-full max-w-sm" />
        </div>
      ) : state === "error" ? (
        <Banner
          tone="error"
          title="Messages did not load"
          action={
            onReload ? (
              <Button variant="neutral" size="sm" onClick={onReload}>
                Try again
              </Button>
            ) : undefined
          }
        >
          Nothing was sent or changed.
        </Banner>
      ) : messages.length === 0 ? (
        <p className="text-body text-ink">{emptyText}</p>
      ) : (
        <div
          role="log"
          aria-label={label}
          tabIndex={variant === "staff" ? 0 : undefined}
          className="rounded-container focus-visible:focus-ring"
        >
          <ol className="flex flex-col gap-2">
            {messages.map((m) => (
              <MessageThreadEntry key={m.id} m={m} newFromId={newFromId}>
                <MessageItem
                  message={m}
                  variant={variant}
                  timezone={timezone}
                  onRetry={onRetry}
                  retrying={retryingId === m.id}
                />
              </MessageThreadEntry>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function MessageThreadEntry({
  m,
  newFromId,
  children,
}: {
  m: Message;
  newFromId?: string | null;
  children: ReactNode;
}) {
  if (m.id !== newFromId) return <>{children}</>;
  return (
    <>
      <li aria-hidden="false" className="flex items-center gap-3 py-1" data-separator="new">
        <span className="h-px flex-1 bg-border-control" />
        <span className="text-small font-medium text-ink">New messages</span>
        <span className="h-px flex-1 bg-border-control" />
      </li>
      {children}
    </>
  );
}

export interface MessageComposerProps {
  audience: MessagingAudience;
  value: string;
  onChange: (value: string) => void;
  /** Called with the trimmed text; an empty field shows "Write a message first." instead. */
  onSend: (body: string) => void;
  sending?: boolean;
  /** The send failed: the text stays and a Banner says so (CD-511). */
  error?: string | null;
  /** Result line after a send, from the caller ("Sent. ..."). Polite status. */
  statusMessage?: string | null;
  /** The clinic's reply-time text exactly as set; nothing when unset. */
  replyTimeText?: string | null;
  /** Staff: "Message to {patient name}". */
  patientName?: string;
  /** Patient urgent line. */
  clinicPhone?: string | null;
  contactHref?: string;
  /** Patient, empty thread only: fixed opening lines that insert editable text. */
  startingPoints?: string[];
  /** Audit readers: a line instead of the form. */
  readOnlyReason?: string;
  /** Patient composer sticks to the bottom below 768 px (position sticky, never fixed). */
  sticky?: boolean;
  className?: string;
}

export interface MessageComposerHandle {
  focus: () => void;
}

/**
 * The composer (CD-511, DR-002 G). Patient: label "Message to your care team", reply-time hint,
 * starting points on an empty thread, the emergency and urgent lines above Send. Staff: label
 * "Message to {name}", reply time, the keyboard hint, no emergency notice. Send is never disabled.
 */
export const MessageComposer = forwardRef<MessageComposerHandle, MessageComposerProps>(
  function MessageComposer(
    {
      audience,
      value,
      onChange,
      onSend,
      sending = false,
      error,
      statusMessage,
      replyTimeText,
      patientName,
      clinicPhone = null,
      contactHref,
      startingPoints = [],
      readOnlyReason,
      sticky = audience === "patient",
      className,
    },
    ref,
  ) {
    const field = useRef<HTMLTextAreaElement>(null);
    const [empty, setEmpty] = useState(false);
    useImperativeHandle(ref, () => ({ focus: () => field.current?.focus() }));
    if (readOnlyReason) {
      return <p className={cx("text-small text-ink-muted", className)}>{readOnlyReason}</p>;
    }
    const patient = audience === "patient";
    const submit = (e?: FormEvent) => {
      e?.preventDefault();
      if (sending) return;
      const body = value.trim();
      if (!body) {
        setEmpty(true);
        field.current?.focus();
        return;
      }
      onSend(body);
    };
    const hint = [replyTimeText ?? null, patient ? null : "Press Ctrl+Enter or Cmd+Enter to send."]
      .filter(Boolean)
      .join(" ");
    return (
      <form
        aria-label="Write a message"
        noValidate
        onSubmit={submit}
        data-sticky-bar={sticky ? "" : undefined}
        className={cx(
          "flex flex-col gap-3 border-t border-border bg-surface pt-3",
          sticky && "sticky bottom-0 z-10 pb-3 md:static md:pb-0",
          className,
        )}
      >
        {patient && startingPoints.length ? (
          <div className="flex flex-col gap-2">
            <p className="text-small text-ink-muted">Start with</p>
            <div className="flex flex-wrap gap-2">
              {startingPoints.map((s) => (
                <Button
                  key={s}
                  variant="neutral"
                  size="sm"
                  className="whitespace-normal text-left"
                  onClick={() => {
                    onChange(s);
                    setEmpty(false);
                    field.current?.focus();
                  }}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        {error ? (
          <Banner tone="error" title="Not sent">
            {error} Your text is still here.
          </Banner>
        ) : null}
        <Field
          label={
            patient ? "Message to your care team" : `Message to ${patientName ?? "the patient"}`
          }
          requirement="required"
          hint={hint || undefined}
          error={empty ? "Write a message first." : undefined}
          count={{ length: value.length, max: MESSAGE_BODY_MAX }}
        >
          {(c) => (
            <Textarea
              {...c}
              ref={field}
              rows={4}
              maxLength={MESSAGE_BODY_MAX}
              autoComplete="off"
              spellCheck
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                if (empty && e.target.value.trim()) setEmpty(false);
              }}
              onKeyDown={(e) => {
                if (!patient && e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
              }}
            />
          )}
        </Field>
        {patient ? <EmergencyNotice clinicPhone={clinicPhone} contactHref={contactHref} /> : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="submit" loading={sending} loadingLabel="Sending" fullWidthOnPhone>
            Send message
          </Button>
          <p role="status" aria-live="polite" className="text-small text-ink-muted">
            {statusMessage ?? ""}
          </p>
        </div>
      </form>
    );
  },
);
