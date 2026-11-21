import type { Meta, StoryObj } from "@storybook/react-vite";
import type { AiSourceType, AiStatement } from "@carepath/shared/contracts";
import { Case, Cases } from "../../stories/helpers";
import { TZ, provenance } from "../../stories/fixtures";
import {
  AIDraftBlock,
  EvidenceRef,
  NoSupportingRecord,
  ProvenanceLine,
  ReviewDecisionBar,
  StatementSupport,
} from "./ai";
import { editedByText, reviewSummaryText, reviewedByText } from "./ai-text";

const meta = { title: "Healthcare/Generated drafts" } satisfies Meta;
export default meta;
type Story = StoryObj;

const p = provenance.provider;
const body =
  "Pain ratings were 4, 5 and 3 of 10 at the three check-ins from Nov 15 to Nov 19. One session on Nov 17 was stopped for discomfort.";

export const AIDraftBlockStory: Story = {
  name: "AIDraftBlock",
  render: () => (
    <div className="grid gap-4 xl:grid-cols-2">
      <AIDraftBlock state="pending" provider={p} title="Progress summary" />
      <AIDraftBlock
        state="unreviewed"
        provider={p}
        title="Progress summary"
        provenance={<ProvenanceLine input={provenance} />}
      >
        {body}
      </AIDraftBlock>
      <AIDraftBlock
        state="approved"
        provider={p}
        title="Progress summary"
        decisionLine="by Dana Whitfield, Nov 19, 9:10 AM MST"
        notSigned
        provenance={
          <ProvenanceLine
            input={provenance}
            reviewed={reviewedByText("Dana Whitfield", "2026-11-19T16:10:00Z", TZ, false)}
          />
        }
      >
        {body}
      </AIDraftBlock>
      <AIDraftBlock
        state="approved_with_edits"
        provider={p}
        title="SOAP note draft, visit on Nov 19"
        decisionLine="by Dana Whitfield, Nov 19, 9:14 AM MST"
        notSigned
      >
        Subjective: knee aches after mini squats, worst 5 of 10. Objective: not recorded in
        CarePath.
      </AIDraftBlock>
      <AIDraftBlock
        state="rejected"
        provider={p}
        title="Progress summary"
        decisionLine="Reason: covers the wrong two weeks."
      >
        {body}
      </AIDraftBlock>
      <AIDraftBlock
        state="failed"
        provider={p}
        title="Progress summary"
        failureMessage="The summary service did not answer in time. Nothing was saved."
      />
      <AIDraftBlock
        state="unreviewed"
        provider={{ label: "", isDemo: false }}
        title="Provider missing (a defect, shown, never hidden)"
      >
        {body}
      </AIDraftBlock>
    </div>
  ),
};

export const ProvenanceLineStory: Story = {
  name: "ProvenanceLine",
  render: () => (
    <Cases>
      <Case label="Generated, not yet reviewed">
        <ProvenanceLine input={provenance} />
      </Case>
      <Case label="Edited by the therapist">
        <ProvenanceLine
          input={provenance}
          edited={editedByText("Dana Whitfield", "2026-11-19T16:05:00Z", TZ)}
        />
      </Case>
      <Case label="Reviewed">
        <ProvenanceLine
          input={provenance}
          reviewed={reviewedByText("Dana Whitfield", "2026-11-19T16:10:00Z", TZ, false)}
        />
      </Case>
    </Cases>
  ),
};

export const EvidenceRefStory: Story = {
  name: "EvidenceRef",
  render: () => (
    <Cases>
      <Case label="Unopened, opened and selected">
        <p className="text-body">
          Pain ratings were 4, 5 and 3 of 10.
          <EvidenceRef
            n={1}
            sourceType="check_in"
            occurredAt="2026-11-15T16:00:00Z"
            timezone={TZ}
            onOpen={() => undefined}
          />
          <EvidenceRef
            n={2}
            sourceType="check_in"
            occurredAt="2026-11-17T16:00:00Z"
            timezone={TZ}
            opened
            onOpen={() => undefined}
          />
          <EvidenceRef
            n={3}
            sourceType="exercise_session"
            occurredAt="2026-11-17T17:30:00Z"
            timezone={TZ}
            opened
            selected
            onOpen={() => undefined}
          />
        </p>
      </Case>
    </Cases>
  ),
};

export const NoSupportingRecordStory: Story = {
  name: "NoSupportingRecord",
  render: () => (
    <p className="text-body">
      Patient reported knee pain after mini squats on Nov 17. <NoSupportingRecord />
    </p>
  ),
};

interface DemoStatement extends Pick<
  AiStatement,
  "id" | "text" | "support" | "resolution" | "note"
> {
  refs: { type: AiSourceType; at: string }[];
}

const statements: DemoStatement[] = [
  {
    id: "s1",
    text: "Pain ratings were 4, 5 and 3 of 10 at the three check-ins from Nov 15 to Nov 19.",
    support: "supported",
    resolution: "unchanged",
    note: null,
    refs: [{ type: "check_in", at: "2026-11-15T16:00:00Z" }],
  },
  {
    id: "s2",
    text: "Patient reported knee pain after mini squats on Nov 17.",
    support: "unsupported",
    resolution: "unchanged",
    note: null,
    refs: [],
  },
  {
    id: "s3",
    text: "One session on Nov 17 was stopped for discomfort.",
    support: "supported",
    resolution: "edited",
    note: null,
    refs: [{ type: "exercise_session", at: "2026-11-17T17:30:00Z" }],
  },
  {
    id: "s4",
    text: "The patient asked how far the heel should slide.",
    support: "unsupported",
    resolution: "acknowledged",
    note: "Asked at the visit on Nov 19; the message did not send.",
    refs: [],
  },
];

export const StatementSupportStory: Story = {
  name: "StatementSupport",
  render: () => (
    <ol className="flex max-w-2xl flex-col gap-3">
      {statements.map((s) => (
        <li key={s.id} className="flex flex-col gap-1">
          <p className="text-body">
            {s.text}
            {s.refs.map((r, i) => (
              <EvidenceRef
                key={`${s.id}-${i}`}
                n={i + 1}
                sourceType={r.type}
                occurredAt={r.at}
                timezone={TZ}
                onOpen={() => undefined}
              />
            ))}
          </p>
          <StatementSupport statement={s} noteBy="Dana Whitfield" />
        </li>
      ))}
    </ol>
  ),
};

const summary = reviewSummaryText({ statementCount: 4, supportedCount: 2, unsupportedCount: 2 }, 1);
const cleanSummary = reviewSummaryText(
  { statementCount: 4, supportedCount: 4, unsupportedCount: 0 },
  0,
);

export const ReviewDecisionBarStory: Story = {
  name: "ReviewDecisionBar",
  render: () => (
    <Cases>
      <Case label="Blocked: three things to resolve, each linked">
        <ReviewDecisionBar
          sticky={false}
          blockers={[
            { code: "unsupported_unresolved", statementIds: ["s2"], items: [] },
            { code: "missing_unacknowledged", statementIds: [], items: ["pain_score_at_visit"] },
            { code: "evidence_not_opened", statementIds: ["s1"], items: [] },
          ]}
          allowed={false}
          hasEdits
          summary={summary}
          statementHref={(id) => `#statement-${id}`}
          missingHref="#missing-information"
          onApprove={() => undefined}
          onReject={() => undefined}
        />
      </Case>
      <Case label="Every blocker resolved, edits made">
        <ReviewDecisionBar
          sticky={false}
          blockers={[]}
          allowed
          hasEdits
          summary={summary}
          onApprove={() => undefined}
          onReject={() => undefined}
        />
      </Case>
      <Case label="Offline">
        <ReviewDecisionBar
          sticky={false}
          blockers={[]}
          allowed
          hasEdits={false}
          summary={cleanSummary}
          offline
          onApprove={() => undefined}
          onReject={() => undefined}
        />
      </Case>
      <Case label="Consent withdrawn, and the last decision failed to save">
        <ReviewDecisionBar
          sticky={false}
          blockers={[{ code: "consent_withdrawn", statementIds: [], items: [] }]}
          allowed={false}
          hasEdits={false}
          summary={cleanSummary}
          error="Check your connection and try again."
          onApprove={() => undefined}
          onReject={() => undefined}
        />
      </Case>
      <Case label="Not on the care team">
        <ReviewDecisionBar
          sticky={false}
          blockers={[]}
          allowed
          hasEdits={false}
          summary=""
          canDecide={false}
          onApprove={() => undefined}
          onReject={() => undefined}
        />
      </Case>
    </Cases>
  ),
};
