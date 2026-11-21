import { describe, expect, it } from "vitest";
import { isActivationKey, isSearchShortcut, rovingIndex } from "./keyboard";
import { errorTitle, isDirtyText, remainingCharacters, toggleExclusive } from "./forms";
import { checkDateOfBirth, formatDateOfBirth, partsFromIso } from "./date-of-birth";
import { formatClock, spokenDuration, timerMilestone } from "./timer";
import {
  emptyToastQueue,
  toastQueue,
  MAX_WAITING,
  type ToastInput,
  type ToastQueueState,
} from "./toast-queue";
import { readParam, withParam } from "./url-state";
import { paneModeFor } from "./media";

describe("keyboard", () => {
  it("moves through a horizontal group with wrap, Home and End", () => {
    expect(rovingIndex("ArrowRight", 0, 3, { orientation: "horizontal" })).toBe(1);
    expect(rovingIndex("ArrowRight", 2, 3, { orientation: "horizontal" })).toBe(0);
    expect(rovingIndex("ArrowLeft", 0, 3, { orientation: "horizontal" })).toBe(2);
    expect(rovingIndex("ArrowDown", 0, 3, { orientation: "horizontal" })).toBeNull();
    expect(rovingIndex("Home", 2, 3)).toBe(0);
    expect(rovingIndex("End", 0, 3)).toBe(2);
  });
  it("stops at the ends without loop and ignores other keys", () => {
    expect(rovingIndex("ArrowDown", 4, 5, { orientation: "vertical", loop: false })).toBe(4);
    expect(rovingIndex("ArrowUp", 0, 5, { orientation: "vertical", loop: false })).toBe(0);
    expect(rovingIndex("a", 0, 5)).toBeNull();
    expect(rovingIndex("ArrowDown", 0, 0)).toBeNull();
  });
  it("activation keys and the / shortcut", () => {
    expect(isActivationKey("Enter")).toBe(true);
    expect(isActivationKey(" ")).toBe(true);
    expect(isActivationKey("Tab")).toBe(false);
    expect(isSearchShortcut({ key: "/", target: { tagName: "BODY" } })).toBe(true);
    expect(isSearchShortcut({ key: "/", target: { tagName: "INPUT" } })).toBe(false);
    expect(isSearchShortcut({ key: "/", ctrlKey: true, target: null })).toBe(false);
    expect(
      isSearchShortcut({ key: "/", target: { tagName: "DIV", isContentEditable: true } }),
    ).toBe(false);
  });
});

describe("form rules", () => {
  it("dirty means changed and not empty after trim (CD-522)", () => {
    expect(isDirtyText("", "  ")).toBe(false);
    expect(isDirtyText("", "a note")).toBe(true);
    expect(isDirtyText("same", " same ")).toBe(false);
  });
  it("an exclusive option clears the others and is cleared by them (CD-107)", () => {
    expect(toggleExclusive(["a", "b"], "none", true, "none")).toEqual({
      values: ["none"],
      cleared: true,
    });
    expect(toggleExclusive(["none"], "a", true, "none")).toEqual({ values: ["a"], cleared: true });
    expect(toggleExclusive(["a"], "b", true, "none")).toEqual({
      values: ["a", "b"],
      cleared: false,
    });
    expect(toggleExclusive(["a", "b"], "a", false, "none").values).toEqual(["b"]);
  });
  it("prefixes and restores the document title", () => {
    expect(errorTitle("Pain | CarePath", true)).toBe("Error: Pain | CarePath");
    expect(errorTitle("Error: Pain | CarePath", true)).toBe("Error: Pain | CarePath");
    expect(errorTitle("Error: Pain | CarePath", false)).toBe("Pain | CarePath");
  });
  it("shows the character count only near the limit", () => {
    expect(remainingCharacters(10, 100).show).toBe(false);
    expect(remainingCharacters(80, 100)).toEqual({
      show: true,
      text: "20 characters left",
      over: false,
    });
    expect(remainingCharacters(101, 100)).toEqual({
      show: true,
      text: "1 character too many",
      over: true,
    });
  });
});

describe("date of birth (CD-102)", () => {
  const today = "2026-11-19";
  it("accepts a real past date and returns ISO", () => {
    expect(checkDateOfBirth({ day: "8", month: "10", year: "1962" }, today)).toEqual({
      value: "1962-10-08",
      error: null,
      parts: [],
    });
  });
  it("orders errors: incomplete, impossible, out of range", () => {
    expect(checkDateOfBirth({ day: "", month: "", year: "" }, today).error).toBe(
      "Enter your date of birth",
    );
    expect(checkDateOfBirth({ day: "8", month: "", year: "" }, today)).toMatchObject({
      error: "Date of birth must include a month and a year",
      parts: ["month", "year"],
    });
    expect(checkDateOfBirth({ day: "30", month: "2", year: "1990" }, today).error).toBe(
      "Date of birth must be a real date",
    );
    expect(checkDateOfBirth({ day: "1", month: "1", year: "2027" }, today).error).toBe(
      "Date of birth must be in the past",
    );
    expect(checkDateOfBirth({ day: "1", month: "1", year: "1899" }, today)).toMatchObject({
      error: "Date of birth must be after 1900",
      parts: ["year"],
    });
    expect(checkDateOfBirth({ day: "x", month: "1", year: "1960" }, today).parts).toEqual(["day"]);
    expect(checkDateOfBirth({ day: "1", month: "1", year: "60" }, today).parts).toEqual(["year"]);
  });
  it("round-trips parts and reads back in words", () => {
    expect(partsFromIso("1962-10-18")).toEqual({ day: "18", month: "10", year: "1962" });
    expect(partsFromIso(null)).toEqual({ day: "", month: "", year: "" });
    expect(formatDateOfBirth("1962-10-18")).toBe("18 October 1962");
  });
});

describe("timers (CD-126)", () => {
  it("formats the clock and the spoken duration", () => {
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(-3)).toBe("0:00");
    expect(formatClock(9.2)).toBe("0:10");
    expect(spokenDuration(45)).toBe("45 seconds");
    expect(spokenDuration(61)).toBe("1 minute 1 second");
    expect(spokenDuration(120)).toBe("2 minutes");
  });
  it("announces milestones only, never every second", () => {
    expect(timerMilestone(30, null, 30, "Hold")).toBe("Hold started, 30 seconds.");
    expect(timerMilestone(30, 25, 24)).toBeNull();
    expect(timerMilestone(30, 11, 10)).toBe("10 seconds left.");
    expect(timerMilestone(15, 11, 10)).toBeNull();
    expect(timerMilestone(30, 1, 0, "Rest")).toBe("Rest done.");
    let said = 0;
    let prev: number | null = null;
    for (let r = 30; r >= 0; r -= 0.25) {
      if (timerMilestone(30, prev, r)) said += 1;
      prev = r;
    }
    expect(said).toBe(3);
  });
});

describe("toast queue (CD-442)", () => {
  const ok = { tone: "success" as const, title: "Saved" };
  const push = (s: ToastQueueState, title: string, held = false) =>
    toastQueue(s, { type: "push", toast: { tone: "info", title }, held });
  it("shows one at a time and merges duplicates", () => {
    let s = toastQueue(emptyToastQueue, { type: "push", toast: ok, held: false });
    s = toastQueue(s, { type: "push", toast: ok, held: false });
    expect(s.visible?.title).toBe("Saved");
    expect(s.waiting).toHaveLength(0);
    s = push(s, "Second");
    s = push(s, "Second");
    expect(s.waiting.map((w) => w.title)).toEqual(["Second"]);
    s = toastQueue(s, { type: "dismiss", id: s.visible!.id, held: false });
    expect(s.visible?.title).toBe("Second");
  });
  it("holds while an overlay is open and keeps at most three waiting", () => {
    let s = push(emptyToastQueue, "A", true);
    expect(s.visible).toBeNull();
    for (const t of ["B", "C", "D"]) s = push(s, t, true);
    expect(s.waiting).toHaveLength(MAX_WAITING);
    expect(s.waiting[0]!.title).toBe("B");
    s = toastQueue(s, { type: "release" });
    expect(s.visible?.title).toBe("B");
  });
  it("has no error tone in its type", () => {
    // @ts-expect-error errors are not toasts (CD-442 rule 1)
    const tone: ToastInput["tone"] = "error";
    expect(tone).toBe("error");
  });
});

describe("URL state (CD-504, DR-002 R2)", () => {
  it("sets and removes one parameter and keeps the rest", () => {
    expect(withParam("http://x/patients/1?tab=plan#top", "tab", "history")).toBe(
      "/patients/1?tab=history#top",
    );
    expect(withParam("/patients/1?tab=plan&x=1", "tab", null)).toBe("/patients/1?x=1");
    expect(readParam("?tab=plan", "tab")).toBe("plan");
  });
});

describe("pane mode (DR-002 R6)", () => {
  it("is inline from 1280, a drawer from 768, a full screen below", () => {
    expect(paneModeFor(1280)).toBe("inline");
    expect(paneModeFor(1279)).toBe("drawer");
    expect(paneModeFor(768)).toBe("drawer");
    expect(paneModeFor(767)).toBe("screen");
  });
});
