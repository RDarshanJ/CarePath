import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DEMO_PROVIDER_NOTICE,
  EMERGENCY_NOTICE,
  URGENT_NOTICE_NO_PHONE,
  aiDraftStateLabels,
  appointmentStatusLabels,
  doseText,
  patientStatusLabels,
  type AIDraftState,
} from "@carepath/shared";
import type {
  Appointment,
  AppointmentStatus,
  ConsentList,
  Message,
  PatientHeader,
  WeeklyProgress,
} from "@carepath/shared/contracts";
import {
  AIDraftBlock,
  AppointmentRecord,
  ChartFigure,
  ConsentStatusLine,
  ConsentSummary,
  DayStrip,
  DeliveryState,
  DoseEditorRow,
  EmergencyNotice,
  EvidenceRef,
  ExerciseSummary,
  MessageComposer,
  MessageThread,
  MoveButtons,
  PLAN_DIFF_FIELD_KEYS,
  PainChart,
  PainTable,
  PatientBanner,
  PatientRowIdentity,
  PlanDiff,
  PlanStateLine,
  ProvenanceLine,
  ReviewDecisionBar,
  StatementSupport,
  VersionList,
  WeeklySessionsChart,
  WeeklySessionsTable,
  ageText,
  appointmentActionLabel,
  approvalUnavailableText,
  bornWithAgeText,
  consentState,
  dayStripDays,
  diffFieldText,
  findEvaluativeWords,
  painCaption,
  painListSummaryText,
  painRows,
  painSegments,
  planDiffFieldWords,
  planStateKind,
  planStateTag,
  provenanceText,
  weeklyCaption,
  weeklyRows,
} from "../../index";

const html = (node: ReactElement) => renderToStaticMarkup(node);
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
const text = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const TZ = "America/Denver";
const TODAY = "2026-11-19";

const patient: PatientHeader = {
  id: "8a6f0d5e-6b1f-4c39-9d7e-2a9f3c1b0e11",
  mrn: "CP-100245",
  givenName: "Maria Fernanda",
  familyName: "Okonkwo-Lindqvist",
  birthDate: "1989-03-03",
  gender: "unknown",
  status: "active",
  timezone: "America/Denver",
  preferredLanguage: "es",
  onCareTeam: true,
};

describe("identity (CD-200 to CD-204)", () => {
  it("age counts the birthday on the day and uses months under two years", () => {
    expect(ageText("1989-11-19", TODAY)).toBe("37 years");
    expect(ageText("1989-11-20", TODAY)).toBe("36 years");
    expect(ageText("2025-05-19", TODAY)).toBe("18 months");
    expect(ageText("2026-10-20", TODAY)).toBe("0 months");
    expect(bornWithAgeText("1989-03-03", TODAY)).toBe("Born Mar 3, 1989 (37 years)");
  });
  it("banner: labelled section, name as h1, MRN, born with age, status, details closed", () => {
    const out = html(
      <PatientBanner patient={patient} today={TODAY} clinicZone={TZ} careTeam={[]} />,
    );
    expect(out).toContain('aria-label="Patient"');
    expect(out).toMatch(/<h1[^>]*>Maria Fernanda Okonkwo-Lindqvist<\/h1>/);
    expect(out).toContain("CP-100245");
    expect(out).toContain("Born Mar 3, 1989 (37 years)");
    expect(out).toContain("born March 3, 1989, age 37 years");
    expect(out).toContain('aria-expanded="false"');
    expect(out).toMatch(/id="[^"]+" hidden=""/);
    expect(text(out)).toContain("Gender Not recorded");
    expect(text(out)).toContain("No therapist assigned");
    expect(out).not.toMatch(/>\s*[-?]\s*</);
  });
  it("renders every patient status with its shared label", () => {
    for (const status of Object.keys(patientStatusLabels) as PatientHeader["status"][]) {
      const out = html(
        <PatientBanner patient={{ ...patient, status }} today={TODAY} clinicZone={TZ} />,
      );
      expect(text(out)).toContain(patientStatusLabels[status].label);
    }
  });
  it("care team states, offline line, not on the care team", () => {
    const loading = html(<PatientBanner patient={patient} today={TODAY} clinicZone={TZ} />);
    expect(loading).toContain("Loading care team");
    const failed = html(
      <PatientBanner
        patient={{ ...patient, onCareTeam: false }}
        today={TODAY}
        clinicZone={TZ}
        careTeam={null}
        offline
        recordAsOf="2026-11-19T16:02:00Z"
      />,
    );
    expect(failed).toContain("Care team could not be loaded");
    expect(failed).toContain("You are offline. This record is from 9:02 AM.");
    expect(failed).toContain("Record as of 9:02 AM");
    expect(text(failed)).toContain("You are not on this patient&#x27;s care team.");
  });
  it("list rows: name link plus a muted Born line", () => {
    const out = html(<PatientRowIdentity patient={patient} href="/patients/x" />);
    expect(out).toContain('href="/patients/x"');
    expect(out).toContain("Born Mar 3, 1989");
    expect(html(<PatientRowIdentity patient={patient} showBorn={false} />)).not.toContain("Born");
  });
});

const pts = [
  { checkInId: "a", date: "2026-10-27", painScore: 6 },
  { checkInId: "b", date: "2026-11-02", painScore: 5 },
  { checkInId: "c", date: "2026-11-09", painScore: 7 },
  { checkInId: "d", date: "2026-11-18", painScore: 4 },
];

describe("chart data rules (CD-211, CD-217, CD-218)", () => {
  it("joins check-ins at most 7 days apart and breaks longer gaps", () => {
    const { segments, gaps } = painSegments(pts);
    expect(segments.map((s) => s.map((p) => p.checkInId))).toEqual([["a", "b", "c"], ["d"]]);
    expect(gaps).toEqual([{ from: "2026-11-10", to: "2026-11-17" }]);
    expect(painSegments([pts[0]!]).segments).toHaveLength(1);
    expect(painSegments([]).segments).toHaveLength(0);
  });
  it("the chart draws exactly the table's values, and no line across a gap", () => {
    const svg = html(<PainChart points={pts} label="Pain" />);
    const marks = [...svg.matchAll(/data-value="(\d+)" data-date="([\d-]+)"/g)].map((m) => [
      m[2],
      Number(m[1]),
    ]);
    const rows = painRows(pts)
      .filter((r) => r.kind === "check-in")
      .map((r) => [r.date, r.kind === "check-in" ? r.value : -1]);
    expect(marks).toEqual(rows);
    expect(count(svg, /data-mark="segment"/g)).toBe(1);
    const table = text(html(<PainTable points={pts} />));
    for (const p of pts) expect(table).toContain(`${p.painScore} of 10`);
    expect(count(html(<PainChart points={[pts[0]!]} label="Pain" />), /data-mark="segment"/g)).toBe(
      0,
    );
  });
  it("plan updates: ticks only when asked, a table row for both audiences", () => {
    const marks = [{ date: "2026-11-05", versionNumber: 3 }];
    expect(html(<PainChart points={pts} planUpdates={marks} label="Pain" />)).not.toContain(
      "plan-tick",
    );
    expect(
      html(<PainChart points={pts} planUpdates={marks} showPlanTicks label="Pain" />),
    ).toContain("plan-tick");
    expect(text(html(<PainTable points={pts} planUpdates={marks} />))).toContain(
      "Plan updated, version 3",
    );
  });
  const weeks: WeeklyProgress[] = [
    {
      weekStart: "2026-11-02",
      weekEnd: "2026-11-08",
      assignedSessions: 5,
      completedSessions: 4,
      stoppedSessions: 1,
      completedActivities: 16,
      skippedActivities: 2,
    },
    {
      weekStart: "2026-11-09",
      weekEnd: "2026-11-15",
      assignedSessions: 5,
      completedSessions: 5,
      stoppedSessions: 0,
      completedActivities: 20,
      skippedActivities: 0,
    },
    {
      weekStart: "2026-11-16",
      weekEnd: "2026-11-22",
      assignedSessions: 3,
      completedSessions: 2,
      stoppedSessions: 0,
      completedActivities: 8,
      skippedActivities: 0,
    },
  ];
  it("weekly bars and table carry the same counts; the current week is partial", () => {
    const svg = html(<WeeklySessionsChart weeks={weeks} today={TODAY} label="Sessions" />);
    const bars = [
      ...svg.matchAll(/data-week="([\d-]+)" data-assigned="(\d+)" data-completed="(\d+)"/g),
    ].map((m) => [m[1], +m[2]!, +m[3]!]);
    expect(bars).toEqual(
      weeklyRows(weeks, TODAY).map((r) => [r.weekStart, r.assigned, r.completed]),
    );
    expect(svg).toContain("so far");
    expect(count(svg, /stroke-dasharray="4 3"/g)).toBe(2);
    const table = text(html(<WeeklySessionsTable weeks={weeks} today={TODAY} />));
    expect(table).toContain("Nov 16 to Nov 22 , so far");
    expect(weeklyRows(weeks, TODAY).map((r) => r.current)).toEqual([false, false, true]);
  });
  it("captions are counts and dates, never evaluative", () => {
    const captions = [
      painCaption(pts),
      painCaption([pts[0]!]),
      painCaption([]),
      weeklyCaption(weeklyRows(weeks, TODAY)),
    ];
    expect(captions[0]).toBe(
      "Pain ratings from Oct 27 to Nov 18: 4 check-ins, lowest 4, highest 7.",
    );
    for (const c of captions) expect(findEvaluativeWords(c)).toEqual([]);
    expect(findEvaluativeWords("Pain improved and is on track")).toEqual(["improved", "on track"]);
    expect(painListSummaryText({ date: "2026-11-18", painScore: 6 }, 5, 14)).toBe(
      "Pain 6 of 10 (patient-reported), Nov 18. 5 check-ins in 14 days.",
    );
    expect(painListSummaryText(null, 0, 14)).toBe("No check-ins in 14 days.");
  });
  it("figure: toggle keeps the table in the DOM; clinicians see it; states say so in words", () => {
    const base = {
      title: "Patient-reported pain, 0 to 10",
      windowText: "Last 4 weeks",
      sourceLabel: "Patient-reported",
      tableName: "pain ratings",
    };
    const toggle = html(<ChartFigure {...base} chart={<svg />} caption="c" table={<table />} />);
    expect(toggle).toContain("Show pain ratings as a table");
    expect(toggle).toMatch(/hidden=""><table>/);
    expect(toggle).toContain("<figure");
    expect(toggle).toContain("<figcaption");
    const visible = html(
      <ChartFigure {...base} tableMode="visible" chart={<svg />} table={<table />} />,
    );
    expect(visible).not.toContain("as a table");
    expect(html(<ChartFigure {...base} state="error" errorNoun="check-ins" />)).toContain(
      "Could not load check-ins",
    );
    expect(
      html(<ChartFigure {...base} state="empty" emptyText="No check-ins recorded" />),
    ).toContain("No check-ins recorded");
    expect(html(<ChartFigure {...base} state="loading" />)).toContain('aria-busy="true"');
  });
  it("day strip: every status word, neutral wording, seven days in order", () => {
    const days = dayStripDays({
      weekStart: "2026-11-16",
      today: TODAY,
      scheduledWeekdays: [1, 2, 3, 4, 5],
      sessions: [
        { date: "2026-11-16", status: "completed" },
        { date: "2026-11-17", status: "stopped_discomfort" },
      ],
    });
    expect(days.map((d) => d.status)).toEqual([
      "done",
      "stopped",
      "not_done",
      "planned",
      "planned",
      "rest",
      "rest",
    ]);
    const out = text(html(<DayStrip days={days} />));
    for (const w of ["Done", "Stopped", "Not done", "Planned", "Rest", "Today"])
      expect(out).toContain(w);
    expect(html(<DayStrip days={days} />)).toContain("<ol");
  });
});

describe("planning (CD-300 to CD-305)", () => {
  it("every diff field key has words for both audiences, never the raw key", () => {
    for (const key of PLAN_DIFF_FIELD_KEYS) {
      for (const a of ["staff", "patient"] as const) {
        const w = planDiffFieldWords[a][key];
        expect(w).toBeTruthy();
        expect(w).toMatch(/^[a-z' ]+$/);
      }
    }
    expect(diffFieldText("instructions", "patient")).toBe("your therapist's note");
    expect(diffFieldText("instructions", "staff")).toBe("note to the patient");
    expect(diffFieldText("someNewKey", "staff")).toBe("other prescription details");
  });
  it("PlanDiff: groups in words, first version, empty with the staff scope sentence", () => {
    const diff = {
      previousVersionNumber: 2,
      added: [{ exerciseId: "1", name: "Bridge" }],
      removed: [],
      changed: [{ exerciseId: "2", name: "Clamshell", fields: ["reps", "holdSeconds"] }],
    };
    const out = text(html(<PlanDiff diff={diff} audience="staff" />));
    expect(out).toContain("Added (1)");
    expect(out).toContain("Clamshell : repetitions, hold time");
    expect(out).toContain("Only exercises are compared");
    expect(out).not.toContain("holdSeconds");
    expect(text(html(<PlanDiff diff={null} audience="patient" />))).toContain("First version");
    const empty = text(
      html(<PlanDiff diff={{ ...diff, added: [], changed: [] }} audience="patient" />),
    );
    expect(empty).toContain("No exercises were added, removed or changed.");
    expect(empty).not.toContain("Only exercises are compared");
  });
  it("plan state: the four words for staff, two for patients, never Draft for a patient", () => {
    expect(planStateKind({ currentVersion: null, hasDraft: false })).toBe("none");
    expect(
      planStateTag(planStateKind({ currentVersion: null, hasDraft: true }), "staff", null),
    ).toBe("Draft");
    expect(planStateTag("published", "staff", 3)).toBe("Published, version 3");
    expect(planStateTag("draft_differs", "staff", 3)).toBe("Draft differs from version 3");
    expect(
      planStateTag(
        planStateKind({ currentVersion: 3, hasDraft: false, viewingVersion: 2 }),
        "staff",
        2,
      ),
    ).toBe("Earlier version");
    expect(planStateTag("published", "patient", 3)).toBe("Current plan, version 3");
    const staff = text(
      html(
        <PlanStateLine
          audience="staff"
          currentVersion={3}
          timezone={TZ}
          draft={{
            updatedAt: "2026-11-19T16:02:00Z",
            counts: { added: 1, removed: 0, changed: 2 },
          }}
        />,
      ),
    );
    expect(staff).toContain("Draft differs from version 3");
    expect(staff).toContain("The patient sees version 3. Draft: 1 added, 2 changed.");
    expect(staff).toContain("Saved 9:02 AM");
    const pat = text(
      html(
        <PlanStateLine
          audience="patient"
          currentVersion={3}
          timezone={TZ}
          draft={{
            updatedAt: "2026-11-19T16:02:00Z",
            counts: { added: 1, removed: 0, changed: 0 },
          }}
        />,
      ),
    );
    expect(pat).not.toMatch(/draft/i);
    expect(pat).toContain("Current plan, version 3");
  });
  it("move buttons: position in words, named buttons, ends unavailable with a reason", () => {
    const top = html(<MoveButtons name="Bridge" index={0} total={5} onMove={() => {}} />);
    expect(top).toContain("Position 1 of 5");
    expect(top).toContain('aria-label="Move Bridge up, now position 1 of 5"');
    expect(top).toMatch(
      /aria-disabled="true"[^>]*aria-describedby="[^"]+"|aria-describedby="[^"]+"[^>]*aria-disabled="true"/,
    );
    expect(top).toContain("First in the plan");
    const mid = html(<MoveButtons name="Bridge" index={2} total={5} onMove={() => {}} />);
    expect(count(mid, /aria-disabled="true"/g)).toBe(0);
  });
  it("exercise summary: long names wrap, no title tooltips, in-plan is unavailable with a reason", () => {
    const ex = {
      name: "Supine bridge with resistance band above the knees, slow lowering",
      bodyArea: "hip",
      category: "strength",
    };
    const lib = html(<ExerciseSummary exercise={ex} variant="library" onAdd={() => {}} inPlan />);
    expect(lib).toContain("In the plan");
    expect(lib).toContain('aria-disabled="true"');
    expect(lib).not.toContain("title=");
    expect(lib).not.toContain("<img");
    expect(
      html(
        <ExerciseSummary
          exercise={{ ...ex, mediaPath: "/a.webp", mediaAlt: "x" }}
          variant="plan"
        />,
      ),
    ).toContain('alt=""');
    expect(html(<ExerciseSummary exercise={ex} variant="library" onAdd={() => {}} />)).toContain(
      `Add ${ex.name} to the plan`,
    );
  });
  it("dose editor: the summary is the shared dose string; errors show; panel closed by default", () => {
    const dose = { sets: 3, reps: 10, holdSeconds: 5, durationSeconds: null, restSeconds: 30 };
    const out = html(
      <DoseEditorRow
        exercise={{ name: "Bridge", bodyArea: "hip", category: "strength" }}
        value={{ dose, schedule: { daysOfWeek: [1, 3, 5], timesPerDay: 1 }, instructions: null }}
        errors={{ dose: "Give repetitions, a duration or a hold time." }}
        onChange={() => {}}
        index={1}
        total={3}
        onMove={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(out).toContain(doseText(dose));
    expect(out).toContain("Mon, Wed, Fri, once a day");
    expect(out).toContain("Give repetitions, a duration or a hold time.");
    expect(out).toContain('aria-expanded="false"');
    expect(out).toContain("Hold, in seconds");
    expect(
      html(
        <DoseEditorRow
          exercise={{ name: "Bridge", bodyArea: "hip", category: "strength" }}
          value={{ dose, schedule: { daysOfWeek: [1], timesPerDay: 1 }, instructions: null }}
          onChange={() => {}}
          index={0}
          total={1}
          onMove={() => {}}
          onRemove={() => {}}
          readOnly
        />,
      ),
    ).not.toContain("Edit dose");
  });
  it("version list: newest first, author for staff only, empty and single states", () => {
    const versions = [
      {
        id: "v1",
        number: 1,
        publishedAt: "2026-10-20T16:00:00Z",
        publishedBy: { userId: null, practitionerId: null, name: "Dana Smith, PT" },
        changeNoteForPatient: null,
        isCurrent: false,
      },
      {
        id: "v2",
        number: 2,
        publishedAt: "2026-11-03T16:00:00Z",
        publishedBy: { userId: null, practitionerId: null, name: "Dana Smith, PT" },
        changeNoteForPatient: "Fewer repetitions this week.",
        isCurrent: true,
      },
    ];
    const staff = text(html(<VersionList versions={versions} audience="staff" timezone={TZ} />));
    expect(staff.indexOf("Version 2")).toBeLessThan(staff.indexOf("Version 1"));
    expect(staff).toContain("Current");
    expect(staff).toContain("Earlier version");
    expect(staff).toContain("by Dana Smith, PT");
    expect(
      text(html(<VersionList versions={versions} audience="patient" timezone={TZ} />)),
    ).not.toContain("Dana Smith");
    expect(text(html(<VersionList versions={[]} audience="staff" timezone={TZ} />))).toContain(
      "No version has been published.",
    );
    expect(
      text(html(<VersionList versions={[versions[0]!]} audience="staff" timezone={TZ} />)),
    ).toContain("No earlier versions");
  });
});

const appt: Appointment = {
  id: "a1",
  patient: { id: "p1", name: "Maria Okonkwo" },
  practitioner: { userId: null, practitionerId: null, name: "Dana Smith, PT" },
  slotId: null,
  type: "follow_up",
  status: "booked",
  startsAt: "2026-11-20T16:00:00Z",
  endsAt: "2026-11-20T16:45:00Z",
  date: "2026-11-20",
  timezone: TZ,
  reason: "Knee pain on stairs",
  bookedBy: null,
  createdAt: "2026-11-01T16:00:00Z",
  cancelledAt: null,
  cancellationReason: null,
  cancelledBy: null,
  rescheduledFromId: null,
  rescheduledToId: null,
};

describe("appointment record (CD-317)", () => {
  it("every status shows the shared words for each audience", () => {
    for (const status of Object.keys(appointmentStatusLabels) as AppointmentStatus[]) {
      for (const audience of ["staff", "patient"] as const) {
        const out = text(
          html(<AppointmentRecord appointment={{ ...appt, status }} audience={audience} />),
        );
        expect(out).toContain(appointmentStatusLabels[status][audience]);
      }
    }
  });
  it("time in the clinic zone, reason for staff only, action names carry the date", () => {
    const pat = text(
      html(<AppointmentRecord appointment={appt} audience="patient" today="2026-11-20" />),
    );
    expect(pat).toContain("Today, Fri, Nov 20");
    expect(pat).toContain("9:00 AM to 9:45 AM Mountain Time");
    expect(pat).not.toContain("Knee pain");
    expect(text(html(<AppointmentRecord appointment={appt} audience="staff" />))).toContain(
      "Reason for visit: Knee pain on stairs",
    );
    expect(appointmentActionLabel("Cancel", appt)).toBe("Cancel visit on Fri, Nov 20");
  });
  it("video visit adds the viewer's time; a rescheduled visit links to its replacement", () => {
    const video = text(
      html(
        <AppointmentRecord
          appointment={{ ...appt, type: "video_follow_up" }}
          audience="patient"
          viewerZone="America/Los_Angeles"
        />,
      ),
    );
    expect(video).toContain("8:00 AM Pacific Time for you");
    const moved = html(
      <AppointmentRecord
        appointment={{ ...appt, status: "cancelled_by_patient", rescheduledToId: "a2" }}
        audience="patient"
        replacement={{ href: "/appointments/a2", startsAt: "2026-11-27T16:00:00Z" }}
      />,
    );
    expect(text(moved)).toContain("Moved to Fri, Nov 27, 9:00 AM Mountain Time");
  });
});

const msg = (over: Partial<Message>): Message => ({
  id: "m1",
  conversationId: "c1",
  body: "Can I do the bridge on the days I walk?",
  status: "sent",
  sender: { userId: "u1", name: "Maria Okonkwo", role: "patient", roleLabel: "Patient" },
  mine: false,
  createdAt: "2026-11-18T16:01:00Z",
  sentAt: "2026-11-18T16:01:00Z",
  failureReason: null,
  canRetry: false,
  ...over,
});

describe("messaging (CD-510 to CD-513)", () => {
  it("emergency notice is the exact constant with a real tel link; fallback without a phone", () => {
    const out = html(<EmergencyNotice clinicPhone="(602) 555-0142" />);
    expect(out).toContain(EMERGENCY_NOTICE);
    expect(out).toContain('href="tel:6025550142"');
    expect(text(out)).toContain(
      "For something urgent that is not an emergency, call (602) 555-0142 .",
    );
    expect(out).not.toContain('role="alert"');
    expect(html(<EmergencyNotice clinicPhone={null} />)).toContain(URGENT_NOTICE_NO_PHONE);
  });
  it("patient composer has the notice; staff composer has the label, reply time and hint, no notice", () => {
    const p = html(
      <MessageComposer
        audience="patient"
        value=""
        onChange={() => {}}
        onSend={() => {}}
        replyTimeText="We usually reply within one business day."
        clinicPhone="(602) 555-0142"
      />,
    );
    expect(p).toContain("Message to your care team");
    expect(p).toContain(EMERGENCY_NOTICE);
    expect(p).toContain("Send message");
    expect(p).not.toMatch(/<button[^>]*disabled=""[^>]*>Send/);
    const s = html(
      <MessageComposer
        audience="staff"
        patientName="Maria Okonkwo"
        value=""
        onChange={() => {}}
        onSend={() => {}}
        replyTimeText="We usually reply within one business day."
      />,
    );
    expect(s).toContain("Message to Maria Okonkwo");
    expect(s).toContain("Press Ctrl+Enter or Cmd+Enter to send.");
    expect(s).not.toContain(EMERGENCY_NOTICE);
    expect(
      html(
        <MessageComposer
          audience="staff"
          value=""
          onChange={() => {}}
          onSend={() => {}}
          readOnlyReason="You can read this conversation but not reply."
        />,
      ),
    ).not.toContain("<form");
  });
  it("delivery state: words for each status, retry for a failed message, never Delivered or Read", () => {
    const all = [
      html(<DeliveryState message={msg({ mine: true, status: "queued" })} />),
      html(<DeliveryState message={msg({ mine: true, status: "sent" })} />),
      html(
        <DeliveryState
          message={msg({
            mine: true,
            status: "failed",
            failureReason: "The connection dropped.",
            canRetry: true,
          })}
          onRetry={() => {}}
        />,
      ),
      html(
        <DeliveryState
          message={msg({
            mine: true,
            status: "failed",
            failureReason: "The connection dropped.",
            canRetry: false,
          })}
        />,
      ),
    ];
    expect(text(all[0]!)).toBe("Sending");
    expect(text(all[1]!)).toBe("Sent");
    expect(text(all[2]!)).toContain(
      "Not sent. The connection dropped. Your message is saved here.",
    );
    expect(all[2]).toContain("Retry sending");
    expect(text(all[3]!)).toContain("Call the clinic if it is urgent.");
    for (const o of all) expect(o).not.toMatch(/Delivered|Read\b|Seen/);
    expect(html(<DeliveryState message={msg({ mine: false })} />)).toBe("");
  });
  it("thread: named log, sender and role and time on every message, failed has the 2 px border", () => {
    const out = html(
      <MessageThread
        variant="staff"
        timezone={TZ}
        label="Messages with Maria Okonkwo"
        newFromId="m2"
        messages={[
          msg({}),
          msg({
            id: "m2",
            mine: true,
            status: "failed",
            canRetry: true,
            sender: {
              userId: "u2",
              name: "Dana Smith",
              role: "physical_therapist",
              roleLabel: "Physical therapist",
            },
          }),
        ]}
      />,
    );
    expect(out).toContain('role="log"');
    expect(out).toContain('aria-label="Messages with Maria Okonkwo"');
    expect(text(out)).toContain("Maria Okonkwo Patient Nov 18, 9:01 AM");
    expect(text(out)).toContain("You Physical therapist");
    expect(out).toContain("border-2 border-error-ink");
    expect(out).toContain("New messages");
    expect(
      html(<MessageThread variant="patient" timezone={TZ} label="x" messages={[]} />),
    ).toContain("No messages yet.");
    expect(
      html(<MessageThread variant="patient" timezone={TZ} label="x" messages={[]} state="error" />),
    ).toContain("Messages did not load");
  });
});

const demo = { label: "Demo provider, rule-based", isDemo: true };

describe("generated content (CD-236, CD-404 to CD-407, C3 3.1)", () => {
  it("six states with their fixed labels; the demo notice on every block from the demo provider", () => {
    for (const state of Object.keys(aiDraftStateLabels) as AIDraftState[]) {
      const out = html(
        <AIDraftBlock state={state} provider={demo}>
          Statement.
        </AIDraftBlock>,
      );
      expect(out).toContain(aiDraftStateLabels[state].label);
      expect(out).toContain(DEMO_PROVIDER_NOTICE);
      expect(out).toContain("Demo provider, rule-based");
      expect(out).not.toContain("line-through");
      expect(text(out).replace(DEMO_PROVIDER_NOTICE, "")).not.toMatch(/\bAI\b/);
    }
    const live = html(
      <AIDraftBlock state="unreviewed" provider={{ label: "Anthropic", isDemo: false }}>
        x
      </AIDraftBlock>,
    );
    expect(live).not.toContain(DEMO_PROVIDER_NOTICE);
    expect(
      html(
        <AIDraftBlock state="unreviewed" provider={null}>
          x
        </AIDraftBlock>,
      ),
    ).toContain("Provider not recorded");
    expect(
      html(
        <AIDraftBlock state="approved" provider={demo} notSigned>
          x
        </AIDraftBlock>,
      ),
    ).toContain("Approved. Not yet part of a signed note.");
  });
  it("provenance line words", () => {
    const input = {
      provider: demo,
      recordCount: 9,
      from: "2026-11-05T16:00:00Z",
      to: "2026-11-19T16:00:00Z",
      generatedAt: "2026-11-19T16:02:00Z",
      timezone: TZ,
    };
    expect(provenanceText(input)).toBe(
      "Generated draft. Provider: Demo provider, rule-based. Based on 9 records from Nov 5 to Nov 19. Generated Nov 19, 9:02 AM MST.",
    );
    expect(html(<ProvenanceLine input={input} />)).toContain("How this draft was made");
  });
  it("evidence refs name their source and say opened, never checked", () => {
    const out = html(
      <EvidenceRef
        n={2}
        sourceType="check_in"
        occurredAt="2026-11-14T17:00:00Z"
        timezone={TZ}
        opened
      />,
    );
    expect(out).toContain('aria-label="Open evidence 2: patient check-in, Nov 14, opened"');
    expect(out).not.toMatch(/checked|verified/i);
  });
  it("statement support: an edited statement never shows Supported", () => {
    const edited = text(
      html(
        <StatementSupport statement={{ support: "supported", resolution: "edited", note: null }} />,
      ),
    );
    expect(edited).toBe("Edited, not re-checked");
    expect(
      text(
        html(
          <StatementSupport
            statement={{ support: "unsupported", resolution: "unchanged", note: null }}
          />,
        ),
      ),
    ).toBe("No supporting record found");
    expect(
      text(
        html(
          <StatementSupport
            statement={{ support: "supported", resolution: "unchanged", note: null }}
          />,
        ),
      ),
    ).toContain("the cited record exists for this patient");
    expect(
      text(
        html(
          <StatementSupport
            statement={{
              support: "unsupported",
              resolution: "acknowledged",
              note: "Patient said so at the visit.",
            }}
            noteBy="Dana Smith"
          />,
        ),
      ),
    ).toBe("Kept without a supporting record. Note by Dana Smith: Patient said so at the visit.");
  });
  it("decision bar: reason in text with jump links, Approve focusable but unavailable", () => {
    const blockers = [
      { code: "unsupported_unresolved" as const, statementIds: ["s3", "s5"], items: [] },
      { code: "missing_unacknowledged" as const, statementIds: [], items: ["pain_score"] },
    ];
    expect(approvalUnavailableText(blockers)).toBe(
      "Approve is unavailable: 2 statements have no supporting record, and missing information is not acknowledged.",
    );
    const out = html(
      <ReviewDecisionBar
        blockers={blockers}
        allowed={false}
        hasEdits={false}
        summary="12 statements"
        onApprove={() => {}}
        onReject={() => {}}
        statementHref={(id) => `#statement-${id}`}
        missingHref="#missing"
      />,
    );
    expect(out).toMatch(
      /aria-disabled="true"[^>]*aria-describedby="[^"]+"|aria-describedby="[^"]+"[^>]*aria-disabled="true"/,
    );
    expect(out).toContain('href="#statement-s3"');
    expect(out).toContain('href="#missing"');
    expect(out).toContain("Approve draft");
    expect(out).toContain("Reject draft");
    expect(
      html(
        <ReviewDecisionBar
          blockers={[]}
          allowed
          hasEdits
          summary=""
          onApprove={() => {}}
          onReject={() => {}}
        />,
      ),
    ).toContain("Approve draft with edits");
    expect(
      html(
        <ReviewDecisionBar
          blockers={[]}
          allowed
          hasEdits={false}
          summary=""
          onApprove={() => {}}
          onReject={() => {}}
          canDecide={false}
        />,
      ),
    ).not.toContain("<button");
  });
});

describe("consent (CD-140, CD-144, CD-146)", () => {
  const list: ConsentList = {
    types: [
      {
        type: "treatment_and_data_use",
        required: true,
        grantable: true,
        currentTextVersion: "2026-11-01",
        active: {
          id: "k1",
          type: "treatment_and_data_use",
          status: "active",
          textVersion: "2026-11-01",
          policyUri: "/p",
          grantedAt: "2026-11-02T22:14:00Z",
          revokedAt: null,
        },
      },
      {
        type: "ai_assisted_features",
        required: false,
        grantable: true,
        currentTextVersion: "2026-11-01",
        active: null,
      },
      {
        type: "motion_tracking",
        required: false,
        grantable: false,
        currentTextVersion: "2026-11-01",
        active: null,
      },
    ],
    history: [
      {
        id: "k2",
        type: "ai_assisted_features",
        status: "inactive",
        textVersion: "2026-11-01",
        policyUri: "/p",
        grantedAt: "2026-11-03T16:00:00Z",
        revokedAt: "2026-11-10T16:00:00Z",
      },
    ],
  };
  it("state words and dates", () => {
    expect(consentState(list.types[0]!, list.history, TZ)?.text).toBe("Agreed on Nov 2, 2026");
    expect(consentState(list.types[1]!, list.history, TZ)?.text).toBe("Not allowed");
    expect(
      consentState(
        { ...list.types[1]!, active: { ...list.types[0]!.active!, type: "ai_assisted_features" } },
        [],
        TZ,
      )?.text,
    ).toBe("Allowed since Nov 2, 2026, 3:14 PM MST");
    expect(
      consentState(
        { ...list.types[0]!, active: null },
        [{ ...list.history[0]!, type: "treatment_and_data_use" }],
        TZ,
      )?.text,
    ).toBe("Withdrawn on Nov 10, 2026");
  });
  it("motion tracking is not shown; the clinician summary has no control", () => {
    expect(html(<ConsentStatusLine entry={list.types[2]!} timezone={TZ} />)).toBe("");
    const out = html(<ConsentSummary list={list} timezone={TZ} />);
    expect(out).not.toContain("<button");
    expect(out).not.toContain("Camera");
    expect(text(out)).toContain("AI-assisted drafting (optional)");
    expect(text(out)).toContain("a draft cannot be generated");
  });
});
