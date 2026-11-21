/**
 * Toast queue policy (CD-442), as a pure reducer so it can be tested without a DOM.
 * - Tones are success and info only; errors use inline channels (CD-440, CD-449).
 * - One toast visible; up to three waiting; an identical toast (same tone, title, description) merges
 *   with the visible or a waiting one instead of stacking.
 * - While a modal overlay is open nothing is shown; the queue waits and shows after it closes.
 */

export type ToastTone = "success" | "info";

export interface ToastInput {
  tone: ToastTone;
  title: string;
  description?: string;
}

export interface QueuedToast extends ToastInput {
  id: number;
}

export interface ToastQueueState {
  visible: QueuedToast | null;
  waiting: QueuedToast[];
  nextId: number;
}

export const MAX_WAITING = 3;

export const emptyToastQueue: ToastQueueState = { visible: null, waiting: [], nextId: 1 };

const same = (a: ToastInput, b: ToastInput) =>
  a.tone === b.tone && a.title === b.title && (a.description ?? "") === (b.description ?? "");

export type ToastAction =
  | { type: "push"; toast: ToastInput; held: boolean }
  | { type: "dismiss"; id: number; held: boolean }
  | { type: "release" };

export function toastQueue(state: ToastQueueState, action: ToastAction): ToastQueueState {
  switch (action.type) {
    case "push": {
      if (state.visible && same(state.visible, action.toast)) return state;
      if (state.waiting.some((w) => same(w, action.toast))) return state;
      const item = { ...action.toast, id: state.nextId };
      const next = { ...state, nextId: state.nextId + 1 };
      if (!state.visible && !action.held) return { ...next, visible: item };
      const waiting = [...state.waiting, item].slice(-MAX_WAITING);
      return { ...next, waiting };
    }
    case "dismiss": {
      if (state.visible?.id !== action.id) {
        return { ...state, waiting: state.waiting.filter((w) => w.id !== action.id) };
      }
      if (action.held) return { ...state, visible: null };
      const [head, ...rest] = state.waiting;
      return { ...state, visible: head ?? null, waiting: rest };
    }
    case "release": {
      if (state.visible || state.waiting.length === 0) return state;
      const [head, ...rest] = state.waiting;
      return { ...state, visible: head ?? null, waiting: rest };
    }
  }
}
