"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Staff search store (DR-002 I, amending CD-333). A patient search term names a patient, so it never goes
 * into a URL, a document title or browser storage (R1, R2). It lives here, in memory, in the staff layout:
 * it survives moving between a list and a record and back, it does not survive a reload, and sign-out
 * clears it (the shell passes `clear` to the sign-out button, and the hard navigation that follows drops
 * the page's memory anyway). One term per scope, so the clinician directory and the admin patient list
 * never share text.
 */
export type StaffSearchScope = "clinician-directory" | "admin-patients";

interface StaffSearchStore {
  terms: Partial<Record<StaffSearchScope, string>>;
  set: (scope: StaffSearchScope, term: string) => void;
  clear: () => void;
}

const Ctx = createContext<StaffSearchStore | null>(null);

export function StaffSearchProvider({ children }: { children: ReactNode }) {
  const [terms, setTerms] = useState<StaffSearchStore["terms"]>({});
  const set = useCallback(
    (scope: StaffSearchScope, term: string) =>
      setTerms((prev) => (prev[scope] === term ? prev : { ...prev, [scope]: term })),
    [],
  );
  const clear = useCallback(() => setTerms({}), []);
  const value = useMemo(() => ({ terms, set, clear }), [terms, set, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useStore(): StaffSearchStore {
  const store = useContext(Ctx);
  if (!store)
    throw new Error("useStaffSearch must be used inside a staff layout (StaffSearchProvider)");
  return store;
}

/** The search term for one list, held in the staff layout's memory. Use it in place of a `q=` parameter. */
export function useStaffSearch(scope: StaffSearchScope): [string, (term: string) => void] {
  const { terms, set } = useStore();
  const setTerm = useCallback((term: string) => set(scope, term), [set, scope]);
  return [terms[scope] ?? "", setTerm];
}

/** Clears every stored term; the shells call it on sign-out. */
export function useClearStaffSearch(): () => void {
  return useStore().clear;
}
