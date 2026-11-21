"use client";

import type { ReactNode } from "react";
import { EMERGENCY_NOTICE } from "@carepath/shared";
import { CONSENT_TEXT_VERSIONS, type IntakeStep } from "@carepath/shared/contracts";
import {
  Button,
  Checkbox,
  DateOfBirthField,
  Field,
  FieldGroup,
  PainScale,
  Radio,
  RadioGroup,
  TextInput,
  Textarea,
  Link,
  type DateParts,
} from "@carepath/ui";
import { ConsentWording } from "../../_components/consent-wording";
import { formatLocalDate } from "../../_lib/format";
import {
  bodyAreaOptions,
  dayOptions,
  limitationLabels,
  localToday,
  sideLabels,
  timeLabels,
  type OnboardingForm,
} from "../_lib/onboarding";

export interface StepProps {
  form: OnboardingForm;
  update: (fn: (f: OnboardingForm) => OnboardingForm) => void;
  errorFor: (field: string) => string | undefined;
}

/** `exactOptionalPropertyTypes` friendly: pass `error` only when there is one. */
export function optErr(message: string | undefined): { error?: string } {
  return message ? { error: message } : {};
}

const grid = "grid gap-x-6 sm:grid-cols-2";

/* ---------- Steps 1 and 2: held in memory until the account is created ---------- */

export function CodeStep({
  code,
  setCode,
  dob,
  setDob,
  errorFor,
}: {
  code: string;
  setCode: (v: string) => void;
  dob: DateParts;
  setDob: (v: DateParts) => void;
  errorFor: (field: string) => string | undefined;
}) {
  return (
    <>
      <p className="max-w-measure text-body">
        About 10 minutes. Steps 1 and 2 create your account. After that, every step you finish is
        saved, so you can stop and sign in later to carry on where you left off.
      </p>
      <Field
        id="ob-code"
        label="Eligibility code"
        requirement="required"
        why="This confirms your clinic invited you. Nothing is created until it is accepted."
        hint="Paste it if you can. Spaces and capital letters do not matter."
        {...optErr(errorFor("ob-code"))}
      >
        {(c) => (
          <TextInput
            {...c}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        )}
      </Field>
      <DateOfBirthField
        id="ob-dob"
        requirement="required"
        why="The clinic uses it to match you to your record. Only your care team sees it."
        value={dob}
        onChange={setDob}
        today={localToday()}
        {...optErr(errorFor("ob-dob-day"))}
      />
    </>
  );
}

export function AccountStep({
  form,
  update,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  errorFor,
}: StepProps & {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
}) {
  const setPersonal = (patch: Partial<OnboardingForm["personal"]>) =>
    update((f) => ({ ...f, personal: { ...f.personal, ...patch } }));
  return (
    <>
      <Field
        id="ob-given"
        label="First name"
        requirement="required"
        {...optErr(errorFor("ob-given"))}
      >
        {(c) => (
          <TextInput
            {...c}
            autoComplete="given-name"
            value={form.personal.givenName}
            onChange={(e) => setPersonal({ givenName: e.target.value })}
          />
        )}
      </Field>
      <Field
        id="ob-family"
        label="Last name"
        requirement="required"
        {...optErr(errorFor("ob-family"))}
      >
        {(c) => (
          <TextInput
            {...c}
            autoComplete="family-name"
            value={form.personal.familyName}
            onChange={(e) => setPersonal({ familyName: e.target.value })}
          />
        )}
      </Field>
      <Field
        id="ob-email"
        label="Email"
        requirement="required"
        why="You will sign in with this. The clinic may use it to reach you."
        {...optErr(errorFor("ob-email"))}
      >
        {(c) => (
          <TextInput
            {...c}
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>
      <div className="flex flex-col gap-1">
        <Field
          id="ob-password"
          label="Create a password"
          requirement="required"
          hint="At least 12 characters. Pasting and password managers work."
          {...optErr(errorFor("ob-password"))}
        >
          {(c) => (
            <TextInput
              {...c}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <Checkbox
          label="Show password"
          id="show-password"
          checked={showPassword}
          onCheckedChange={(v) => setShowPassword(v === true)}
        />
      </div>
      <p className="max-w-measure text-small text-ink-muted">
        This page keeps what you type only until you leave it. If you reload before you create your
        account, you will start again.
      </p>
    </>
  );
}

/* ---------- Steps 3 to 9: saved when you continue ---------- */

export function AboutStep({ form, update, errorFor }: StepProps) {
  const setPersonal = (patch: Partial<OnboardingForm["personal"]>) =>
    update((f) => ({ ...f, personal: { ...f.personal, ...patch } }));
  return (
    <>
      <dl className="flex flex-col gap-2 border-b border-border pb-4 text-body">
        <div>
          <dt className="text-small text-ink-muted">Name</dt>
          <dd className="font-medium">
            {form.personal.givenName} {form.personal.familyName}
          </dd>
        </div>
        <div>
          <dt className="text-small text-ink-muted">Date of birth</dt>
          <dd className="font-medium">
            {form.personal.birthDate ? formatLocalDate(form.personal.birthDate, "full") : ""}
          </dd>
        </div>
      </dl>
      <Field
        id="ob-phone"
        label="Phone number"
        requirement="optional"
        why="The clinic uses it only for visits and urgent questions about your care. Leave it blank if you prefer not to say."
        {...optErr(errorFor("ob-phone"))}
      >
        {(c) => (
          <TextInput
            {...c}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.personal.phone}
            onChange={(e) => setPersonal({ phone: e.target.value })}
          />
        )}
      </Field>
      <FieldGroup
        legend="Preferred language"
        requirement="required"
        {...optErr(errorFor("lang-en"))}
      >
        <RadioGroup
          value={form.personal.preferredLanguage}
          aria-label="Preferred language"
          onValueChange={(v) => setPersonal({ preferredLanguage: v === "es" ? "es" : "en" })}
        >
          <Radio id="lang-en" value="en" label="English" />
          <Radio id="lang-es" value="es" label="Español (Spanish)" />
        </RadioGroup>
      </FieldGroup>
    </>
  );
}

export function GoalStep({ form, update, errorFor }: StepProps) {
  return (
    <Field
      id="ob-goal"
      label="What would you like to be able to do?"
      requirement="required"
      why="Your therapist reads this first and builds your plan around it."
      hint="For example: walk to the shop without stopping, or pick up my grandchild."
      count={{ length: form.goal.length, max: 500 }}
      {...optErr(errorFor("ob-goal"))}
    >
      {(c) => (
        <Textarea
          {...c}
          rows={5}
          maxLength={500}
          value={form.goal}
          onChange={(e) => update((f) => ({ ...f, goal: e.target.value }))}
        />
      )}
    </Field>
  );
}

export function BodyStep({ form, update, errorFor }: StepProps) {
  return (
    <>
      <FieldGroup legend="Area" requirement="required" {...optErr(errorFor("area-first"))}>
        <RadioGroup
          value={form.bodyArea}
          aria-label="Area"
          onValueChange={(v) => update((f) => ({ ...f, bodyArea: v }))}
          className={grid}
        >
          {bodyAreaOptions.map((o, i) => (
            <Radio
              key={o.value}
              id={i === 0 ? "area-first" : `area-${o.value.replace(/\W+/g, "-")}`}
              value={o.value}
              label={o.label}
            />
          ))}
        </RadioGroup>
      </FieldGroup>
      <FieldGroup legend="Side" requirement="required" {...optErr(errorFor("side-left"))}>
        <RadioGroup
          value={form.side}
          aria-label="Side"
          onValueChange={(v) => update((f) => ({ ...f, side: v }))}
        >
          {Object.entries(sideLabels).map(([value, label]) => (
            <Radio key={value} id={`side-${value}`} value={value} label={label} />
          ))}
        </RadioGroup>
      </FieldGroup>
    </>
  );
}

export function PainStep({ form, update, errorFor }: StepProps) {
  const set = (key: "current" | "worst" | "best", v: number) =>
    update((f) => ({ ...f, pain: { ...f.pain, [key]: v } }));
  return (
    <>
      <PainScale
        id="pain-current"
        label="How much does it hurt right now?"
        value={form.pain.current}
        onValueChange={(v) => set("current", v)}
        {...optErr(errorFor("pain-current"))}
      />
      <PainScale
        id="pain-worst"
        label="At its worst in the last week?"
        value={form.pain.worst}
        onValueChange={(v) => set("worst", v)}
        {...optErr(errorFor("pain-worst"))}
      />
      <PainScale
        id="pain-best"
        label="At its best in the last week?"
        value={form.pain.best}
        onValueChange={(v) => set("best", v)}
        {...optErr(errorFor("pain-best"))}
      />
      <p className="max-w-measure text-small text-ink-muted">
        These are your own ratings, and your therapist will see them. If you are worried about how
        you feel right now, contact your clinic. {EMERGENCY_NOTICE}
      </p>
    </>
  );
}

export function LimitationsStep({ form, update, errorFor }: StepProps) {
  return (
    <>
      <FieldGroup
        legend="Activities that are harder"
        requirement="optional"
        hint="Choose all that apply."
      >
        <div className={grid}>
          {Object.entries(limitationLabels).map(([value, label]) => (
            <Checkbox
              key={value}
              id={`lim-${value}`}
              label={label}
              checked={form.limitations.includes(value)}
              onCheckedChange={(v) =>
                update((f) => ({
                  ...f,
                  limitationsNone: false,
                  limitations:
                    v === true
                      ? [...f.limitations, value]
                      : f.limitations.filter((x) => x !== value),
                }))
              }
            />
          ))}
        </div>
        <div className="border-t border-border pt-2">
          <Checkbox
            id="lim-none"
            label="None of these"
            checked={form.limitationsNone}
            onCheckedChange={(v) =>
              update((f) =>
                v === true
                  ? { ...f, limitationsNone: true, limitations: [] }
                  : { ...f, limitationsNone: false },
              )
            }
          />
        </div>
      </FieldGroup>
      <Field
        id="ob-other"
        label="Anything else that is hard?"
        requirement="optional"
        {...optErr(errorFor("ob-other"))}
      >
        {(c) => (
          <Textarea
            {...c}
            rows={3}
            maxLength={500}
            value={form.limitationsOther}
            onChange={(e) => update((f) => ({ ...f, limitationsOther: e.target.value }))}
          />
        )}
      </Field>
    </>
  );
}

export function PreferencesStep({ form, update, errorFor }: StepProps) {
  const set = (patch: Partial<OnboardingForm["preferences"]>) =>
    update((f) => ({ ...f, preferences: { ...f.preferences, ...patch } }));
  return (
    <>
      <FieldGroup legend="Therapist gender" requirement="optional">
        <RadioGroup
          value={form.preferences.gender}
          aria-label="Therapist gender"
          onValueChange={(v) => set({ gender: v })}
        >
          <Radio id="pg-none" value="no_preference" label="No preference" />
          <Radio id="pg-female" value="female" label="Female" />
          <Radio id="pg-male" value="male" label="Male" />
        </RadioGroup>
      </FieldGroup>
      <FieldGroup legend="Therapist language" requirement="optional">
        <RadioGroup
          value={form.preferences.language}
          aria-label="Therapist language"
          onValueChange={(v) => set({ language: v })}
        >
          <Radio id="pl-none" value="no_preference" label="No preference" />
          <Radio id="pl-en" value="en" label="English" />
          <Radio id="pl-es" value="es" label="Español (Spanish)" />
        </RadioGroup>
      </FieldGroup>
      <Field
        id="ob-notes"
        label="Anything else the clinic should know?"
        requirement="optional"
        why="For example, access needs or the best way to reach you."
        {...optErr(errorFor("ob-notes"))}
      >
        {(c) => (
          <Textarea
            {...c}
            rows={3}
            maxLength={500}
            value={form.preferences.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        )}
      </Field>
    </>
  );
}

export function AvailabilityStep({ form, update, errorFor }: StepProps) {
  const toggle = <T extends number | string>(list: T[], value: T, on: boolean): T[] =>
    on ? [...list, value] : list.filter((x) => x !== value);
  return (
    <>
      <FieldGroup
        legend="Days that could work"
        requirement="required"
        hint="Choose all that apply."
        {...optErr(errorFor("day-1"))}
      >
        <div className={grid}>
          {dayOptions.map((d) => (
            <Checkbox
              key={d.value}
              id={`day-${d.value}`}
              label={d.label}
              checked={form.availability.days.includes(d.value)}
              onCheckedChange={(v) =>
                update((f) => ({
                  ...f,
                  availability: {
                    ...f.availability,
                    days: toggle(f.availability.days, d.value, v === true),
                  },
                }))
              }
            />
          ))}
        </div>
      </FieldGroup>
      <FieldGroup
        legend="Times of day"
        requirement="required"
        hint="Choose all that apply."
        {...optErr(errorFor("time-morning"))}
      >
        {Object.entries(timeLabels).map(([value, label]) => (
          <Checkbox
            key={value}
            id={`time-${value}`}
            label={label}
            checked={form.availability.times.includes(value)}
            onCheckedChange={(v) =>
              update((f) => ({
                ...f,
                availability: {
                  ...f.availability,
                  times: toggle(f.availability.times, value, v === true),
                },
              }))
            }
          />
        ))}
      </FieldGroup>
    </>
  );
}

/* ---------- Step 10: consent (CD-142, CD-143) ---------- */

export function ConsentStep({
  form,
  update,
  errorFor,
  clinicPhone,
}: StepProps & { clinicPhone: string | null }) {
  return (
    <>
      <section aria-labelledby="c-required" className="flex flex-col gap-4">
        <ConsentWording type="treatment_and_data_use" headingId="c-required" />
        <FieldGroup
          legend="Your agreement"
          requirement="required"
          {...optErr(errorFor("consent-agree"))}
        >
          <Checkbox
            id="consent-agree"
            label="I agree to treatment and data use as described above."
            checked={form.consent.agree}
            onCheckedChange={(v) =>
              update((f) => ({ ...f, consent: { ...f.consent, agree: v === true } }))
            }
          />
        </FieldGroup>
        <p className="max-w-measure text-small text-ink-muted">
          If you do not agree, you can stop here. Your answers stay saved and nothing is deleted.
          Contact the clinic
          {clinicPhone ? (
            <>
              {" "}
              on <Link href={`tel:${clinicPhone.replace(/[^\d+]/g, "")}`}>{clinicPhone}</Link>
            </>
          ) : null}{" "}
          to talk it through.
        </p>
      </section>
      <section aria-labelledby="c-ai" className="flex flex-col gap-4 border-t border-border pt-8">
        <ConsentWording type="ai_assisted_features" headingId="c-ai" />
        <FieldGroup
          legend="Allow automated drafting tools?"
          requirement="required"
          {...optErr(errorFor("consent-ai-yes"))}
        >
          <RadioGroup
            aria-label="Allow automated drafting tools?"
            value={form.consent.ai === null ? "" : form.consent.ai ? "yes" : "no"}
            onValueChange={(v) =>
              update((f) => ({ ...f, consent: { ...f.consent, ai: v === "yes" } }))
            }
          >
            <Radio id="consent-ai-yes" value="yes" label="Yes, allow automated drafting tools" />
            <Radio id="consent-ai-no" value="no" label="No, do not allow them" />
          </RadioGroup>
        </FieldGroup>
      </section>
      <p className="max-w-measure text-small text-ink-muted">
        You can see and change the optional choice at any time in Sharing and consent, in the footer
        of every page. Wording version{" "}
        <span className="whitespace-nowrap">{CONSENT_TEXT_VERSIONS.treatment_and_data_use}</span>.
      </p>
    </>
  );
}

/* ---------- Step 11: review (GOV.UK check answers) ---------- */

export function ReviewStep({
  form,
  email,
  update,
  errorFor,
  onChange,
}: StepProps & { email: string; onChange: (step: ReviewRowStep) => void }) {
  const days = dayOptions
    .filter((d) => form.availability.days.includes(d.value))
    .map((d) => d.label);
  const rows: { step: ReviewRowStep; label: string; value: ReactNode }[] = [
    {
      step: "personal_information",
      label: "About you",
      value: (
        <>
          {form.personal.givenName} {form.personal.familyName}
          {email ? `, ${email}` : ""}. Phone: {form.personal.phone || "Not provided"}. Language:{" "}
          {form.personal.preferredLanguage === "es" ? "Español" : "English"}.
        </>
      ),
    },
    { step: "primary_goal", label: "Your goal", value: <>&ldquo;{form.goal}&rdquo;</> },
    {
      step: "body_area",
      label: "Where it bothers you",
      value: (
        <>
          {bodyAreaOptions.find((o) => o.value === form.bodyArea)?.label ?? ""},{" "}
          {(sideLabels[form.side] ?? "").toLowerCase()}.
        </>
      ),
    },
    {
      step: "pain_levels",
      label: "Your pain ratings",
      value: (
        <>
          Right now {form.pain.current} of 10. Worst this week {form.pain.worst}. Best this week{" "}
          {form.pain.best}.
        </>
      ),
    },
    {
      step: "activity_limitations",
      label: "Harder activities",
      value: (
        <>
          {form.limitations.length > 0
            ? form.limitations
                .map((l) => limitationLabels[l as keyof typeof limitationLabels] ?? l)
                .join(", ")
            : form.limitationsNone
              ? "None of these"
              : "Not provided"}
          {form.limitationsOther ? `. Also: ${form.limitationsOther}` : ""}
        </>
      ),
    },
    {
      step: "clinician_preferences",
      label: "Your therapist",
      value: (
        <>
          Gender: {form.preferences.gender.replace("_", " ")}. Language:{" "}
          {form.preferences.language.replace("_", " ")}.
          {form.preferences.notes ? ` Note: ${form.preferences.notes}` : ""}
        </>
      ),
    },
    {
      step: "appointment_availability",
      label: "When you can come in",
      value: (
        <>
          {days.join(", ")};{" "}
          {form.availability.times.map((t) => (timeLabels[t] ?? t).toLowerCase()).join(", ")}.
        </>
      ),
    },
    {
      step: "consent",
      label: "Sharing and consent",
      value: (
        <>
          Treatment and data use: {form.consent.agree ? "agreed" : "not agreed"}. Automated drafting
          tools: {form.consent.ai ? "allowed" : "not allowed"}.
        </>
      ),
    },
  ];
  return (
    <>
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {rows.map((r) => (
          <li key={r.step} className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-small font-medium text-ink-muted">{r.label}</p>
              <ChangeButton label={r.label} onClick={() => onChange(r.step)} />
            </div>
            <p className="text-body">{r.value}</p>
          </li>
        ))}
      </ul>
      <p className="max-w-measure text-body text-ink-muted">
        These are your own answers, in your own words. Your therapist will go through them with you
        at your first visit.
      </p>
      <FieldGroup legend="Confirm" requirement="required" {...optErr(errorFor("confirm-answers"))}>
        <Checkbox
          id="confirm-answers"
          label="These answers are right."
          checked={form.confirmed}
          onCheckedChange={(v) => update((f) => ({ ...f, confirmed: v === true }))}
        />
      </FieldGroup>
    </>
  );
}

type ReviewRowStep = IntakeStep;

/** "Change" with a specific name for screen readers (GOV.UK check answers). Neutral: it repeats per row. */
export function ChangeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="neutral" size="sm" onClick={onClick} aria-label={`Change ${label}`}>
      Change
    </Button>
  );
}
