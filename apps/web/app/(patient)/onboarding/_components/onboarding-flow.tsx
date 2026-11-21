"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  INTAKE_TOTAL_STEPS,
  intakeAnswerSchemas,
  intakeStateSchema,
  intakeSteps,
  sessionInfoSchema,
  type IntakeStep,
} from "@carepath/shared/contracts";
import {
  Banner,
  Button,
  ErrorSummary,
  Heading,
  Icon,
  LeaveGuardDialog,
  Progress,
  partsFromIso,
  useLeaveGuard,
  type DateParts,
} from "@carepath/ui";
import { api, apiRequest, rememberCsrfToken } from "../../../../lib/api/client";
import { ApiError } from "../../../../lib/api/errors";
import {
  partOf,
  payloadFor,
  stepNumber,
  stepTitles,
  validateAccount,
  validateCode,
  validateStep,
  type FieldError,
  type OnboardingForm,
} from "../_lib/onboarding";
import { ResumeSummary } from "./resume-summary";
import {
  AboutStep,
  AccountStep,
  AvailabilityStep,
  BodyStep,
  CodeStep,
  ConsentStep,
  GoalStep,
  LimitationsStep,
  PainStep,
  PreferencesStep,
  ReviewStep,
} from "./steps";

export type Stage = "resume" | "code" | "account" | IntakeStep | "done";

const stageOrder: Stage[] = ["code", "account", ...intakeSteps];

export interface OnboardingFlowProps {
  patientId: string | null;
  /** Steps the API has stored as complete (a returning patient). */
  completed: IntakeStep[];
  form: OnboardingForm;
  email: string;
  clinicPhone: string | null;
}

function isIntakeStep(stage: Stage): stage is IntakeStep {
  return (intakeSteps as readonly string[]).includes(stage);
}

const num = (stage: Stage): number =>
  stage === "code"
    ? 1
    : stage === "account"
      ? 2
      : stage === "done"
        ? INTAKE_TOTAL_STEPS
        : stage === "resume"
          ? 0
          : stepNumber(stage);

/**
 * Onboarding (Scenario A, A1 linear flow). Steps 1 and 2 (code and date of birth, then the account) are
 * held in memory and sent together when the account is created; nothing about them goes to browser
 * storage, and a reload warns first (DR-002 A, R1). From step 3 every step is saved when the patient
 * continues, so signing in again on any device shows a summary and resumes at the first step still open
 * (AC-A1). Errors sit beside their field, are linked to it and are repeated in a summary that takes
 * focus (AC-A6). Nothing here states or implies a diagnosis (REQ-ONB-06).
 */
export function OnboardingFlow(props: OnboardingFlowProps) {
  const returning = props.patientId !== null;
  const [stage, setStage] = useState<Stage>(returning ? "resume" : "code");
  const [form, setForm] = useState<OnboardingForm>(props.form);
  const [completed, setCompleted] = useState<Set<IntakeStep>>(new Set(props.completed));
  const [patientId, setPatientId] = useState(props.patientId);
  const [email, setEmail] = useState(props.email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [dob, setDob] = useState<DateParts>(() => partsFromIso(props.form.personal.birthDate));
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [banner, setBanner] = useState<{ title: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [returnTo, setReturnTo] = useState<"review" | "resume" | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorsRef = useRef<FieldError[]>([]);
  errorsRef.current = errors;
  const firstRender = useRef(true);

  const next: IntakeStep = intakeSteps.find((s) => !completed.has(s)) ?? "review";

  // Steps 1 and 2 live only in this page's memory: leaving or reloading asks first.
  const typed =
    code !== "" ||
    dob.day !== "" ||
    dob.month !== "" ||
    dob.year !== "" ||
    form.personal.givenName !== "" ||
    form.personal.familyName !== "" ||
    email !== "" ||
    password !== "";
  const guard = useLeaveGuard(patientId === null && typed);

  // Focus the heading when the step changes, unless an error summary is about to take focus.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (errorsRef.current.length === 0) headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [stage]);

  const errorFor = (field: string) => errors.find((e) => e.field === field)?.message;
  const update = useCallback((fn: (f: OnboardingForm) => OnboardingForm) => setForm(fn), []);

  const saveStep = useCallback(
    async (step: IntakeStep, current: OnboardingForm): Promise<boolean> => {
      if (!patientId) return false;
      const payload = payloadFor(step, current);
      const parsed = payload ? intakeAnswerSchemas[step].safeParse(payload) : null;
      if (!parsed?.success) return false;
      setSaving(true);
      try {
        await api.put(`/patients/${patientId}/intake/steps/${step}`, intakeStateSchema, {
          answers: payload,
        });
        setCompleted((c) => new Set(c).add(step));
        setStatus(`Saved: ${stepTitles[step].title}. You can stop here and come back later.`);
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.code === "invalid_transition")
          window.location.assign("/today");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [patientId],
  );

  async function createAccount(birthDate: string) {
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
          birthDate,
        },
      });
      rememberCsrfToken(session.csrfToken);
      setPatientId(session.patientId);
      setPassword("");
      setErrors([]);
      setStatus("Your account is created. Every step from here is saved as you go.");
      setStage("personal_information");
    } catch (e) {
      if (e instanceof ApiError && e.code === "eligibility_code_invalid") {
        setStage("code");
        setErrors([
          {
            field: "ob-code",
            message:
              "This code was not accepted. It may be mistyped, already used or expired. No account was created. Check it, or ask your clinic for a new code.",
          },
        ]);
      } else if (e instanceof ApiError && e.code === "account_exists") {
        setErrors([
          {
            field: "ob-email",
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
          body: "No account was created. What you typed is still here. Try again.",
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
    if (stage === "done" || stage === "resume") return;
    let found: FieldError[] = [];
    let birthDate: string | null = null;
    if (stage === "code") {
      const r = validateCode(code, dob);
      found = r.errors;
      birthDate = r.birthDate;
    } else if (stage === "account") {
      found = validateAccount({
        givenName: form.personal.givenName,
        familyName: form.personal.familyName,
        email,
        password,
      });
    } else {
      found = validateStep(stage, form);
    }
    if (found.length > 0) {
      setErrors(found);
      return;
    }
    setErrors([]);
    setBanner(null);
    if (stage === "code") {
      update((f) => ({ ...f, personal: { ...f.personal, birthDate: birthDate ?? "" } }));
      return setStage("account");
    }
    if (stage === "account") {
      const r = validateCode(code, dob);
      if (!r.birthDate) return setStage("code");
      return void createAccount(r.birthDate);
    }
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
    if (returnTo) {
      const target = returnTo;
      setReturnTo(null);
      return setStage(target);
    }
    setStage(stageOrder[stageOrder.indexOf(stage) + 1] ?? "review");
  }

  function onBack() {
    setErrors([]);
    setBanner(null);
    if (isIntakeStep(stage) && stage !== "review") void saveStep(stage, form);
    if (stage === "personal_information") return setStage("resume");
    setStage(stageOrder[Math.max(0, stageOrder.indexOf(stage) - 1)]!);
  }

  function change(step: IntakeStep, back: "review" | "resume") {
    setReturnTo(back);
    setErrors([]);
    setBanner(null);
    setStage(step);
  }

  const canGoBack =
    stage === "account" ||
    (isIntakeStep(stage) && !returnTo && (stage !== "personal_information" || returning));

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 rounded-container border border-border bg-surface p-4 md:p-6">
      {children}
      <LeaveGuardDialog
        guard={guard}
        description="Your account is not created yet, and what you typed here is not saved."
      />
    </div>
  );

  if (stage === "done") {
    return shell(
      <>
        <div className="flex flex-col gap-2">
          <p className="text-small font-medium text-ink-muted">
            Step {INTAKE_TOTAL_STEPS} of {INTAKE_TOTAL_STEPS}
          </p>
          <Heading level={1} ref={headingRef} tabIndex={-1}>
            Your details are with the clinic
          </Heading>
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
          <Button href="/today">Go to Today</Button>
        </div>
      </>,
    );
  }

  const n = stage === "resume" ? stepNumber(next) : num(stage);
  const title =
    stage === "resume"
      ? {
          title: "Welcome back",
          intro: `You are on step ${stepNumber(next)} of ${INTAKE_TOTAL_STEPS}. Your earlier answers are saved.`,
        }
      : stage === "code"
        ? { title: "Your eligibility code", intro: "Your clinic gave you a code to join." }
        : stage === "account"
          ? {
              title: "Create your account",
              intro: "Your name, your email and a password only you know.",
            }
          : stepTitles[stage];

  return shell(
    <form onSubmit={onContinue} noValidate aria-labelledby="step-heading" className="contents">
      <div className="flex flex-col gap-4">
        <Progress
          label="Onboarding progress"
          value={n}
          max={INTAKE_TOTAL_STEPS}
          valueText={`Step ${n} of ${INTAKE_TOTAL_STEPS}`}
        />
        <div className="flex flex-col gap-1.5">
          {stage !== "resume" ? (
            <p className="text-small font-medium text-ink-muted">{partOf(n)}</p>
          ) : null}
          <Heading level={1} id="step-heading" ref={headingRef} tabIndex={-1}>
            {title.title}
          </Heading>
          <p className="max-w-measure text-body text-ink-muted">{title.intro}</p>
        </div>
      </div>

      <ErrorSummary
        title={errors.length === 1 ? "One thing to fix" : `${errors.length} things to fix`}
        errors={errors.map((er) => ({ targetId: er.field, message: er.message }))}
      />

      {banner ? (
        <Banner tone="error" title={banner.title}>
          {banner.body}
        </Banner>
      ) : null}

      {stage === "resume" ? (
        <ResumeSummary
          completed={completed}
          next={next}
          busy={busy}
          onContinue={() => setStage(next)}
          onChange={(step) => change(step, "resume")}
        />
      ) : (
        <>
          <div className="flex flex-col gap-6">
            {stage === "code" ? (
              <CodeStep
                code={code}
                setCode={setCode}
                dob={dob}
                setDob={setDob}
                errorFor={errorFor}
              />
            ) : null}
            {stage === "account" ? (
              <AccountStep
                form={form}
                update={update}
                errorFor={errorFor}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
              />
            ) : null}
            {stage === "personal_information" ? (
              <AboutStep form={form} update={update} errorFor={errorFor} />
            ) : null}
            {stage === "primary_goal" ? (
              <GoalStep form={form} update={update} errorFor={errorFor} />
            ) : null}
            {stage === "body_area" ? (
              <BodyStep form={form} update={update} errorFor={errorFor} />
            ) : null}
            {stage === "pain_levels" ? (
              <PainStep form={form} update={update} errorFor={errorFor} />
            ) : null}
            {stage === "activity_limitations" ? (
              <LimitationsStep form={form} update={update} errorFor={errorFor} />
            ) : null}
            {stage === "clinician_preferences" ? (
              <PreferencesStep form={form} update={update} errorFor={errorFor} />
            ) : null}
            {stage === "appointment_availability" ? (
              <AvailabilityStep form={form} update={update} errorFor={errorFor} />
            ) : null}
            {stage === "consent" ? (
              <ConsentStep
                form={form}
                update={update}
                errorFor={errorFor}
                clinicPhone={props.clinicPhone}
              />
            ) : null}
            {stage === "review" ? (
              <ReviewStep
                form={form}
                update={update}
                errorFor={errorFor}
                email={email}
                onChange={(step) => change(step, "review")}
              />
            ) : null}
          </div>

          <p role="status" aria-live="polite" className="min-h-6 text-small text-ink-muted">
            {saving ? "Saving." : status}
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {canGoBack ? (
              <Button variant="neutral" onClick={onBack} fullWidthOnPhone disabled={busy}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button
              type="submit"
              loading={busy}
              loadingLabel={stage === "account" ? "Creating your account" : "Saving"}
              fullWidthOnPhone
            >
              {stage === "review"
                ? "Send to the clinic"
                : returnTo === "review"
                  ? "Save and return to review"
                  : returnTo === "resume"
                    ? "Save and return to summary"
                    : stage === "account"
                      ? "Create account"
                      : isIntakeStep(stage)
                        ? "Save and continue"
                        : "Continue"}
            </Button>
          </div>
        </>
      )}
    </form>,
  );
}
