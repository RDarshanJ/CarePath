"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import NextLink from "next/link";
import {
  CONSENT_TEXT_VERSIONS,
  INTAKE_TOTAL_STEPS,
  intakeAnswerSchemas,
  intakeStateSchema,
  intakeSteps,
  sessionInfoSchema,
  type IntakeStep,
} from "@carepath/shared/contracts";
import { EMERGENCY_NOTICE } from "@carepath/shared";
import {
  Banner,
  Button,
  Checkbox,
  Field,
  FieldGroup,
  Heading,
  Icon,
  PainScale,
  Progress,
  Radio,
  RadioGroup,
  Switch,
  TextInput,
  Textarea,
} from "@carepath/ui";
import { api, apiRequest, rememberCsrfToken } from "../../../lib/api/client";
import { ApiError } from "../../../lib/api/errors";
import { consentCopy } from "../_lib/consent-copy";
import { formatLocalDate } from "../_lib/format";
import {
  bodyAreaOptions,
  dayOptions,
  limitationLabels,
  payloadFor,
  sideLabels,
  stepNumber,
  stepTitles,
  timeLabels,
  validateStep,
  type FieldError,
  type OnboardingForm,
} from "../_lib/onboarding";
import { ButtonLink } from "./button-link";

export type Stage = "account" | "code" | IntakeStep | "done";

const stageOrder: Stage[] = ["account", "code", ...intakeSteps];

export interface OnboardingFlowProps {
  patientId: string | null;
  stage: Stage;
  form: OnboardingForm;
  email: string;
}

const autosaveSteps = new Set<Stage>([
  "personal_information",
  "primary_goal",
  "body_area",
  "pain_levels",
  "activity_limitations",
  "clinician_preferences",
  "appointment_availability",
]);

function isIntakeStep(stage: Stage): stage is IntakeStep {
  return (intakeSteps as readonly string[]).includes(stage);
}

const num = (stage: Stage): number =>
  stage === "account"
    ? 1
    : stage === "code"
      ? 2
      : stage === "done"
        ? INTAKE_TOTAL_STEPS
        : stepNumber(stage);

function validateAccount(
  stage: "account" | "code",
  f: OnboardingForm,
  a: { email: string; password: string; code: string },
): FieldError[] {
  const errors: FieldError[] = [];
  if (stage === "account") {
    if (!f.personal.givenName.trim())
      errors.push({ field: "givenName", message: "Enter your first name." });
    if (!f.personal.familyName.trim())
      errors.push({ field: "familyName", message: "Enter your last name." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email.trim()))
      errors.push({
        field: "email",
        message: "Enter your email address, for example name@example.com.",
      });
    if (a.password.length < 12)
      errors.push({
        field: "password",
        message: `Use at least 12 characters. Yours has ${a.password.length}. A few words in a row works well.`,
      });
  } else {
    if (a.code.trim().length < 4)
      errors.push({ field: "code", message: "Enter the eligibility code from your clinic." });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.personal.birthDate) || f.personal.birthDate < "1900-01-01")
      errors.push({
        field: "birthDate",
        message: "Enter your date of birth as day, month and year.",
      });
  }
  return errors;
}

/**
 * Onboarding (Scenario A). Account and code are one request at the end of step two; every later step is
 * saved by the API as it is entered, so signing in again on any device resumes at the first step
 * still open (AC-A1). Errors sit beside their field, are linked to it, and are repeated in a summary
 * that is announced (AC-A6). Nothing here states or implies a diagnosis (REQ-ONB-06).
 */
export function OnboardingFlow(props: OnboardingFlowProps) {
  const [stage, setStage] = useState<Stage>(props.stage);
  const [form, setForm] = useState<OnboardingForm>(props.form);
  const [patientId, setPatientId] = useState(props.patientId);
  const [email, setEmail] = useState(props.email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [banner, setBanner] = useState<{ title: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [returnToReview, setReturnToReview] = useState(false);
  const lastSaved = useRef<Record<string, string>>({});
  const summaryRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (!firstRender.current) headingRef.current?.focus();
    firstRender.current = false;
  }, [stage]);

  useEffect(() => {
    if (errors.length > 0) summaryRef.current?.focus();
  }, [errors]);

  const errorFor = (field: string) => errors.find((e) => e.field === field)?.message;
  const patch = <K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const saveStep = useCallback(
    async (step: IntakeStep, current: OnboardingForm): Promise<boolean> => {
      if (!patientId) return false;
      const payload = payloadFor(step, current);
      const parsed = payload ? intakeAnswerSchemas[step].safeParse(payload) : null;
      if (!parsed?.success) return false;
      setSaveState("saving");
      try {
        await api.put(`/patients/${patientId}/intake/steps/${step}`, intakeStateSchema, {
          answers: payload,
        });
        lastSaved.current[step] = JSON.stringify(payload);
        setSaveState("saved");
        return true;
      } catch (e) {
        setSaveState("failed");
        if (e instanceof ApiError && e.code === "invalid_transition")
          window.location.assign("/today");
        return false;
      }
    },
    [patientId],
  );

  // Autosave: when the step's answers are valid and changed, save them shortly after typing stops.
  useEffect(() => {
    if (!patientId || !isIntakeStep(stage) || !autosaveSteps.has(stage)) return;
    if (validateStep(stage, form).length > 0) return;
    const key = JSON.stringify(payloadFor(stage, form));
    if (lastSaved.current[stage] === key) return;
    const timer = setTimeout(() => void saveStep(stage, form), 1200);
    return () => clearTimeout(timer);
  }, [form, stage, patientId, saveStep]);

  function focusField(name: string) {
    const holder = formRef.current?.querySelector<HTMLElement>(`[data-field="${name}"]`);
    const target = holder?.matches("input,textarea,button,[role=radio]")
      ? holder
      : holder?.querySelector<HTMLElement>("input,textarea,button,[role=radio]");
    target?.focus();
  }

  async function createAccount() {
    setBusy(true);
    setBanner(null);
    try {
      const session = await apiRequest("POST", "/onboarding/accounts", sessionInfoSchema, {
        public: true,
        body: {
          email: email.trim(),
          password,
          eligibilityCode: code.trim(),
          givenName: form.personal.givenName.trim(),
          familyName: form.personal.familyName.trim(),
          birthDate: form.personal.birthDate,
        },
      });
      rememberCsrfToken(session.csrfToken);
      setPatientId(session.patientId);
      setPassword("");
      setErrors([]);
      setStage("personal_information");
    } catch (e) {
      if (e instanceof ApiError && e.code === "eligibility_code_invalid") {
        setErrors([
          {
            field: "code",
            message:
              "This code was not accepted. It may be mistyped, already used or expired. Check it and try again. No account was created.",
          },
        ]);
      } else if (e instanceof ApiError && e.code === "account_exists") {
        setStage("account");
        setErrors([
          {
            field: "email",
            message:
              "An account with this email already exists. Sign in instead, or use a different email.",
          },
        ]);
      } else if (e instanceof ApiError && e.code === "rate_limited") {
        setBanner({
          title: "Too many tries",
          body: "Wait a minute, then try again. Nothing was created, and what you typed is still here.",
        });
      } else {
        setBanner({
          title: "Account not created",
          body: "Something went wrong and no account was created. What you typed is still here. Try again.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitIntake() {
    if (!patientId) return;
    setBusy(true);
    setBanner(null);
    try {
      await api.put(`/patients/${patientId}/intake/steps/review`, intakeStateSchema, {
        answers: { confirmed: true },
      });
      await api.post(`/patients/${patientId}/intake/submit`, intakeStateSchema, {});
      setStage("done");
    } catch (e) {
      if (e instanceof ApiError && e.code === "intake_incomplete") {
        const missing =
          (e.details[0]?.message ?? "").length > 0 ? e.details[0]!.message : "some steps";
        setBanner({
          title: "A step is still open",
          body: `The clinic needs ${missing} before you can send. Go back and finish it. Your other answers are saved.`,
        });
        const first = intakeSteps.find((s) => s !== "review" && validateStep(s, form).length > 0);
        if (first) setStage(first);
      } else {
        setBanner({
          title: "Not sent yet",
          body: "Your answers are saved, but they were not sent to the clinic. Try again.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function onContinue(e: React.FormEvent) {
    e.preventDefault();
    const found =
      stage === "account" || stage === "code"
        ? validateAccount(stage, form, { email, password, code })
        : stage === "done"
          ? []
          : validateStep(stage, form);
    if (found.length > 0) {
      setErrors(found);
      return;
    }
    setErrors([]);
    setBanner(null);
    if (stage === "account") return setStage("code");
    if (stage === "code") return void createAccount();
    if (stage === "done") return;
    if (stage === "review") return void submitIntake();
    setBusy(true);
    const ok = await saveStep(stage, form);
    setBusy(false);
    if (!ok) {
      setBanner({
        title: "Not saved yet",
        body: "This step was not saved, and what you entered is still here. Check your connection and try again.",
      });
      return;
    }
    if (returnToReview) {
      setReturnToReview(false);
      return setStage("review");
    }
    setStage(stageOrder[stageOrder.indexOf(stage) + 1] ?? "review");
  }

  function onBack() {
    setErrors([]);
    setBanner(null);
    if (isIntakeStep(stage) && stage !== "review" && autosaveSteps.has(stage))
      void saveStep(stage, form);
    setStage(stageOrder[Math.max(0, stageOrder.indexOf(stage) - 1)]!);
  }

  const canGoBack =
    stage === "code" ||
    (isIntakeStep(stage) && !(stage === "personal_information") && !returnToReview);

  if (stage === "done") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-small font-medium text-ink-muted">
            Step {INTAKE_TOTAL_STEPS} of {INTAKE_TOTAL_STEPS}
          </p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-heading text-h1 font-semibold focus:outline-none"
          >
            Your details are with the clinic
          </h1>
        </div>
        <p className="flex items-start gap-2 text-body" role="status">
          <Icon name="check-circle" size={22} className="mt-0.5 shrink-0 text-success-ink" />
          <span>
            Thank you. A care team member will assign your therapist, and then your therapist will
            build your plan. You do not need to do anything else for now.
          </span>
        </p>
        <p className="max-w-measure text-body text-ink-muted">
          You can change what you shared at any time in Sharing and consent.
        </p>
        <div>
          <ButtonLink href="/today">Go to Today</ButtonLink>
        </div>
      </div>
    );
  }

  const n = num(stage);
  const title =
    stage === "account"
      ? {
          title: "Create your account",
          intro: "Your name and email, and a password only you know.",
        }
      : stage === "code"
        ? {
            title: "Your eligibility code",
            intro: "Your clinic gave you a code to join. Paste it here.",
          }
        : stepTitles[stage];
  const savedText =
    saveState === "saving"
      ? "Saving."
      : saveState === "saved"
        ? "Saved. You can leave and come back to this step."
        : saveState === "failed"
          ? "Not saved yet. We will try again when you continue."
          : "";

  return (
    <form
      ref={formRef}
      onSubmit={onContinue}
      noValidate
      className="flex flex-col gap-6"
      aria-labelledby="step-heading"
    >
      <div className="flex flex-col gap-3">
        <Progress
          label="Onboarding progress"
          value={n}
          max={INTAKE_TOTAL_STEPS}
          valueText={`Step ${n} of ${INTAKE_TOTAL_STEPS}`}
        />
        <div className="flex flex-col gap-1.5">
          <h1
            id="step-heading"
            ref={headingRef}
            tabIndex={-1}
            className="font-heading text-h1 font-semibold focus:outline-none"
          >
            {title.title}
          </h1>
          <p className="max-w-measure text-body text-ink-muted">{title.intro}</p>
        </div>
      </div>

      {errors.length > 0 ? (
        <div
          ref={summaryRef}
          role="alert"
          tabIndex={-1}
          className="rounded-container border-2 border-error-ink bg-error-bg p-4 text-error-ink focus:outline-none"
        >
          <p className="flex items-center gap-2 text-label font-semibold">
            <Icon name="alert-circle" size={18} />
            {errors.length === 1 ? "One thing to fix" : `${errors.length} things to fix`}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-body">
            {errors.map((er) => (
              <li key={er.field + er.message}>
                <button
                  type="button"
                  onClick={() => focusField(er.field)}
                  className="rounded-control text-left underline underline-offset-2 focus-visible:focus-ring"
                >
                  {er.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {banner ? (
        <Banner tone="error" title={banner.title}>
          {banner.body}
        </Banner>
      ) : null}

      {stage === "account" ? (
        <div className="flex flex-col gap-5">
          <div data-field="givenName">
            <Field label="First name" requirement="required" {...optErr(errorFor("givenName"))}>
              {(c) => (
                <TextInput
                  {...c}
                  autoComplete="given-name"
                  value={form.personal.givenName}
                  onChange={(e) =>
                    patch("personal", { ...form.personal, givenName: e.target.value })
                  }
                />
              )}
            </Field>
          </div>
          <div data-field="familyName">
            <Field label="Last name" requirement="required" {...optErr(errorFor("familyName"))}>
              {(c) => (
                <TextInput
                  {...c}
                  autoComplete="family-name"
                  value={form.personal.familyName}
                  onChange={(e) =>
                    patch("personal", { ...form.personal, familyName: e.target.value })
                  }
                />
              )}
            </Field>
          </div>
          <div data-field="email">
            <Field
              label="Email"
              requirement="required"
              why="You will sign in with this. The clinic may use it to reach you."
              {...optErr(errorFor("email"))}
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
          </div>
          <div data-field="password" className="flex flex-col gap-1">
            <Field
              label="Password"
              requirement="required"
              hint="At least 12 characters. Pasting and password managers work."
              {...optErr(errorFor("password"))}
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
          <p className="text-small text-ink-muted">
            Already have an account?{" "}
            <NextLink
              href="/login"
              className="rounded-control text-primary underline underline-offset-2 focus-visible:focus-ring"
            >
              Sign in
            </NextLink>
          </p>
        </div>
      ) : null}

      {stage === "code" ? (
        <div className="flex flex-col gap-5">
          <div data-field="code">
            <Field
              label="Eligibility code"
              requirement="required"
              why="This confirms your clinic invited you. Nothing is created until it is accepted."
              hint="Paste it if you can. Spaces and capital letters do not matter."
              {...optErr(errorFor("code"))}
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
          </div>
          <div data-field="birthDate">
            <Field
              label="Date of birth"
              requirement="required"
              why="The clinic uses it to match you to your record. Only your care team sees it."
              {...optErr(errorFor("birthDate"))}
            >
              {(c) => (
                <TextInput
                  {...c}
                  type="date"
                  autoComplete="bday"
                  value={form.personal.birthDate}
                  onChange={(e) =>
                    patch("personal", { ...form.personal, birthDate: e.target.value })
                  }
                />
              )}
            </Field>
          </div>
        </div>
      ) : null}

      {stage === "personal_information" ? (
        <div className="flex flex-col gap-5">
          <dl className="flex flex-col gap-2 rounded-container border border-border bg-surface p-4 text-body">
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
          <div data-field="phone">
            <Field
              label="Phone number"
              requirement="optional"
              why="The clinic uses it only for visits and urgent questions about your care."
              {...optErr(errorFor("phone"))}
            >
              {(c) => (
                <TextInput
                  {...c}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.personal.phone}
                  onChange={(e) => patch("personal", { ...form.personal, phone: e.target.value })}
                />
              )}
            </Field>
          </div>
          <div data-field="language">
            <FieldGroup
              legend="Preferred language"
              requirement="required"
              {...optErr(errorFor("language"))}
            >
              <RadioGroup
                value={form.personal.preferredLanguage}
                aria-label="Preferred language"
                onValueChange={(v) =>
                  patch("personal", {
                    ...form.personal,
                    preferredLanguage: v === "es" ? "es" : "en",
                  })
                }
              >
                <Radio id="lang-en" value="en" label="English" />
                <Radio id="lang-es" value="es" label="Español (Spanish)" />
              </RadioGroup>
            </FieldGroup>
          </div>
        </div>
      ) : null}

      {stage === "primary_goal" ? (
        <div data-field="goal">
          <Field
            label="What would you like to be able to do?"
            requirement="required"
            why="Your therapist reads this first and builds your plan around it."
            hint="For example: walk to the shop without stopping, or pick up my grandchild."
            {...optErr(errorFor("goal"))}
          >
            {(c) => (
              <Textarea
                {...c}
                rows={5}
                maxLength={500}
                value={form.goal}
                onChange={(e) => patch("goal", e.target.value)}
              />
            )}
          </Field>
          <p className="mt-1 text-small tabular-nums text-ink-muted">
            {form.goal.length} of 500 characters
          </p>
        </div>
      ) : null}

      {stage === "body_area" ? (
        <div className="flex flex-col gap-6">
          <div data-field="bodyArea">
            <FieldGroup legend="Area" requirement="required" {...optErr(errorFor("bodyArea"))}>
              <RadioGroup
                value={form.bodyArea}
                aria-label="Area"
                onValueChange={(v) => patch("bodyArea", v)}
                className="grid gap-x-4 sm:grid-cols-2"
              >
                {bodyAreaOptions.map((o) => (
                  <Radio
                    key={o.value}
                    id={`area-${o.value.replace(/\W+/g, "-")}`}
                    value={o.value}
                    label={o.label}
                  />
                ))}
              </RadioGroup>
            </FieldGroup>
          </div>
          <div data-field="side">
            <FieldGroup legend="Side" requirement="required" {...optErr(errorFor("side"))}>
              <RadioGroup
                value={form.side}
                aria-label="Side"
                onValueChange={(v) => patch("side", v)}
              >
                {Object.entries(sideLabels).map(([value, label]) => (
                  <Radio key={value} id={`side-${value}`} value={value} label={label} />
                ))}
              </RadioGroup>
            </FieldGroup>
          </div>
        </div>
      ) : null}

      {stage === "pain_levels" ? (
        <div className="flex flex-col gap-6">
          <div data-field="painCurrent" className="flex flex-col gap-1.5">
            <PainScale
              label="How much does it hurt right now?"
              value={form.pain.current}
              onValueChange={(v) => patch("pain", { ...form.pain, current: v })}
            />
            <InlineError message={errorFor("painCurrent")} />
          </div>
          <div data-field="painWorst" className="flex flex-col gap-1.5">
            <PainScale
              label="At its worst in the last week?"
              value={form.pain.worst}
              onValueChange={(v) => patch("pain", { ...form.pain, worst: v })}
            />
            <InlineError message={errorFor("painWorst")} />
          </div>
          <div data-field="painBest" className="flex flex-col gap-1.5">
            <PainScale
              label="At its best in the last week?"
              value={form.pain.best}
              onValueChange={(v) => patch("pain", { ...form.pain, best: v })}
            />
            <InlineError message={errorFor("painBest")} />
          </div>
          <p className="max-w-measure text-small text-ink-muted">
            These are your own ratings. If you are worried about how you feel right now, contact
            your clinic. {EMERGENCY_NOTICE}
          </p>
        </div>
      ) : null}

      {stage === "activity_limitations" ? (
        <div className="flex flex-col gap-5">
          <div data-field="limitations">
            <FieldGroup legend="Activities that are harder" requirement="optional">
              <div className="grid gap-x-4 sm:grid-cols-2">
                {Object.entries(limitationLabels).map(([value, label]) => (
                  <Checkbox
                    key={value}
                    id={`lim-${value}`}
                    label={label}
                    checked={form.limitations.includes(value)}
                    onCheckedChange={(v) =>
                      patch(
                        "limitations",
                        v === true
                          ? [...form.limitations, value]
                          : form.limitations.filter((x) => x !== value),
                      )
                    }
                  />
                ))}
              </div>
            </FieldGroup>
          </div>
          <div data-field="other">
            <Field
              label="Anything else that is hard?"
              requirement="optional"
              {...optErr(errorFor("other"))}
            >
              {(c) => (
                <Textarea
                  {...c}
                  rows={3}
                  maxLength={500}
                  value={form.limitationsOther}
                  onChange={(e) => patch("limitationsOther", e.target.value)}
                />
              )}
            </Field>
          </div>
        </div>
      ) : null}

      {stage === "clinician_preferences" ? (
        <div className="flex flex-col gap-6">
          <FieldGroup legend="Therapist gender" requirement="optional">
            <RadioGroup
              value={form.preferences.gender}
              aria-label="Therapist gender"
              onValueChange={(v) => patch("preferences", { ...form.preferences, gender: v })}
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
              onValueChange={(v) => patch("preferences", { ...form.preferences, language: v })}
            >
              <Radio id="pl-none" value="no_preference" label="No preference" />
              <Radio id="pl-en" value="en" label="English" />
              <Radio id="pl-es" value="es" label="Español (Spanish)" />
            </RadioGroup>
          </FieldGroup>
          <div data-field="notes">
            <Field
              label="Anything else the clinic should know?"
              requirement="optional"
              why="For example, access needs or the best way to reach you."
              {...optErr(errorFor("notes"))}
            >
              {(c) => (
                <Textarea
                  {...c}
                  rows={3}
                  maxLength={500}
                  value={form.preferences.notes}
                  onChange={(e) =>
                    patch("preferences", { ...form.preferences, notes: e.target.value })
                  }
                />
              )}
            </Field>
          </div>
        </div>
      ) : null}

      {stage === "appointment_availability" ? (
        <div className="flex flex-col gap-6">
          <div data-field="days">
            <FieldGroup
              legend="Days that could work"
              requirement="required"
              {...optErr(errorFor("days"))}
            >
              <div className="grid gap-x-4 sm:grid-cols-2">
                {dayOptions.map((d) => (
                  <Checkbox
                    key={d.value}
                    id={`day-${d.value}`}
                    label={d.label}
                    checked={form.availability.days.includes(d.value)}
                    onCheckedChange={(v) =>
                      patch("availability", {
                        ...form.availability,
                        days:
                          v === true
                            ? [...form.availability.days, d.value]
                            : form.availability.days.filter((x) => x !== d.value),
                      })
                    }
                  />
                ))}
              </div>
            </FieldGroup>
          </div>
          <div data-field="times">
            <FieldGroup legend="Times of day" requirement="required" {...optErr(errorFor("times"))}>
              {Object.entries(timeLabels).map(([value, label]) => (
                <Checkbox
                  key={value}
                  id={`time-${value}`}
                  label={label}
                  checked={form.availability.times.includes(value)}
                  onCheckedChange={(v) =>
                    patch("availability", {
                      ...form.availability,
                      times:
                        v === true
                          ? [...form.availability.times, value]
                          : form.availability.times.filter((x) => x !== value),
                    })
                  }
                />
              ))}
            </FieldGroup>
          </div>
        </div>
      ) : null}

      {stage === "consent" ? (
        <ConsentStep form={form} setForm={setForm} error={errorFor("agree")} />
      ) : null}

      {stage === "review" ? (
        <ReviewStep
          form={form}
          email={email}
          error={errorFor("confirmed")}
          onChange={(step) => {
            setReturnToReview(true);
            setErrors([]);
            setStage(step);
          }}
          onConfirm={(v) => patch("confirmed", v)}
        />
      ) : null}

      <p role="status" aria-live="polite" className="min-h-5 text-small text-ink-muted">
        {savedText}
      </p>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {canGoBack ? (
          <Button variant="secondary" onClick={onBack} className="w-full sm:w-auto" disabled={busy}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="submit"
          loading={busy}
          loadingLabel={stage === "code" ? "Creating account" : "Saving"}
          className="w-full sm:w-auto"
        >
          {stage === "review"
            ? "Send to the clinic"
            : returnToReview
              ? "Save and return to review"
              : stage === "code"
                ? "Create account"
                : "Continue"}
        </Button>
      </div>
    </form>
  );
}

/** `exactOptionalPropertyTypes` friendly: pass `error` only when there is one. */
function optErr(message: string | undefined): { error?: string } {
  return message ? { error: message } : {};
}

function InlineError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <p className="flex items-start gap-1.5 text-small font-medium text-error-ink">
      <Icon name="alert-circle" size={16} className="mt-0.5 shrink-0" />
      <span>
        <span className="sr-only">Error: </span>
        {message}
      </span>
    </p>
  );
}

function ConsentStep({
  form,
  setForm,
  error,
}: {
  form: OnboardingForm;
  setForm: (f: (prev: OnboardingForm) => OnboardingForm) => void;
  error: string | undefined;
}) {
  const required = consentCopy.treatment_and_data_use;
  const ai = consentCopy.ai_assisted_features;
  const motion = consentCopy.motion_tracking;
  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="c-required"
        className="flex flex-col gap-3 rounded-container border border-border bg-surface p-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Heading level={4} as="h2" id="c-required">
            {required.title}
          </Heading>
          <span className="text-small font-medium text-ink-muted">{required.requirement}</span>
        </div>
        <p className="max-w-measure text-body">{required.summary}</p>
        <ul className="list-disc pl-5 text-small text-ink-muted">
          {required.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <div data-field="agree">
          <FieldGroup legend="Your agreement" requirement="required" {...optErr(error)}>
            <Checkbox
              id="consent-agree"
              label="I agree to treatment and data use as described above."
              checked={form.consent.agree}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, consent: { ...f.consent, agree: v === true } }))
              }
            />
          </FieldGroup>
        </div>
      </section>

      <section
        aria-labelledby="c-ai"
        className="flex flex-col gap-3 rounded-container border border-border bg-surface p-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Heading level={4} as="h2" id="c-ai">
            {ai.title}
          </Heading>
          <span className="text-small font-medium text-ink-muted">{ai.requirement}</span>
        </div>
        <p className="max-w-measure text-body">{ai.summary}</p>
        <ul className="list-disc pl-5 text-small text-ink-muted">
          {ai.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <Switch
          id="consent-ai"
          label="Allow automated drafting tools"
          hint="Off unless you turn it on."
          checked={form.consent.ai}
          onCheckedChange={(v) => setForm((f) => ({ ...f, consent: { ...f.consent, ai: v } }))}
        />
      </section>

      <section
        aria-labelledby="c-motion"
        className="flex flex-col gap-2 rounded-container border border-dashed border-border-control p-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Heading level={4} as="h2" id="c-motion">
            {motion.title}
          </Heading>
          <span className="text-small font-medium text-ink-muted">{motion.requirement}</span>
        </div>
        <p className="max-w-measure text-body text-ink-muted">{motion.summary}</p>
      </section>

      <p className="max-w-measure text-small text-ink-muted">
        You can see and change these choices at any time in Sharing and consent, in the footer of
        every page. Consent text version {CONSENT_TEXT_VERSIONS.treatment_and_data_use}.
      </p>
    </div>
  );
}

function ReviewStep({
  form,
  email,
  error,
  onChange,
  onConfirm,
}: {
  form: OnboardingForm;
  email: string;
  error: string | undefined;
  onChange: (step: IntakeStep) => void;
  onConfirm: (v: boolean) => void;
}) {
  const days = dayOptions
    .filter((d) => form.availability.days.includes(d.value))
    .map((d) => d.label);
  const rows: { step: IntakeStep; label: string; value: ReactNode }[] = [
    {
      step: "personal_information",
      label: "About you",
      value: (
        <>
          {form.personal.givenName} {form.personal.familyName}
          {email ? `, ${email}` : ""}
          {form.personal.phone ? `, ${form.personal.phone}` : ""}. Language:{" "}
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
            : "None chosen"}
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
          tools: {form.consent.ai ? "on" : "off"}.
        </>
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-5">
      <dl className="flex flex-col divide-y divide-border rounded-container border border-border bg-surface">
        {rows.map((r) => (
          <div key={r.step} className="flex flex-col gap-1 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-small font-medium text-ink-muted">{r.label}</dt>
              <Button
                variant="quiet"
                size="sm"
                onClick={() => onChange(r.step)}
                aria-label={`Change ${r.label}`}
              >
                Change
              </Button>
            </div>
            <dd className="text-body">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="max-w-measure text-body text-ink-muted">
        These are your own answers, in your own words. Your therapist will go through them with you
        at your first visit.
      </p>
      <div data-field="confirmed">
        <FieldGroup legend="Confirm" requirement="required" {...optErr(error)}>
          <Checkbox
            id="confirm-answers"
            label="These answers are right."
            checked={form.confirmed}
            onCheckedChange={(v) => onConfirm(v === true)}
          />
        </FieldGroup>
      </div>
    </div>
  );
}
