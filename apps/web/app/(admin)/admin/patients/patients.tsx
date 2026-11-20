"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banner,
  Button,
  EmptyState,
  Heading,
  Select,
  Skeleton,
  SkeletonGroup,
  Table,
  Tag,
  TBody,
  Td,
  Th,
  THead,
  TextInput,
  Tr,
} from "@carepath/ui";
import {
  formatDate,
  intakeStatusLabels,
  patientStatusLabel,
  patientStatusTone,
} from "@carepath/shared";
import type { PatientDirectoryPage } from "@carepath/shared/contracts";
import { ApiError } from "../../../../lib/api/errors";
import { keys, qs, reads } from "../../_lib/queries";
import { AssignDialog } from "./assign-dialog";

type Row = Extract<PatientDirectoryPage["items"][number], { view: "administrative" }>;

const statusOptions = [
  ...(
    ["awaiting_assignment", "intake_incomplete", "active", "inactive", "discharged"] as const
  ).map((value) => ({ value, label: patientStatusLabel(value) })),
  { value: "any", label: "Any status" },
];
const statusLabel: Record<string, string> = Object.fromEntries(
  statusOptions.map((o) => [o.value, o.label]),
);
const limitOptions = [
  { value: "25", label: "25 per page" },
  { value: "50", label: "50 per page" },
];

/** "Nov 18, 2026" from an instant, as the UTC calendar day (this screen has no clinic zone). */
function utcDate(iso: string): string {
  return formatDate(iso, "UTC");
}

function fullName(r: Row): string {
  return `${r.givenName} ${r.familyName}`;
}

/** What is missing, in words (AC-A4). Only for patients who have not submitted intake. */
function intakeText(r: Row): { text: string; missing: boolean } {
  const entry = intakeStatusLabels[r.intakeStatus];
  return { text: entry.label, missing: !entry.complete };
}

export function AdminPatients() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const queryClient = useQueryClient();

  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "awaiting_assignment";
  const limit = params.get("limit") ?? "25";

  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [page, setPage] = useState(0);
  useEffect(() => {
    setCursors([undefined]);
    setPage(0);
  }, [q, status, limit]);

  function update(next: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || (k === "status" && v === "awaiting_assignment") || (k === "limit" && v === "25"))
        p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => update({ q: search.trim() }), 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = qs({
    q: q || undefined,
    status: status === "any" ? undefined : status,
    sort: "name",
    limit,
    cursor: cursors[page],
  });
  const result = useQuery({
    queryKey: keys.directory(query),
    queryFn: () => reads.directory(query),
    placeholderData: keepPreviousData,
  });
  const rows = (result.data?.items ?? []).flatMap((r) => (r.view === "administrative" ? [r] : []));
  const total = result.data?.total ?? 0;
  const nextCursor = result.data?.nextCursor ?? null;
  const filtered = q !== "" || status !== "awaiting_assignment";

  const [assigning, setAssigning] = useState<Row | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // The row that was assigned leaves the default list, so focus moves to the confirmation.
  const noticeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  const from = rows.length === 0 ? 0 : page * Number(limit) + 1;
  const to = page * Number(limit) + rows.length;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <Heading level={1}>Patients</Heading>
        <p className="mt-1 max-w-3xl text-body text-ink-muted">
          Administrative details only: status, intake progress and care team. Clinical records are
          not shown to this role. A patient who has submitted intake waits here until a therapist is
          assigned.
        </p>
      </header>

      {notice ? (
        <div ref={noticeRef} tabIndex={-1} role="status" className="focus-visible:focus-ring">
          <Banner tone="success" title="Therapist assigned">
            {notice}
          </Banner>
        </div>
      ) : null}

      <form
        role="search"
        aria-label="Filter patients"
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-wrap items-end gap-3 rounded-container border border-border bg-surface p-3"
      >
        <div className="flex min-w-40 flex-col gap-1">
          <label htmlFor="adm-search" className="text-small font-medium text-ink">
            Search by name or MRN
          </label>
          <TextInput
            id="adm-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
        </div>
        <div className="flex min-w-40 flex-col gap-1">
          <label htmlFor="adm-status" className="text-small font-medium text-ink">
            Status
          </label>
          <Select
            id="adm-status"
            options={statusOptions}
            value={status}
            onValueChange={(v) => update({ status: v })}
          />
        </div>
        {filtered ? (
          <Button
            variant="quiet"
            onClick={() => {
              setSearch("");
              router.replace(pathname, { scroll: false });
            }}
          >
            Reset to awaiting assignment
          </Button>
        ) : null}
      </form>

      {result.isError ? (
        <Banner
          tone="error"
          title={
            result.error instanceof ApiError && result.error.code === "forbidden"
              ? "You cannot view this list"
              : "The patient list could not load"
          }
          action={
            <Button variant="secondary" size="sm" onClick={() => void result.refetch()}>
              Try again
            </Button>
          }
        >
          Nothing was changed.
        </Banner>
      ) : !result.data ? (
        <SkeletonGroup label="Loading patients" className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </SkeletonGroup>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="users"
          title={filtered ? "No patients match these filters" : "Nobody is waiting for a therapist"}
        >
          {filtered
            ? `No patients with status "${statusLabel[status] ?? status}"${q ? ` match "${q}"` : ""}. Change the status or the search.`
            : "Every patient who has submitted intake has a therapist. New patients appear here when they finish onboarding."}
        </EmptyState>
      ) : (
        <>
          <p role="status" className="text-small text-ink-muted tabular-nums">
            {total} {total === 1 ? "patient" : "patients"}
            {status === "any" ? "" : ` with status ${statusLabel[status]?.toLowerCase() ?? status}`}
            {q ? ` matching "${q}"` : ""}. Showing {from} to {to}.
          </p>
          <div
            aria-busy={result.isFetching}
            className={result.isPlaceholderData ? "opacity-70" : undefined}
          >
            <Table caption="Patients">
              <THead>
                <tr>
                  <Th>Patient</Th>
                  <Th>MRN</Th>
                  <Th>Status</Th>
                  <Th>Intake</Th>
                  <Th>Therapist</Th>
                  <Th>Registered (UTC)</Th>
                  <Th>
                    <span className="sr-only">Action</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {rows.map((r) => {
                  const intake = intakeText(r);
                  return (
                    <Tr key={r.id}>
                      <Td className="font-medium">{fullName(r)}</Td>
                      <Td mono className="text-ink-muted">
                        {r.mrn}
                      </Td>
                      <Td>
                        <Tag tone={patientStatusTone(r.status)}>
                          {statusLabel[r.status] ?? r.status}
                        </Tag>
                      </Td>
                      <Td className={intake.missing ? undefined : "text-ink-muted"}>
                        {intake.text}
                      </Td>
                      <Td>
                        {r.primaryClinician ? (
                          r.primaryClinician.name
                        ) : (
                          <span className="text-ink-muted">Not assigned</span>
                        )}
                      </Td>
                      <Td>{utcDate(r.createdAt)}</Td>
                      <Td>
                        {r.status === "awaiting_assignment" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            aria-label={`Assign therapist to ${fullName(r)}`}
                            onClick={() => {
                              setNotice(null);
                              setAssigning(r);
                            }}
                          >
                            Assign therapist
                          </Button>
                        ) : r.status === "intake_incomplete" ? (
                          <span className="text-small text-ink-muted">
                            Waiting for the patient to finish intake
                          </span>
                        ) : null}
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          </div>
          <nav aria-label="Pagination" className="flex flex-wrap items-center justify-end gap-2">
            <div className="w-36">
              <Select
                options={limitOptions}
                value={limit}
                onValueChange={(v) => update({ limit: v })}
                aria-label="Rows per page"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous page
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!nextCursor}
              onClick={() => {
                setCursors((c) => [...c.slice(0, page + 1), nextCursor ?? undefined]);
                setPage(page + 1);
              }}
            >
              Next page
            </Button>
          </nav>
        </>
      )}

      {assigning ? (
        <AssignDialog
          patient={{ id: assigning.id, name: fullName(assigning) }}
          open
          onOpenChange={(o) => {
            if (!o) setAssigning(null);
          }}
          onAssigned={(name) => {
            const who = fullName(assigning);
            setAssigning(null);
            setNotice(
              `${name} is now the primary therapist for ${who}. They can build a care plan.`,
            );
            void queryClient.invalidateQueries({ queryKey: ["admin", "directory"] });
          }}
        />
      ) : null}
    </div>
  );
}
