"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { sessionInfoSchema, type SessionInfo } from "@carepath/shared/contracts";
import { Banner, Button, Field, Icon, TextInput } from "@carepath/ui";
import { apiRequest, rememberCsrfToken } from "../../../lib/api/client";
import { ApiError } from "../../../lib/api/errors";
import { homeForRole } from "../../../lib/auth/roles";
import { DEMO_PASSWORD, demoAccounts } from "../../../lib/demo-accounts";

/**
 * Both halves of the sign-in page use one login call: the typed form and the demo role buttons.
 * Demo mode is real authentication with a known password; nothing is bypassed.
 */
export function LoginForm({ next, section }: { next: string | null; section: "form" | "demo" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(address: string, secret: string, who: string) {
    setPending(who);
    setError(null);
    try {
      const session: SessionInfo = await apiRequest("POST", "/auth/login", sessionInfoSchema, {
        body: { email: address, password: secret },
        public: true,
      });
      rememberCsrfToken(session.csrfToken);
      // Sent back to the page they wanted only if their own shell allows it; the guard decides.
      router.replace(next ?? homeForRole(session.role));
      router.refresh();
    } catch (e) {
      setPending(null);
      setError(messageFor(e));
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void signIn(email, password, "form");
  }

  const errorBanner = error ? (
    <Banner tone="error" title="Could not sign you in">
      {error}
    </Banner>
  ) : null;

  if (section === "demo") {
    return (
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col divide-y divide-border rounded-container border border-border bg-surface p-1">
          {demoAccounts.map((account) => (
            <li key={account.role}>
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => void signIn(account.email, DEMO_PASSWORD, account.role)}
                className="group flex min-h-target w-full items-center gap-3 rounded-control px-3 py-2.5 text-left motion-fast transition-colors hover:bg-primary-subtle focus-visible:focus-ring active:bg-selected-bg disabled:cursor-not-allowed"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-label font-medium text-link underline-offset-2 group-hover:underline group-disabled:text-disabled-ink">
                    {pending === account.role ? "Signing in" : `Sign in as ${account.label}`}
                  </span>
                  <span className="text-small text-ink-muted">{account.summary}</span>
                </span>
                <Icon name="chevron-right" size={20} className="shrink-0 text-link" />
              </button>
            </li>
          ))}
        </ul>
        {errorBanner}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Email" requirement="required">
        {(control) => (
          <TextInput
            {...control}
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>
      <Field label="Password" requirement="required">
        {(control) => (
          <TextInput
            {...control}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </Field>
      {errorBanner}
      <div>
        <Button
          type="submit"
          fullWidthOnPhone
          loading={pending === "form"}
          loadingLabel="Signing in"
          disabled={pending !== null && pending !== "form"}
        >
          Sign in
        </Button>
      </div>
    </form>
  );
}

/** One plain sentence per outcome. The envelope's fixed message is the fallback. */
function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "invalid_credentials":
        return "Email or password is incorrect. Check both and try again.";
      case "rate_limited":
        return "Too many sign-in attempts. Wait a minute, then try again.";
      case "service_unavailable":
        return "CarePath could not be reached. Nothing was changed. Try again in a moment.";
      default:
        return error.message;
    }
  }
  return "Something went wrong. Nothing was changed. Try again.";
}
