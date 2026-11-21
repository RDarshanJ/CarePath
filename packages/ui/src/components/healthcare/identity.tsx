"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  formatBornText,
  formatRecordAsOf,
  formatTime,
  patientStatusLabels,
} from "@carepath/shared";
import type { CareTeamCard, PatientHeader } from "@carepath/shared/contracts";
import { cx } from "../../lib/cx";
import { Icon } from "../primitives/icons";
import { Link } from "../primitives/link";
import { Skeleton } from "../primitives/surfaces";
import { Tag } from "../primitives/status";
import { Mono } from "../primitives/text";
import {
  NOT_RECORDED,
  bornSpokenText,
  bornWithAgeText,
  genderLabels,
  languageText,
  patientName,
} from "./identity-text";

/*
 * Patient identity (CD-200 to CD-204). Presentation only: the record passes the header it already
 * fetched. The banner exists on single-patient screens only; lists use `PatientRowIdentity`.
 */

export type CareTeamMember = CareTeamCard["members"][number];

/** Share of the viewport above which the banner stops being sticky (CD-203, a judgement to test). */
export const BANNER_UNSTICK_RATIO = 0.3;

export interface PatientBannerProps {
  patient: PatientHeader;
  /** Clinic-zone calendar day (`YYYY-MM-DD`) the age is computed against. */
  today: string;
  /** The clinic's zone, for "Record as of". */
  clinicZone: string;
  /** When the record data on screen was read (J). Null hides the stamp. */
  recordAsOf?: string | null;
  /** Care team for Zone 2. `undefined` while it loads, `null` when it could not be read. */
  careTeam?: CareTeamMember[] | null;
  /** The record shows data read before the connection dropped (J). */
  offline?: boolean;
  /** Sticky at the top of the record; it unsticks when taller than 30 percent of the window. */
  sticky?: boolean;
  /** Heading element for the name: the name is the record page's h1 (CD-200). */
  nameAs?: "h1" | "h2";
  className?: string;
}

function useUnstickWhenTall(enabled: boolean) {
  const ref = useRef<HTMLElement>(null);
  const [tall, setTall] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof window === "undefined") return;
    const check = () => setTall(el.offsetHeight > window.innerHeight * BANNER_UNSTICK_RATIO);
    check();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(check);
    ro?.observe(el);
    window.addEventListener("resize", check);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [enabled]);
  return { ref, stuck: enabled && !tall };
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="text-small text-ink break-words">{children}</dd>
    </div>
  );
}

/**
 * Identity-only banner (CD-200). Zone 1 is always visible: name, MRN, born with age, status Tag and the
 * "Record as of" stamp. Zone 2 opens from the "Patient details" button: gender, language, time zone and
 * care team, with "Not recorded" for anything missing. Below 1024 px the first line is compact; below
 * 768 px the born line moves into Zone 2 (CD-203). The page title never carries the name (R2).
 */
export function PatientBanner({
  patient,
  today,
  clinicZone,
  recordAsOf,
  careTeam,
  offline = false,
  sticky = true,
  nameAs: NameTag = "h1",
  className,
}: PatientBannerProps) {
  const [open, setOpen] = useState(false);
  const zoneId = useId();
  const { ref, stuck } = useUnstickWhenTall(sticky);
  const name = patientName(patient);
  const status = patientStatusLabels[patient.status];
  const born = bornWithAgeText(patient.birthDate, today);
  return (
    <section
      ref={ref}
      aria-label="Patient"
      data-sticky-bar={stuck ? "" : undefined}
      data-banner-stuck={stuck ? "true" : "false"}
      className={cx(
        "z-20 border-b border-border bg-surface px-gutter py-2 lg:py-3",
        stuck && "sticky top-0",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <NameTag className="min-w-0 text-h3 font-semibold break-words text-ink lg:text-h1">
          {name}
        </NameTag>
        <span className="text-small text-ink">
          <span className="text-ink-muted">MRN</span>{" "}
          <Mono className="select-all text-ink">{patient.mrn}</Mono>
        </span>
        <span aria-hidden="true" className="hidden text-small text-ink md:inline">
          {born}
        </span>
        <span className="sr-only">{bornSpokenText(patient.birthDate, today)}</span>
        <Tag tone={status.tone}>
          <span className="sr-only">Status </span>
          {status.label}
        </Tag>
        {recordAsOf ? (
          <span className="hidden text-caption text-ink-muted lg:inline">
            {formatRecordAsOf(recordAsOf, clinicZone)}
          </span>
        ) : null}
      </div>
      {offline && recordAsOf ? (
        <p className="mt-1 flex items-center gap-1.5 text-small text-warning-ink">
          <Icon name="alert-triangle" size={16} />
          You are offline. This record is from {formatTime(recordAsOf, clinicZone)}.
        </p>
      ) : null}
      <div className="mt-1">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={zoneId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-h-target items-center gap-1 rounded-control text-label font-medium text-link hover:text-primary-hover focus-visible:focus-ring"
        >
          Patient details
          <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
        </button>
      </div>
      <div id={zoneId} hidden={!open} className="pt-2 pb-1">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          <div aria-hidden="true" className="md:hidden">
            <DetailRow label="Born">{born.replace(/^Born /, "")}</DetailRow>
          </div>
          {recordAsOf ? (
            <div className="lg:hidden">
              <DetailRow label="Record">{formatRecordAsOf(recordAsOf, clinicZone)}</DetailRow>
            </div>
          ) : null}
          <DetailRow label="Gender">{genderLabels[patient.gender]}</DetailRow>
          <DetailRow label="Preferred language">
            {languageText(patient.preferredLanguage)}
          </DetailRow>
          <DetailRow label="Time zone">{patient.timezone || NOT_RECORDED}</DetailRow>
          <DetailRow label="Care team">
            {careTeam === undefined ? (
              "Loading care team"
            ) : careTeam === null ? (
              "Care team could not be loaded"
            ) : careTeam.length === 0 ? (
              "No therapist assigned"
            ) : (
              <ul>
                {careTeam.map((m) => (
                  <li key={m.userId}>
                    {m.name}
                    {m.credentials ? `, ${m.credentials}` : ""}{" "}
                    <span className="text-ink-muted">({m.roleLabel})</span>
                  </li>
                ))}
              </ul>
            )}
          </DetailRow>
        </dl>
        {patient.onCareTeam === false ? (
          <p className="mt-2 text-small text-ink">You are not on this patient&apos;s care team.</p>
        ) : null}
      </div>
    </section>
  );
}

/** Loading form of the banner: "Loading patient" in words, skeleton lines for the name and MRN. */
export function PatientBannerSkeleton({ className }: { className?: string }) {
  return (
    <section
      aria-label="Patient"
      aria-busy="true"
      className={cx("border-b border-border bg-surface px-gutter py-3", className)}
    >
      <p className="sr-only">Loading patient</p>
      <div aria-hidden="true" className="flex flex-wrap items-center gap-4">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-40" />
      </div>
    </section>
  );
}

export interface PatientRowIdentityProps {
  patient: { givenName: string; familyName: string; birthDate: string };
  /** Opens the record. Without it the name is plain text (read-only counts, thread headers). */
  href?: string;
  /** Show the muted "Born" line (CD-204): wherever the row opens or acts on a patient. */
  showBorn?: boolean;
  className?: string;
}

/**
 * Name plus a muted "Born Mar 3, 1989" line for any row that opens or acts on a patient (CD-204). No
 * banner, avatar or photo on lists. The link text stays the patient's name.
 */
export function PatientRowIdentity({
  patient,
  href,
  showBorn = true,
  className,
}: PatientRowIdentityProps) {
  const name = patientName(patient);
  return (
    <span className={cx("flex min-w-0 flex-col", className)}>
      {href ? (
        <Link href={href} className="font-medium break-words">
          {name}
        </Link>
      ) : (
        <span className="font-medium break-words text-ink">{name}</span>
      )}
      {showBorn ? (
        <span className="text-small text-ink-muted">{formatBornText(patient.birthDate)}</span>
      ) : null}
    </span>
  );
}
