import { ZERO_COST_LABEL } from "../cost.js";
import { AIError } from "../errors.js";
import { looksLikeInstruction } from "../injection.js";
import type { NoteDraftInputParsed, ProgressSummaryInputParsed } from "../inputs.js";
import { DETERMINISTIC_PROVIDER_LABEL } from "../labels.js";
import {
  transcriptTurnField,
  type DataNotice,
  type MissingInfoItem,
  type NoteMissingInformation,
  type ProgressSummaryOutput,
  type SoapNoteDraftOutput,
  type SoapSection,
  type SourceRef,
  type Statement,
} from "../schemas.js";
import type { LLMProvider, ProviderCall, ProviderResult } from "./types.js";

/**
 * Deterministic provider: rule-based extraction over the source records. No model, no network,
 * no randomness. Every statement is built from input values (counts, scores, dates, quoted text)
 * and cites the records it came from. It is always labelled "Demo provider, rule-based" and its
 * output must never be presented as a model's.
 */
export class DeterministicProvider implements LLMProvider {
  readonly id = "deterministic";
  readonly label = DETERMINISTIC_PROVIDER_LABEL;
  readonly model = null;
  readonly external = false;

  async generate(call: ProviderCall): Promise<ProviderResult> {
    if (call.destination !== "local") {
      throw new AIError(
        "not_configured",
        "The deterministic provider runs locally on structured input.",
      );
    }
    const output =
      call.kind === "progress_summary"
        ? draftProgressSummary(call.input as ProgressSummaryInputParsed)
        : draftSoapNote(call.input as NoteDraftInputParsed);
    return {
      output,
      usage: { inputTokens: 0, outputTokens: 0 },
      costMicroUsd: 0,
      costLabel: ZERO_COST_LABEL,
      model: null,
    };
  }
}

const MAX_REFS = 12;
const day = (iso: string) => iso.slice(0, 10);
const quote = (s: string, max = 280) => {
  const t = s.replace(/\s+/g, " ").trim();
  return `"${t.length > max ? `${t.slice(0, max - 3).trimEnd()}...` : t}"`;
};

class StatementList {
  private n = 0;
  next(text: string, sourceRefs: SourceRef[]): Statement {
    this.n += 1;
    return { id: `s${this.n}`, text, sourceRefs: sourceRefs.slice(0, MAX_REFS) };
  }
}

// ---------------------------------------------------------------------------------------------
// Progress summary
// ---------------------------------------------------------------------------------------------

const SYMPTOM_CUES =
  /\b(pain|hurt|hurts|ache|aching|sore|stiff|stiffness|swell|swelling|swollen|numb|tingl\w*|worse|better|improv\w*|flare|cannot|can't|difficult\w*|hard\w*|trouble)\b/i;

const STATUS_WORDS: Record<string, string> = {
  completed: "completed",
  abandoned: "not finished",
  stopped_discomfort: "stopped for discomfort",
  in_progress: "in progress",
  paused: "paused",
};
const APPOINTMENT_TYPE: Record<string, string> = {
  initial_evaluation: "initial evaluation",
  follow_up: "follow-up",
  video_follow_up: "video follow-up",
};

export function draftProgressSummary(input: ProgressSummaryInputParsed): ProgressSummaryOutput {
  const ids = new StatementList();
  const out: ProgressSummaryOutput = {
    summary: [],
    reportedChanges: [],
    engagementObservations: [],
    missingInformation: [],
    itemsForReview: [],
    notices: [],
  };
  const from = day(input.window.from);
  const to = day(input.window.to);
  const sessions = [...input.sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const checkIns = [...input.checkIns].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const sessionRef = (id: string): SourceRef => ({ type: "exercise_session", id, field: "status" });
  const painRef = (id: string): SourceRef => ({ type: "check_in", id, field: "painScore" });

  // Summary
  if (sessions.length > 0) {
    const completed = sessions.filter((s) => s.status === "completed").length;
    out.summary.push(
      ids.next(
        `${completed} of ${sessions.length} exercise sessions started between ${from} and ${to} were completed.`,
        sessions.map((s) => sessionRef(s.id)),
      ),
    );
  }
  const last = checkIns.at(-1);
  if (last) {
    const refs: SourceRef[] = [painRef(last.id)];
    let text = `Most recent check-in, ${day(last.submittedAt)}: pain ${last.painScore}/10`;
    if (last.difficulty) {
      text += `, exercises felt ${last.difficulty === "as_expected" ? "as expected" : last.difficulty}`;
      refs.push({ type: "check_in", id: last.id, field: "difficulty" });
    }
    out.summary.push(ids.next(`${text}.`, refs));
  }
  if (input.carePlan) {
    out.summary.push(
      ids.next(
        `Current care plan: version ${input.carePlan.versionNumber}, ${quote(input.carePlan.title, 120)}, published ${day(input.carePlan.publishedAt)}.`,
        [{ type: "care_plan_version", id: input.carePlan.versionId, field: "title" }],
      ),
    );
  }

  // Reported changes
  const first = checkIns[0];
  if (first && last && first.id !== last.id) {
    const verb =
      last.painScore === first.painScore
        ? `stayed at ${last.painScore}/10 from ${day(first.submittedAt)} to ${day(last.submittedAt)}`
        : `went from ${first.painScore}/10 on ${day(first.submittedAt)} to ${last.painScore}/10 on ${day(last.submittedAt)}`;
    out.reportedChanges.push(
      ids.next(`Patient-reported pain ${verb}.`, [painRef(first.id), painRef(last.id)]),
    );
    if (last.painScore - first.painScore >= 2) {
      out.itemsForReview.push(
        ids.next(
          `Patient-reported pain rose by ${last.painScore - first.painScore} points in the window.`,
          [painRef(first.id), painRef(last.id)],
        ),
      );
    }
  }
  for (const c of checkIns.filter((c) => c.notes && c.notes.trim()).slice(-5)) {
    const ref: SourceRef = { type: "check_in", id: c.id, field: "notes" };
    if (looksLikeInstruction(c.notes!))
      out.notices.push({ code: "instruction_like_source_text", sourceRefs: [ref] });
    else
      out.reportedChanges.push(
        ids.next(`Check-in note, ${day(c.submittedAt)}: ${quote(c.notes!)}`, [ref]),
      );
  }
  const patientMessages = input.messages
    .filter((m) => m.senderRole === "patient")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const m of patientMessages) {
    const ref: SourceRef = { type: "message", id: m.id, field: "body" };
    if (looksLikeInstruction(m.body))
      out.notices.push({ code: "instruction_like_source_text", sourceRefs: [ref] });
    else if (SYMPTOM_CUES.test(m.body) && out.reportedChanges.length < 12) {
      out.reportedChanges.push(
        ids.next(`Patient message, ${day(m.createdAt)}: ${quote(m.body)}`, [ref]),
      );
    }
  }
  for (const s of sessions.filter((s) => s.status === "stopped_discomfort")) {
    out.itemsForReview.push(
      ids.next(`Session started ${day(s.startedAt)} was stopped for discomfort.`, [
        sessionRef(s.id),
      ]),
    );
  }
  for (const c of checkIns.filter((c) => c.painScore >= 7)) {
    out.itemsForReview.push(
      ids.next(`Pain ${c.painScore}/10 reported on ${day(c.submittedAt)}.`, [painRef(c.id)]),
    );
  }

  // Engagement
  if (sessions.length > 0) {
    const byStatus = new Map<string, string[]>();
    for (const s of sessions) byStatus.set(s.status, [...(byStatus.get(s.status) ?? []), s.id]);
    const parts = [...byStatus.entries()].map(
      ([st, list]) => `${STATUS_WORDS[st] ?? st} ${list.length}`,
    );
    out.engagementObservations.push(
      ids.next(
        `Sessions by outcome: ${parts.join(", ")}.`,
        sessions.map((s) => sessionRef(s.id)),
      ),
    );
  }
  for (const s of sessions) {
    for (const a of s.activities) {
      if (a.status === "skipped") {
        const ref: SourceRef = { type: "session_activity", id: a.id, field: "skipReason" };
        if (a.skipReason && looksLikeInstruction(a.skipReason)) {
          out.notices.push({ code: "instruction_like_source_text", sourceRefs: [ref] });
          continue;
        }
        const why = a.skipReason
          ? `, reason given: ${quote(a.skipReason, 160)}`
          : ", no reason given";
        out.engagementObservations.push(
          ids.next(`${quote(a.exerciseName, 80)} was skipped on ${day(s.startedAt)}${why}.`, [
            a.skipReason ? ref : { type: "session_activity", id: a.id, field: "status" },
          ]),
        );
      }
      if (a.discomfortReported && a.discomfortLevel !== null) {
        const st = ids.next(
          `Discomfort ${a.discomfortLevel}/10 reported during ${quote(a.exerciseName, 80)} on ${day(s.startedAt)}.`,
          [{ type: "session_activity", id: a.id, field: "discomfortLevel" }],
        );
        (a.discomfortLevel >= 7 ? out.itemsForReview : out.reportedChanges).push(st);
      }
    }
  }
  if (checkIns.length > 0) {
    out.engagementObservations.push(
      ids.next(
        `${checkIns.length} check-in${checkIns.length === 1 ? "" : "s"} submitted between ${from} and ${to}.`,
        checkIns.map((c) => painRef(c.id)),
      ),
    );
  }
  const appts = [...input.appointments].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  for (const a of appts.filter((a) => a.status === "no_show" || a.status.startsWith("cancelled"))) {
    const what = a.status === "no_show" ? "was missed" : "was cancelled";
    out.engagementObservations.push(
      ids.next(
        `${APPOINTMENT_TYPE[a.type]} on ${day(a.startsAt)} ${what}.`.replace(/^./, (c) =>
          c.toUpperCase(),
        ),
        [{ type: "appointment", id: a.id, field: "status" }],
      ),
    );
  }
  const upcoming = appts.find(
    (a) => a.startsAt > input.window.to && (a.status === "booked" || a.status === "requested"),
  );
  if (upcoming) {
    out.engagementObservations.push(
      ids.next(
        `Next appointment: ${APPOINTMENT_TYPE[upcoming.type]} on ${day(upcoming.startsAt)}.`,
        [{ type: "appointment", id: upcoming.id, field: "startsAt" }],
      ),
    );
  }

  // Missing information
  const miss = (item: ProgressSummaryOutput["missingInformation"][number]["item"], label: string) =>
    out.missingInformation.push({ item, label });
  if (checkIns.length === 0)
    miss("no_check_ins_in_window", `No check-ins between ${from} and ${to}.`);
  if (sessions.length === 0)
    miss("no_sessions_in_window", `No exercise sessions between ${from} and ${to}.`);
  if (!input.carePlan) miss("no_current_care_plan", "No published care plan.");
  if (!upcoming) miss("no_upcoming_appointment", "No upcoming appointment is booked.");
  if (patientMessages.length === 0)
    miss(
      "no_patient_messages_in_window",
      `No messages from the patient between ${from} and ${to}.`,
    );
  if (checkIns.length > 0 && checkIns.every((c) => c.difficulty === null)) {
    miss(
      "check_in_difficulty_not_reported",
      "Check-ins in the window do not say how the exercises felt.",
    );
  }

  out.summary = out.summary.slice(0, 4);
  out.reportedChanges = out.reportedChanges.slice(0, 12);
  out.engagementObservations = out.engagementObservations.slice(0, 12);
  out.itemsForReview = out.itemsForReview.slice(0, 12);
  out.notices = out.notices.slice(0, 12);
  return out;
}

// ---------------------------------------------------------------------------------------------
// SOAP note draft
// ---------------------------------------------------------------------------------------------

const PLAN_CUES =
  /^\s*plan\b|\bplan:|\b(continue|we will|we'll|follow[- ]?up|next (visit|week|session|appointment)|add|replace|increase|decrease|reduce|progress to|home program|check in|schedule|refer|book|start)\b/i;
const ASSESSMENT_CUES =
  /\b(assessment|impression|i think|consistent with|improving|progressing|plateau\w*|limited by|remaining limit|likely|appears|suggests|responding|better than|worse than)\b/i;
const OBJECTIVE_CUES =
  /\b(measured|measure|degrees?|flexion|extension|abduction|adduction|rotation|strength|[0-5][+-]?\/5|mmt|manual muscle|observed|observe|gait|palpation|tender\w*|swelling (is|was|noted)|range of motion|balance|single[- ]leg|timed|seconds|reps)\b|°/i;
const SUBJECTIVE_CUES =
  /\b(pain|hurt\w*|ache\w*|sore|stiff\w*|swell\w*|numb\w*|tingl\w*|worse|better|improv\w*|hard|difficult\w*|can't|cannot|trouble|sleep\w*|walk\w*|stairs?|sitting|sit|standing|stand|lift\w*|carry\w*|work|driv\w*|exercises?|program|skipped|missed|did|goal|want to|able to|fall\w*|weak\w*|tired|night)\b|\d+\s*(\/|out of)\s*10\b/i;

const COVERAGE: Record<
  MissingInfoItem,
  { re: RegExp; speakers: "any" | "patient" | "clinician"; section: SoapSection; label: string }
> = {
  pain_score: {
    re: /\b(10|[0-9])(\.\d)?\s*(\/|out of)\s*10\b/i,
    speakers: "any",
    section: "subjective",
    label: "No numeric pain rating in the transcript.",
  },
  functional_status: {
    re: /\b(stairs?|walk\w*|sleep\w*|lift\w*|carry\w*|work|driv\w*|sitting|sit|standing|stand|bend\w*|reach\w*|dress\w*|squat\w*|run\w*|kneel\w*|household|chores)\b/i,
    speakers: "patient",
    section: "subjective",
    label: "No daily activity or function is described.",
  },
  home_exercise_adherence: {
    re: /\b(home (exercise|program)s?|exercises|routine)\b.*\b(did|done|doing|skipped|missed|days?|times|daily|every|most|haven't|have not)\b|\b(did|done|doing|skipped|missed|haven't|have not)\b.*\b(home (exercise|program)s?|exercises|routine)\b/i,
    speakers: "patient",
    section: "subjective",
    label: "Home exercise adherence is not discussed.",
  },
  red_flag_screen: {
    re: /\b(numb\w*|tingl\w*|night pain|pain at night|fever|bowel|bladder|weight loss|saddle|chest pain|dizz\w*)\b/i,
    speakers: "any",
    section: "subjective",
    label: "No red-flag screening (numbness, night pain, bowel or bladder changes) is recorded.",
  },
  goals: {
    re: /\b(goal|goals|i want to (be able|get back|return)|i'd like to (be able|get back)|would like to (be able|get back))\b/i,
    speakers: "any",
    section: "plan",
    label: "No goal is stated.",
  },
  range_of_motion: {
    re: /\b\d+\s*degrees?\b|\d+\s*°|\b(flexion|extension|abduction|adduction|rotation)\b[^.]{0,40}\d/i,
    speakers: "clinician",
    section: "objective",
    label: "No range-of-motion measurement.",
  },
  strength: {
    // A grade or a test result, not a mention ("I didn't test strength today" does not cover it).
    re: /\b[0-5][+-]?\/5\b|\bmanual muscle test\w*\b|\bmmt\b|\bstrength (is|was|measured|tested at)\b|\bstrength test\s*:/i,
    speakers: "clinician",
    section: "objective",
    label: "No strength testing is recorded.",
  },
  follow_up_plan: {
    re: /\b(follow[- ]?up|next (visit|week|session|appointment)|check in|see you (in|next)|in (one|two|three|four|five|six|\d+) weeks?|return in|come back)\b/i,
    speakers: "clinician",
    section: "plan",
    label: "No follow-up or next visit is set.",
  },
};

const MISSING_ORDER: MissingInfoItem[] = [
  "pain_score",
  "functional_status",
  "home_exercise_adherence",
  "red_flag_screen",
  "range_of_motion",
  "strength",
  "goals",
  "follow_up_plan",
];

const splitSentences = (text: string) =>
  text
    .split(/(?<=[.!?])\s+(?=["'A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);

export function classifySentence(
  speaker: "clinician" | "patient" | "caregiver",
  sentence: string,
): SoapSection | null {
  if (/\?\s*$/.test(sentence)) return null;
  if (sentence.split(/\s+/).length < 3 && !/\d/.test(sentence)) return null;
  if (speaker !== "clinician") return SUBJECTIVE_CUES.test(sentence) ? "subjective" : null;
  if (PLAN_CUES.test(sentence)) return "plan";
  if (ASSESSMENT_CUES.test(sentence)) return "assessment";
  if (OBJECTIVE_CUES.test(sentence)) return "objective";
  return null;
}

export function draftSoapNote(input: NoteDraftInputParsed): SoapNoteDraftOutput {
  const ids = new StatementList();
  const out: SoapNoteDraftOutput = {
    subjective: [],
    objective: [],
    assessment: [],
    plan: [],
    missingInformation: [],
    notices: [],
  };
  const encounterRef = (turn: number): SourceRef => ({
    type: "encounter",
    id: input.encounter.id,
    field: transcriptTurnField(turn),
  });
  // Instruction-like sentences are removed and the turn is reported in a notice. The rest of the
  // turn is still the speaker's own words and stays usable ("Anyway, bending is fine now.").
  const usable = input.transcript.map((t) => {
    const sentences = splitSentences(t.text);
    const kept = sentences.filter((s) => !looksLikeInstruction(s));
    if (kept.length !== sentences.length || looksLikeInstruction(t.text)) {
      const notice: DataNotice = {
        code: "instruction_like_source_text",
        sourceRefs: [encounterRef(t.turn)],
      };
      out.notices.push(notice);
      // An instruction that only shows across sentence boundaries: drop the whole turn.
      if (kept.length === sentences.length) return { ...t, sentences: [] as string[] };
    }
    return { ...t, sentences: kept };
  });

  const who = { patient: "Patient", caregiver: "Caregiver", clinician: "Clinician" } as const;
  for (const t of usable) {
    // Consecutive sentences of one turn that land in the same section become one statement.
    const groups: { section: SoapSection; sentences: string[] }[] = [];
    for (const sentence of t.sentences) {
      const section = classifySentence(t.speaker, sentence);
      if (!section) continue;
      const prev = groups.at(-1);
      if (prev && prev.section === section) prev.sentences.push(sentence);
      else groups.push({ section, sentences: [sentence] });
    }
    for (const g of groups) {
      if (out[g.section].length >= 20) continue;
      out[g.section].push(
        ids.next(`${who[t.speaker]}: ${quote(g.sentences.join(" "), 560)}`, [encounterRef(t.turn)]),
      );
    }
  }

  for (const item of MISSING_ORDER) {
    const rule = COVERAGE[item];
    const covered = usable.some(
      (t) =>
        (rule.speakers === "any" ||
          (rule.speakers === "patient" ? t.speaker !== "clinician" : t.speaker === "clinician")) &&
        rule.re.test(t.sentences.join(" ")),
    );
    if (!covered) {
      const entry: NoteMissingInformation = { section: rule.section, item, label: rule.label };
      out.missingInformation.push(entry);
    }
  }
  out.notices = out.notices.slice(0, 12);
  return out;
}
