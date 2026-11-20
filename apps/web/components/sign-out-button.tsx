"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@carepath/ui";
import { apiRequest, rememberCsrfToken } from "../lib/api/client";
import { ApiError } from "../lib/api/errors";

/** Ends the session on the API, clears cached data, and returns to sign-in with a hard navigation. */
export function SignOutButton({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setPending(true);
    setError(null);
    try {
      await apiRequest("POST", "/auth/logout", null, { quietSessionEnd: true });
    } catch (e) {
      // A session that is already gone is the outcome we wanted; anything else is shown.
      if (!(e instanceof ApiError && e.sessionEnded)) {
        setError("Could not sign you out. You are still signed in. Try again.");
        setPending(false);
        return;
      }
    }
    rememberCsrfToken(null);
    queryClient.clear();
    window.location.assign("/login?reason=signed-out");
  }

  return (
    <div className={className}>
      <Button
        variant="secondary"
        size="sm"
        iconLeft="lock"
        loading={pending}
        loadingLabel="Signing out"
        onClick={signOut}
      >
        Sign out
      </Button>
      {error ? (
        <p role="alert" className="mt-1.5 text-small font-medium text-error-ink">
          <span className="sr-only">Error: </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
