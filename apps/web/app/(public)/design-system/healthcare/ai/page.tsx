import type { Metadata } from "next";
import { DEMO_PROVIDER_NOTICE } from "@carepath/shared";
import { AIDraftBlock, ProvenanceLine, reviewedByText } from "@carepath/ui";
import { Section, Specimen } from "../../specimen";
import { DecisionBarDemo, DecisionStatesDemo, EvidenceDemo } from "../demos";
import { FamilyPage } from "../families";
import { TZ, provenance } from "../fixtures";

export const metadata: Metadata = {
  title: "Healthcare components: generated drafts | CarePath",
};

const p = provenance.provider;
const body =
  "Pain ratings were 4, 5 and 3 of 10 at the three check-ins from Nov 15 to Nov 19. One session on Nov 17 was stopped for discomfort.";

export default function AiPage() {
  return (
    <FamilyPage
      slug="ai"
      intro={`Generated text is a labelled draft until a therapist takes responsibility for it. Words carry provenance: the state label, the provider name as stored and, for the demo provider, "${DEMO_PROVIDER_NOTICE}" Graphite tint and the dashed rule are secondary cues. No sparkle, no confidence figure. Approved is not signed.`}
    >
      <Section
        id="states"
        title="Draft block, six states"
        intro="Generating (not shown by the review screen, which never receives a pending draft), not reviewed, approved, edited and approved, rejected (text kept readable, not struck through), and could not generate."
      >
        <Specimen id="ai-draft-states" only="clinician">
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
        </Specimen>
      </Section>

      <Section
        id="evidence"
        title="Statements, evidence and support"
        intro="Each statement ends with numbered references that name their source. Opening one marks it opened; that records an open, not a check. Supported means the cited record exists for this patient. An edited statement reads Edited, not re-checked. A statement kept without a record says who kept it and why."
      >
        <Specimen id="ai-evidence" only="clinician">
          <EvidenceDemo />
          <section
            id="missing-information"
            aria-label="Missing information"
            className="flex flex-col gap-1"
          >
            <p className="text-label font-semibold text-ink">Missing information</p>
            <p className="text-small text-ink">
              No pain rating was recorded at the visit on Nov 19.
            </p>
          </section>
        </Specimen>
      </Section>

      <Section
        id="decision"
        title="Decision bar"
        intro="Approve stays focusable but unavailable until every flagged statement is resolved, missing information is acknowledged and evidence has been opened for reported changes; the reason is written out with links to each item. Only one approve label is shown. Reject asks why, inline."
      >
        <Specimen id="ai-decision" only="clinician">
          <DecisionBarDemo />
          <DecisionStatesDemo />
        </Specimen>
      </Section>
    </FamilyPage>
  );
}
