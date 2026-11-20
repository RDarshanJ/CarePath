"use client";

import { useState, type ReactNode } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "../api/errors";
import { redirectToSignIn } from "../api/client";

/** A session that ended mid-visit sends the person to sign-in once, whichever query or mutation noticed. */
function onFailure(error: unknown) {
  if (error instanceof ApiError && error.sessionEnded) {
    redirectToSignIn(error.code === "session_expired" ? "expired" : "required");
  }
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: onFailure }),
        mutationCache: new MutationCache({ onError: onFailure }),
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            // A 4xx is an answer, not a glitch: do not retry it. Retry network and 5xx once.
            retry: (count, error) =>
              !(error instanceof ApiError && error.status < 500) && count < 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
