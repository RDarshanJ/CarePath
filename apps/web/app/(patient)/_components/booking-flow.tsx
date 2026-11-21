"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  appointmentSchema,
  slotListSchema,
  type Appointment,
  type AppointmentType,
  type OpenSlot,
} from "@carepath/shared/contracts";
import {
  Avatar,
  Banner,
  Button,
  Field,
  Heading,
  Panel,
  Radio,
  RadioGroup,
  SkeletonGroup,
  Skeleton,
  Textarea,
  SlotButton,
  ToggleChip,
  ToggleChipGroup,
  LoadMore,
} from "@carepath/ui";
import { api } from "../../../lib/api/client";
import { ApiError } from "../../../lib/api/errors";
import { formatInstantDate, formatLocalDate, weekdayOfLocalDate } from "../_lib/format";
import {
  addLocalDays,
  clinicDate,
  filterDays,
  firstPart,
  formatClock,
  formatRange,
  listWords,
  minutesBetween,
  timeOfDay,
  timeOfDayHints,
  timeOfDayLabels,
  typeHints,
  typeLabels,
  zoneName,
  type TimeOfDay,
} from "../_lib/scheduling";

export interface BookingTherapist {
  practitionerId: string;
  name: string;
  credentials: string | null;
  roleLabel: string;
  since: string;
}

export interface BookingFlowProps {
  patientId: string;
  mode: "book" | "reschedule";
  therapists: BookingTherapist[];
  /** The clinic's zone and its current calendar day, both from the API. */
  timezone: string;
  today: string;
  /** What the patient said at intake. Preselects the filters; never asked again. */
  availability: { days: number[]; times: TimeOfDay[] } | null;
  defaultType: AppointmentType;
  /** Reschedule only: the visit being moved. Its therapist and type stay as they are. */
  current?: Appointment;
}

const DAYS_AHEAD = 28;
const DAYS_PER_PAGE = 6;

interface Notice {
  code: "booking_conflict" | "slot_unavailable";
  takenAt: string;
}

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/**
 * Appointment booking and rescheduling (REQ-APT-01 to 05). Open times come from the API as a list
 * grouped by clinic-zone day, with the zone named; there is no calendar grid and nothing to drag.
 * The availability given at intake preselects the day and time filters, so the patient is never
 * asked for it again. A time taken a moment before shows "That time was just taken", refreshes the
 * list, keeps the visit type and filters, and offers the nearest open times (AC-E8).
 */
export function BookingFlow({
  patientId,
  mode,
  therapists,
  timezone,
  today,
  availability,
  defaultType,
  current,
}: BookingFlowProps) {
  const router = useRouter();
  const rescheduling = mode === "reschedule" && current !== undefined;
  const [practitionerId, setPractitionerId] = useState(
    (rescheduling ? current.practitioner.practitionerId : null) ??
      therapists[0]?.practitionerId ??
      "",
  );
  const [type, setType] = useState<AppointmentType>(rescheduling ? current.type : defaultType);
  const [days, setDays] = useState<Set<number>>(new Set(availability?.days ?? []));
  const [times, setTimes] = useState<Set<TimeOfDay>>(new Set(availability?.times ?? []));
  const [visibleDays, setVisibleDays] = useState(DAYS_PER_PAGE);
  const [selected, setSelected] = useState<OpenSlot | null>(null);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);

  const therapist = therapists.find((t) => t.practitionerId === practitionerId);
  const from = today;
  const to = addLocalDays(today, DAYS_AHEAD - 1);
  const slotsKey = ["patient", "slots", practitionerId, type, from] as const;
  const slots = useQuery({
    queryKey: slotsKey,
    enabled: practitionerId !== "",
    staleTime: 0,
    queryFn: () =>
      api.get(
        `/practitioners/${practitionerId}/slots?from=${from}&to=${to}&type=${type}`,
        slotListSchema,
      ),
  });

  const filtered = useMemo(() => {
    const out: { date: string; slots: OpenSlot[] }[] = [];
    for (const day of slots.data?.days ?? []) {
      if (days.size > 0 && !days.has(weekdayOfLocalDate(day.date))) continue;
      const list = day.slots.filter(
        (s) => times.size === 0 || times.has(timeOfDay(s.startsAt, timezone)),
      );
      if (list.length > 0) out.push({ date: day.date, slots: list });
    }
    return out;
  }, [slots.data, days, times, timezone]);

  const totalOpen = useMemo(
    () => (slots.data?.days ?? []).reduce((n, d) => n + d.slots.length, 0),
    [slots.data],
  );

  const alternatives = useMemo(() => {
    if (!notice) return [];
    const all = (slots.data?.days ?? []).flatMap((d) => d.slots);
    const at = new Date(notice.takenAt).getTime();
    return [...all]
      .sort(
        (a, b) =>
          Math.abs(new Date(a.startsAt).getTime() - at) -
          Math.abs(new Date(b.startsAt).getTime() - at),
      )
      .slice(0, 3)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [notice, slots.data]);

  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);
  useEffect(() => {
    if (selected) document.getElementById("booking-heading")?.focus();
  }, [selected]);

  const filtersOn = days.size > 0 || times.size > 0;
  const zone = zoneName(timezone);
  const heading = rescheduling ? "Choose a new time" : "Book a visit";

  function pick(slot: OpenSlot) {
    setSelected(slot);
    setNotice(null);
    setError(null);
  }

  function back() {
    setSelected(null);
    setError(null);
    setTimeout(() => document.getElementById("booking-heading")?.focus(), 0);
  }

  async function confirm() {
    if (!selected) return;
    setPending(true);
    setError(null);
    try {
      const saved = rescheduling
        ? await api.post(
            `/patients/${patientId}/appointments/${current.id}/reschedule`,
            appointmentSchema,
            { slotId: selected.id },
          )
        : await api.post(`/patients/${patientId}/appointments`, appointmentSchema, {
            slotId: selected.id,
            type,
            reason: reason.trim() === "" ? null : reason.trim(),
          });
      router.push(`/appointments?${rescheduling ? "moved" : "booked"}=${saved.id}`);
      router.refresh();
    } catch (err) {
      setPending(false);
      if (
        err instanceof ApiError &&
        (err.code === "booking_conflict" || err.code === "slot_unavailable")
      ) {
        setNotice({ code: err.code, takenAt: selected.startsAt });
        setSelected(null);
        await slots.refetch();
        return;
      }
      setError(
        rescheduling
          ? "Your visit was not moved, and your current visit is unchanged. Check your connection and try again."
          : "Your visit was not booked, and nothing was changed. Check your connection and try again.",
      );
    }
  }

  const intro = (
    <header className="flex flex-col gap-1.5">
      <Heading level={1} tabIndex={-1} id="booking-heading">
        {heading}
      </Heading>
      <p className="max-w-measure text-body text-ink-muted">
        {rescheduling
          ? `Your current visit stays as it is until the new time is confirmed.`
          : "Pick a visit type, then a time. You see the open times before you commit to one."}
      </p>
    </header>
  );

  if (therapists.length === 0 || !therapist) {
    return (
      <div className="flex flex-col gap-5">
        {intro}
        <Banner tone="info" title="No therapist to book with yet">
          You can book once a therapist is assigned to you. Your care team will let you know.
        </Banner>
      </div>
    );
  }

  /* ---------- Step 2: check and confirm ---------- */
  if (selected) {
    const when = formatLocalDate(clinicDate(selected.startsAt, timezone));
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1.5">
          <Heading level={1} tabIndex={-1} id="booking-heading">
            {rescheduling ? "Confirm the new time" : "Check and confirm"}
          </Heading>
          <p className="max-w-measure text-body text-ink-muted">
            Nothing is booked until you confirm.
          </p>
        </header>
        <Panel className="p-5">
          <dl className="flex flex-col gap-3 text-body">
            <div className="flex flex-col sm:flex-row sm:gap-4">
              <dt className="text-ink-muted sm:w-28 sm:shrink-0">Therapist</dt>
              <dd className="font-medium">{firstPart(therapist.name)}</dd>
            </div>
            <div className="flex flex-col sm:flex-row sm:gap-4">
              <dt className="text-ink-muted sm:w-28 sm:shrink-0">Visit</dt>
              <dd className="font-medium">{typeLabels[type]}</dd>
            </div>
            <div className="flex flex-col sm:flex-row sm:gap-4">
              <dt className="text-ink-muted sm:w-28 sm:shrink-0">Day</dt>
              <dd className="font-medium">{when}</dd>
            </div>
            <div className="flex flex-col sm:flex-row sm:gap-4">
              <dt className="text-ink-muted sm:w-28 sm:shrink-0">Time</dt>
              <dd className="font-medium">
                {formatRange(selected.startsAt, selected.endsAt, timezone)}
                <span className="block text-small font-normal text-ink-muted">{zone}</span>
              </dd>
            </div>
            <div className="flex flex-col sm:flex-row sm:gap-4">
              <dt className="text-ink-muted sm:w-28 sm:shrink-0">Length</dt>
              <dd className="font-medium">
                {minutesBetween(selected.startsAt, selected.endsAt)} minutes
              </dd>
            </div>
          </dl>
          {rescheduling ? (
            <p className="mt-4 border-t border-border pt-4 text-body text-ink-muted">
              This replaces your visit on {formatInstantDate(current.startsAt, timezone)} at{" "}
              {formatClock(current.startsAt, timezone)}.
            </p>
          ) : null}
        </Panel>
        {rescheduling ? null : (
          <Field
            label="What would you like to work on"
            requirement="optional"
            why="Your therapist will see this before the visit."
          >
            {(control) => (
              <Textarea
                {...control}
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </Field>
        )}
        {error ? (
          <Banner tone="error" title={rescheduling ? "Not moved" : "Not booked"}>
            {error}
          </Banner>
        ) : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={back} disabled={pending}>
            Choose a different time
          </Button>
          <Button onClick={confirm} loading={pending} loadingLabel="Confirming">
            {rescheduling ? "Confirm new time" : "Confirm booking"}
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- Step 1: therapist, type, filters, times ---------- */
  return (
    <div className="flex flex-col gap-7">
      {intro}

      {notice ? (
        <div ref={noticeRef} tabIndex={-1} className="rounded-container focus-visible:focus-ring">
          <Banner
            tone="error"
            title={
              notice.code === "booking_conflict"
                ? "That time was just taken"
                : "That time can no longer be booked"
            }
          >
            <p>
              {rescheduling
                ? "Your current visit is unchanged."
                : "Nothing was booked and nothing else changed."}{" "}
              The list below is up to date.
              {alternatives.length > 0 ? " The closest open times are:" : ""}
            </p>
            {alternatives.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {alternatives.map((s) => (
                  <li key={s.id}>
                    <SlotButton
                      time={`${formatInstantDate(s.startsAt, timezone)}, ${formatClock(s.startsAt, timezone)}`}
                      fullLabel={`${formatInstantDate(s.startsAt, timezone)}, ${formatClock(s.startsAt, timezone)}`}
                      onClick={() => pick(s)}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </Banner>
        </div>
      ) : null}

      {rescheduling ? (
        <Panel className="flex flex-col gap-1 p-4 text-body">
          <p className="text-small font-medium text-ink-muted">Your current visit</p>
          <p className="font-medium">
            {formatLocalDate(current.date)},{" "}
            {formatRange(current.startsAt, current.endsAt, timezone)}
          </p>
          <p className="text-ink-muted">
            {typeLabels[current.type]} with {firstPart(current.practitioner.name)}
          </p>
        </Panel>
      ) : (
        <section aria-labelledby="therapist-heading" className="flex flex-col gap-3">
          <Heading level={2} id="therapist-heading">
            Your therapist
          </Heading>
          {therapists.length === 1 ? (
            <Panel className="flex items-start gap-3 p-4">
              <Avatar name={firstPart(therapist.name)} className="size-12 text-h4" />
              <div className="flex flex-col gap-0.5 text-body">
                <p className="font-semibold">{firstPart(therapist.name)}</p>
                <p className="text-ink-muted">
                  {[therapist.roleLabel, therapist.credentials].filter(Boolean).join(", ")}
                </p>
                <p className="text-small text-ink-muted">
                  On your care team since {formatInstantDate(therapist.since, timezone)}.
                </p>
              </div>
            </Panel>
          ) : (
            <RadioGroup
              aria-label="Therapist"
              value={practitionerId}
              onValueChange={(v) => {
                setPractitionerId(v);
                setNotice(null);
              }}
              className="gap-2"
            >
              {therapists.map((t) => (
                <Radio
                  key={t.practitionerId}
                  value={t.practitionerId}
                  label={firstPart(t.name)}
                  hint={[t.roleLabel, t.credentials].filter(Boolean).join(", ")}
                />
              ))}
            </RadioGroup>
          )}
        </section>
      )}

      {rescheduling ? null : (
        <section aria-labelledby="type-heading" className="flex flex-col gap-3">
          <Heading level={2} id="type-heading">
            Type of visit
          </Heading>
          <RadioGroup
            aria-labelledby="type-heading"
            value={type}
            onValueChange={(v) => {
              setType(v as AppointmentType);
              setNotice(null);
            }}
            className="gap-2"
          >
            {(Object.keys(typeLabels) as AppointmentType[]).map((t) => (
              <Radio key={t} value={t} label={typeLabels[t]} hint={typeHints[t]} />
            ))}
          </RadioGroup>
        </section>
      )}

      <section aria-labelledby="times-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Heading level={2} id="times-heading">
            Open times
          </Heading>
          <p className="text-body text-ink-muted">
            All times are in <span className="font-medium text-ink">{zone}</span>, the clinic&apos;s
            time zone.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-container border border-border bg-surface-sunken p-4">
          {availability ? (
            <p className="text-small text-ink-muted">
              Set from the availability you gave at intake:{" "}
              {listWords(
                filterDays.filter((d) => availability.days.includes(d.value)).map((d) => d.label),
              )}
              , {listWords(availability.times.map((t) => timeOfDayLabels[t].toLowerCase()))}. Change
              it here whenever you like.
            </p>
          ) : null}
          <ToggleChipGroup
            legend="Days"
            requirement="optional"
            hint="Leave all off to see every day."
          >
            {filterDays.map((d) => (
              <ToggleChip
                key={d.value}
                label={d.label}
                shortLabel={d.label.slice(0, 3)}
                pressed={days.has(d.value)}
                onPressedChange={() => {
                  setDays(toggle(days, d.value));
                  setVisibleDays(DAYS_PER_PAGE);
                }}
              />
            ))}
          </ToggleChipGroup>
          <ToggleChipGroup legend="Time of day" requirement="optional">
            {(Object.keys(timeOfDayLabels) as TimeOfDay[]).map((t) => (
              <ToggleChip
                key={t}
                label={timeOfDayLabels[t]}
                description={timeOfDayHints[t]}
                pressed={times.has(t)}
                onPressedChange={() => {
                  setTimes(toggle(times, t));
                  setVisibleDays(DAYS_PER_PAGE);
                }}
              />
            ))}
          </ToggleChipGroup>
        </div>

        <div aria-live="polite" className="flex flex-col gap-5">
          {slots.isPending ? (
            <SkeletonGroup label="Loading open times">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-12 w-full" />
            </SkeletonGroup>
          ) : slots.isError ? (
            <Banner
              tone="error"
              title="Open times did not load"
              action={
                <Button variant="secondary" size="sm" onClick={() => void slots.refetch()}>
                  Try again
                </Button>
              }
            >
              Nothing was booked or changed. Check your connection and try again.
            </Banner>
          ) : totalOpen === 0 ? (
            <p className="max-w-measure text-body">
              {firstPart(therapist.name)} has no open {typeLabels[type].toLowerCase()} times in the
              next {DAYS_AHEAD / 7} weeks. Try another type of visit, or contact your care team.
            </p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="max-w-measure text-body">
                No open times match the days and times you picked in the next {DAYS_AHEAD / 7}{" "}
                weeks. There are {totalOpen} open times on other days.
              </p>
              {filtersOn ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDays(new Set());
                    setTimes(new Set());
                  }}
                >
                  Show every day and time
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              {filtered.slice(0, visibleDays).map((day) => (
                <section
                  key={day.date}
                  aria-labelledby={`day-${day.date}`}
                  className="flex flex-col gap-2"
                >
                  <Heading level={3} id={`day-${day.date}`}>
                    {formatLocalDate(day.date)}
                  </Heading>
                  <ul className="flex flex-wrap gap-2">
                    {day.slots.map((s) => (
                      <li key={s.id}>
                        <SlotButton
                          className="min-w-28"
                          time={formatClock(s.startsAt, timezone)}
                          fullLabel={`${formatLocalDate(day.date, "short")}, ${formatClock(s.startsAt, timezone)}`}
                          onClick={() => pick(s)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              <LoadMore
                label="Show later days"
                noun="days"
                hasMore={filtered.length > visibleDays}
                shown={Math.min(visibleDays, filtered.length)}
                onLoadMore={() => setVisibleDays(visibleDays + DAYS_PER_PAGE)}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
