import { describe, expect, it } from "vitest";
import {
  AI_CONSENT_NAME,
  AI_GENERATED_NAME,
  DEMO_DEFAULT_LABEL,
  DEMO_PROVIDER_NOTICE,
  EMERGENCY_NOTICE,
  PAIN_ANCHOR_HIGH,
  PAIN_ANCHOR_LOW,
  URGENT_NOTICE,
  URGENT_NOTICE_NO_PHONE,
  actionLabelFor,
  actionLabels,
  aiDraftStateLabels,
  appointmentStatusLabels,
  appointmentTypeLabels,
  carePlanStatusLabels,
  clinicalNoteStatusLabels,
  doseFieldLabels,
  findBannedDiagnosticTerms,
  GENERIC_ACTION_LABELS,
  intakeStatusLabels,
  messagesNotSentText,
  noteVersionSourceLabels,
  painChosenLine,
  painPatientSentenceText,
  painStaffText,
  patientStatusLabels,
  planStageLabels,
  PRIORITY_ORDER_LINE,
  PRIORITY_SORT_LINE,
  priorityLevelLabels,
  restText,
  reviewTaskStatusLabels,
  sessionStatusLabels,
  unsupportedStatementsText,
  urgentNoticeMessage,
  versionMarkerLabels,
  ACTIVE_STATUS_DEFINITION,
} from "./index.js";

/** Words the guidelines keep out of generated and fixed copy (microcopy section 1, R4, no promises). */
const BANNED_WORDS = [
  /\banytime\b/i,
  /24\/7/,
  /\blive\b/i,
  /online now/i,
  /!/,
  /\bAI-powered\b/i,
  /\bsmart\b/i,
  /\bimproved?\b/i,
  /\b(mild|moderate|severe)\b/i,
  /\bplease\b/i,
];

/** Every new string this package adds, for the banned-word and diagnostic-term checks. */
function allNewStrings(): string[] {
  const out: string[] = [
    URGENT_NOTICE,
    URGENT_NOTICE_NO_PHONE,
    urgentNoticeMessage("(555) 010-0199"),
    PAIN_ANCHOR_LOW,
    PAIN_ANCHOR_HIGH,
    painChosenLine(7),
    DEMO_DEFAULT_LABEL,
    DEMO_PROVIDER_NOTICE,
    AI_GENERATED_NAME,
    AI_CONSENT_NAME,
    ACTIVE_STATUS_DEFINITION,
    PRIORITY_ORDER_LINE,
    PRIORITY_SORT_LINE,
    messagesNotSentText(1),
    messagesNotSentText(3),
    unsupportedStatementsText(1),
    unsupportedStatementsText(2),
    restText({ restSeconds: 30 }),
    painStaffText(7, "2026-11-19"),
    painPatientSentenceText(7),
    ...Object.values(doseFieldLabels),
    ...Object.values(actionLabels),
    actionLabelFor.continueTo("Personal information"),
    actionLabelFor.assignTherapistConfirm("Dana Lee"),
    actionLabelFor.retryLoading("messages"),
    actionLabelFor.showMore("visits"),
    ...Object.values(patientStatusLabels).flatMap((v) => [v.label, v.patientLabel ?? ""]),
    ...Object.values(intakeStatusLabels).map((v) => v.label),
    ...Object.values(appointmentStatusLabels).flatMap((v) => [v.staff, v.patient]),
    ...Object.values(appointmentTypeLabels),
    ...Object.values(planStageLabels),
    ...Object.values(carePlanStatusLabels).map((v) => v.label),
    ...Object.values(versionMarkerLabels).map((v) => v.label),
    ...Object.values(reviewTaskStatusLabels).map((v) => v.label),
    ...Object.values(sessionStatusLabels).map((v) => v.label),
    ...Object.values(clinicalNoteStatusLabels).flatMap((v) => [v.label, v.explanation ?? ""]),
    ...Object.values(noteVersionSourceLabels).map((v) => v ?? ""),
    ...Object.values(aiDraftStateLabels).flatMap((v) => [v.label, v.explanation ?? ""]),
  ];
  const high = priorityLevelLabels.high;
  if (high) out.push(high.label);
  return out.filter(Boolean);
}

describe("fixed safety copy", () => {
  it("keeps EMERGENCY_NOTICE exactly as approved and URGENT_NOTICE separate", () => {
    expect(EMERGENCY_NOTICE).toBe(
      "Not monitored for emergencies. If this is an emergency, call 911.",
    );
    expect(URGENT_NOTICE).toBe("For something urgent that is not an emergency, call {phone}.");
    expect(URGENT_NOTICE_NO_PHONE).toBe("Urgent? Contact your clinic.");
    expect(URGENT_NOTICE).not.toBe(EMERGENCY_NOTICE);
  });

  it("resolves the phone, or falls back when the clinic has none", () => {
    expect(urgentNoticeMessage("(555) 010-0199")).toBe(
      "For something urgent that is not an emergency, call (555) 010-0199.",
    );
    expect(urgentNoticeMessage(null)).toBe("Urgent? Contact your clinic.");
  });

  it("anchors and the demo-default label carry the decided wording", () => {
    expect(PAIN_ANCHOR_LOW).toBe("0 No pain");
    expect(PAIN_ANCHOR_HIGH).toBe("10 Worst pain imaginable");
    expect(painChosenLine(7)).toBe("You chose 7 of 10.");
    expect(DEMO_DEFAULT_LABEL).toBe("Demo default. Not clinically reviewed.");
  });
});

describe("generated-output wording (checkpoint C3 section 3.1)", () => {
  it("states that the demo provider used no model", () => {
    expect(DEMO_PROVIDER_NOTICE).toBe("Rule-based demo output. No AI model was used.");
  });
  it("the labels for generated output do not say AI", () => {
    const shown = [
      AI_GENERATED_NAME,
      noteVersionSourceLabels.ai_draft ?? "",
      ...Object.values(aiDraftStateLabels).flatMap((v) => [v.label, v.explanation ?? ""]),
    ];
    for (const s of shown) expect(s, s).not.toMatch(/\bAI\b/);
    expect(AI_GENERATED_NAME).toBe("Generated draft");
    expect(noteVersionSourceLabels.ai_draft).toBe("Started from a generated draft");
    expect(aiDraftStateLabels.unreviewed.label).toBe("Draft, generated, not reviewed");
    expect(aiDraftStateLabels.approved.label).toBe("Generated, reviewed and approved");
    expect(aiDraftStateLabels.approved_with_edits.label).toBe("Generated, edited and approved");
  });
});

describe("banned words over every new string (R3)", () => {
  const strings = allNewStrings();
  it("covers a meaningful number of strings", () => {
    expect(strings.length).toBeGreaterThan(80);
  });
  it.each(BANNED_WORDS.map((re) => [String(re), re] as const))("no string matches %s", (_n, re) => {
    for (const s of strings) expect(s, s).not.toMatch(re);
  });
  it("no string contains a banned diagnostic term", () => {
    for (const s of strings) expect(findBannedDiagnosticTerms(s), s).toEqual([]);
  });
  it("the patient-facing safety lines do not promise availability", () => {
    for (const s of [URGENT_NOTICE, URGENT_NOTICE_NO_PHONE, EMERGENCY_NOTICE]) {
      expect(s).not.toMatch(/anytime|24\/7|live|online now|within/i);
    }
  });
});

describe("action label table (CD-428)", () => {
  it("never uses a generic label on its own", () => {
    const generic = new Set(GENERIC_ACTION_LABELS.map((l) => l.toLowerCase()));
    for (const label of Object.values(actionLabels)) {
      expect(generic.has(label.toLowerCase()), label).toBe(false);
    }
  });
  it("opening and confirming a cancel use different words", () => {
    expect(actionLabels.cancelVisitConfirm).not.toBe(actionLabels.cancelVisitOpen);
    expect(actionLabels.cancelVisitKeep).toBe("Keep this visit");
  });
});
