"use client";

import type { ReactNode } from "react";
import {
  Banner,
  Button,
  EmptyState,
  Heading,
  Skeleton,
  SkeletonGroup,
  Tag,
  StatusChip,
  cx,
  Link,
} from "@carepath/ui";
import {
  PATIENT_REPORTED,
  type PatientStatus,
  checkInReviewLabels,
  ofTotal,
  patientStatusLabels,
  planStageText as sharedPlanStageText,
  reviewTaskStatusLabels,
} from "@carepath/shared";
import type { PlanStage } from "@carepath/shared/contracts";
import { ApiError } from "../../../lib/api/errors";

/**
 * Alias of the one text link (`@carepath/ui` Link, CD-530), kept only for `patients/directory.tsx`, which
 * WP B-CR edits during D-WP-2. D-WP-13 replaces that import and deletes this line.
 */
export const AppLink = Link;

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1 text-small text-ink-muted">{eyebrow}</div> : null}
        <Heading level={1}>{title}</Heading>
        {description ? (
          <p className="mt-1 max-w-3xl text-body text-ink-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Words for an API failure: what happened, whether data is safe, one next step. */
export function errorText(error: unknown): { title: string; body: string } {
  if (error instanceof ApiError) {
    if (error.code === "not_found") {
      return {
        title: "This record was not found",
        body: "It may not exist, or it is not part of your organization.",
      };
    }
    if (error.code === "forbidden" || error.code === "not_on_care_team") {
      return {
        title: "You cannot do this",
        body:
          error.code === "not_on_care_team"
            ? "Only members of this patient's care team can make this change. Nothing was changed."
            : "Your role does not include this. Nothing was changed.",
      };
    }
    if (error.code === "service_unavailable") {
      return {
        title: "The service is not reachable",
        body: "Nothing was changed. Check your connection and try again.",
      };
    }
    return { title: "Something went wrong", body: `${error.message} Nothing was changed.` };
  }
  return { title: "Something went wrong", body: "Nothing was changed. Try again." };
}

export function QueryError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { title, body } = errorText(error);
  return (
    <Banner
      tone="error"
      title={title}
      action={
        onRetry ? (
          <Button variant="neutral" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : undefined
      }
    >
      {body}
    </Banner>
  );
}

/** Skeleton rows that mirror a list. Static by design. */
export function ListSkeleton({ rows = 4, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <SkeletonGroup label={label} className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </SkeletonGroup>
  );
}

/** A titled section with an optional count and actions. The count is always words plus number. */
export function Section({
  id,
  title,
  count,
  description,
  actions,
  children,
  className,
}: {
  id?: string;
  title: string;
  count?: number;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section
      aria-labelledby={headingId}
      className={cx("rounded-container border border-border bg-surface", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 id={headingId} className="font-heading text-h4 font-semibold text-ink">
            {title}
            {typeof count === "number" ? (
              <span className="ml-2 font-normal text-ink-muted tabular-nums">{count}</span>
            ) : null}
          </h2>
          {description ? <p className="mt-0.5 text-small text-ink-muted">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div>{children}</div>
    </section>
  );
}

/** Patient status is administrative, so it is an outlined tag. One shared map and tone (CD-231). */
export function PatientStatusTag({ status }: { status: PatientStatus }) {
  const entry = patientStatusLabels[status];
  return <Tag tone={entry.tone}>{entry.label}</Tag>;
}

export const planStageText: (stage: PlanStage, version: number | null) => string =
  sharedPlanStageText;

/** Patient-reported pain. Always worded as reported, never as a judgement. */
export function PainText({ score }: { score: number }) {
  return (
    <span className="tabular-nums">
      Pain {ofTotal(score, 10)} <span className="text-ink-muted">({PATIENT_REPORTED})</span>
    </span>
  );
}

export function ReviewedChip({ reviewedAt }: { reviewedAt: string | null }) {
  return reviewedAt ? (
    <StatusChip tone="success">{checkInReviewLabels.reviewed.label}</StatusChip>
  ) : (
    <StatusChip tone="warning" icon="clock">
      {checkInReviewLabels.notReviewed.label}
    </StatusChip>
  );
}

export function EmptyDirectory({ filtered, onClear }: { filtered: boolean; onClear?: () => void }) {
  return (
    <EmptyState
      icon="users"
      title={filtered ? "No patients match these filters" : "No patients yet"}
      {...(filtered && onClear
        ? {
            action: (
              <Button variant="quiet" onClick={onClear}>
                Clear filters
              </Button>
            ),
          }
        : {})}
    >
      {filtered
        ? "No patient fits the search and filters together. Clear a filter or check the spelling."
        : "Patients appear here once they finish onboarding."}
    </EmptyState>
  );
}

/** Review task status in words. The API enum never reaches the screen. */
export const taskStatusText: Record<string, string> = Object.fromEntries(
  Object.entries(reviewTaskStatusLabels).map(([k, v]) => [k, v.label]),
);

/** Why an action is unavailable to a clinician who is not on the patient's care team (CR-2). */
export const NOT_ON_CARE_TEAM_REASON =
  "You are not on this patient's care team. Only care-team members can do this. Ask the primary therapist to add you.";
