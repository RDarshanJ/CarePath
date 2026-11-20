import type { MessageStatus } from "../contracts/messaging.js";
import type { StatusTone } from "./types.js";

/** CD-238. Icon plus words in both apps; the failed row is identical everywhere. */
export const messageStatusLabels: Record<
  MessageStatus,
  { label: string; icon: "clock" | "check" | "alert"; tone: StatusTone }
> = {
  queued: { label: "Sending", icon: "clock", tone: "neutral" },
  sent: { label: "Sent", icon: "check", tone: "neutral" },
  failed: { label: "Not sent", icon: "alert", tone: "error" },
};

export const MESSAGE_RETRYING_LABEL = "Retrying";

/** "1 of your messages was not sent", "3 of your messages were not sent" (both apps). */
export function messagesNotSentText(count: number): string {
  return count === 1
    ? "1 of your messages was not sent"
    : `${count} of your messages were not sent`;
}
