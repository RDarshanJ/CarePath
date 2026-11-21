"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Permission, SessionInfo } from "@carepath/shared/contracts";
import { Banner, Button, SkeletonGroup, Skeleton, ToastProvider } from "@carepath/ui";
import { keys, reads } from "./queries";

interface ClinicianContext {
  session: SessionInfo;
  /** The organization's IANA time zone, from the API. */
  timezone: string;
  can: (permission: Permission) => boolean;
}

const Ctx = createContext<ClinicianContext | null>(null);

export function useClinician(): ClinicianContext {
  const value = useContext(Ctx);
  if (!value) throw new Error("useClinician must be used inside ClinicianProviders");
  return value;
}

/**
 * Session and organization time zone for every clinician screen. The zone comes with the
 * overview (the same query the Overview page uses), so no screen derives dates from the browser
 * zone. Screens render once it is known.
 */
export function ClinicianProviders({
  session,
  children,
}: {
  session: SessionInfo;
  children: ReactNode;
}) {
  const overview = useQuery({ queryKey: keys.overview, queryFn: reads.overview });
  const timezone = overview.data?.timezone;
  const value = useMemo<ClinicianContext | null>(
    () => (timezone ? { session, timezone, can: (p) => session.permissions.includes(p) } : null),
    [session, timezone],
  );

  if (!value) {
    if (overview.isError) {
      return (
        <Banner
          tone="error"
          title="The workspace could not load"
          action={
            <Button variant="secondary" size="sm" onClick={() => void overview.refetch()}>
              Try again
            </Button>
          }
        >
          Nothing was changed. Check your connection and try again.
        </Banner>
      );
    }
    return (
      <SkeletonGroup label="Loading workspace" className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </SkeletonGroup>
    );
  }
  return (
    <Ctx.Provider value={value}>
      <ToastProvider>{children}</ToastProvider>
    </Ctx.Provider>
  );
}
