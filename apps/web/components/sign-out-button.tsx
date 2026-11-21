"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, FieldError, type ButtonVariant } from "@carepath/ui";
import { apiRequest, markSigningOut, rememberCsrfToken } from "../lib/api/client";
import { ApiError } from "../lib/api/errors";

/**
 * Ends the session on the API, clears cached data and any in-memory shell state (`onSignedOut`), and
 * returns to sign-in with a hard navigation, which also drops everything else held in memory.
 */
export function SignOutButton({
  className,
  variant = "secondary",
  onSignedOut,
}: {
  className?: string;
  variant?: ButtonVariant;
  onSignedOut?: () => void;
}) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setPending(true);
    setError(null);
    markSigningOut();
    try {
      await apiRequest("POST", "/auth/logout", null, { quietSessionEnd: true });
    } catch (e) {
      // A session that is already gone is the outcome we wanted; anything else is shown.
      if (!(e instanceof ApiError && e.sessionEnded)) {
        markSigningOut(false);
        setError("Could not sign you out. You are still signed in. Try again.");
        setPending(false);
        return;
      }
    }
    rememberCsrfToken(null);
    queryClient.clear();
    onSignedOut?.();
    window.location.assign("/login?reason=signed-out");
  }

  return (
    <div className={className}>
      <Button
        variant={variant}
        size="sm"
        iconLeft="lock"
        loading={pending}
        loadingLabel="Signing out"
        onClick={signOut}
      >
        Sign out
      </Button>
      {error ? (
        <FieldError live className="mt-1.5">
          {error}
        </FieldError>
      ) : null}
    </div>
  );
}
