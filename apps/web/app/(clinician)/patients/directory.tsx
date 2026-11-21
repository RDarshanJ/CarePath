"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button, Select, Table, TBody, Td, Th, THead, TextInput, Tr } from "@carepath/ui";
import { patientStatusLabel, planStageLabels } from "@carepath/shared";
import { patientStatusSchema } from "@carepath/shared/contracts";
import {
  AppLink,
  EmptyDirectory,
  ListSkeleton,
  PageHeader,
  PatientStatusTag,
  QueryError,
  planStageText,
} from "../_components/common";
import { useClinician } from "../_lib/context";
import { formatDate, formatDateTime, fullName } from "../_lib/format";
import { keys, qs, reads } from "../_lib/queries";

type SortKey = "name" | "-name" | "lastActivity" | "-lastActivity" | "status" | "-status";

const statusOptions = [
  { value: "any", label: "Any status" },
  ...patientStatusSchema.options.map((s) => ({
    value: s,
    label: patientStatusLabel(s),
  })),
];
const planOptions = [
  { value: "any", label: "Any plan stage" },
  { value: "published", label: planStageLabels.published },
  { value: "draft", label: planStageLabels.draft },
  { value: "none", label: planStageLabels.none },
];
const activityOptions = [
  { value: "any", label: "Any time" },
  { value: "7", label: "None in 7 days" },
  { value: "14", label: "None in 14 days" },
  { value: "30", label: "None in 30 days" },
];
const reviewOptions = [
  { value: "any", label: "Any" },
  { value: "yes", label: "Has open review" },
  { value: "no", label: "No open review" },
];
const limitOptions = [
  { value: "25", label: "25 per page" },
  { value: "50", label: "50 per page" },
  { value: "100", label: "100 per page" },
];

function FilterField({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-40 flex-col gap-1">
      <label htmlFor={id} className="text-small font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}

export function Directory() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { session, timezone } = useClinician();

  const status = params.get("status") ?? "any";
  const clinician = params.get("clinician") ?? "any";
  const plan = params.get("plan") ?? "any";
  const activity = params.get("activity") ?? "any";
  const review = params.get("review") ?? "any";
  const sort = (params.get("sort") ?? "name") as SortKey;
  const limit = params.get("limit") ?? "25";

  // The search term lives in memory only. It is never written to the URL, which would put a name
  // or MRN in history, a shared screen and referrers (DR-002 R1, R2).
  const [q, setQ] = useState("");

  // Cursor pages: index 0 is the first page. Any change to the query resets to page 1.
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [page, setPage] = useState(0);
  const filterSignature = [q, status, clinician, plan, activity, review, sort, limit].join("|");
  useEffect(() => {
    setCursors([undefined]);
    setPage(0);
  }, [filterSignature]);

  function update(next: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "any" || (k === "sort" && v === "name") || (k === "limit" && v === "25"))
        p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  // Search: typed text is sent to the server after a short pause.
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (search.trim() === q) return;
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search, q]);

  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        e.key === "/" &&
        !(t && /^(input|textarea|select)$/i.test(t.tagName)) &&
        !t?.isContentEditable
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const practitioners = useQuery({
    queryKey: keys.practitioners,
    queryFn: reads.practitioners,
    retry: false,
  });
  const clinicianOptions = useMemo(() => {
    const opts = [{ value: "any", label: "Any clinician" }];
    if (session.practitionerId) opts.push({ value: "me", label: "My patients" });
    for (const p of practitioners.data?.items ?? []) {
      if (p.id === session.practitionerId) continue;
      opts.push({ value: p.id, label: p.name });
    }
    return opts;
  }, [practitioners.data, session.practitionerId]);

  const lastActivityBefore = useMemo(
    () =>
      activity === "any"
        ? undefined
        : new Date(Date.now() - Number(activity) * 86_400_000).toISOString(),
    [activity],
  );

  const cursor = cursors[page];
  const query = qs({
    status: status === "any" ? undefined : status,
    clinicianId:
      clinician === "any" ? undefined : clinician === "me" ? session.practitionerId : clinician,
    planStage: plan === "any" ? undefined : plan,
    lastActivityBefore,
    hasOpenReview: review === "yes" ? "true" : review === "no" ? "false" : undefined,
    sort,
    limit,
    cursor,
  });
  const result = useQuery({
    queryKey: keys.directory(query, q),
    queryFn: () => reads.directory(query, q),
    placeholderData: keepPreviousData,
  });

  const rows = (result.data?.items ?? []).flatMap((r) => (r.view === "clinical" ? [r] : []));
  const nextCursor = result.data?.nextCursor ?? null;
  const filtersActive = [q, status, clinician, plan, activity, review].some(
    (v) => v && v !== "any",
  );

  const total = result.data?.total ?? rows.length;
  const first = page * Number(limit) + 1;
  const rangeText =
    rows.length === 0
      ? "No patients"
      : rows.length === 1 && first === 1 && total === 1
        ? "1 patient"
        : `Patients ${first} to ${first + rows.length - 1} of ${total}${filtersActive ? " matching" : ""}`;

  function sortProps(field: "name" | "lastActivity" | "status") {
    const current: "ascending" | "descending" | "none" =
      sort === field ? "ascending" : sort === `-${field}` ? "descending" : "none";
    return {
      sort: current,
      onSort: () => update({ sort: sort === field ? `-${field}` : field }),
    };
  }

  // Arrow keys move between patient links, so the table is usable without a mouse.
  function onBodyKeyDown(e: KeyboardEvent<HTMLTableSectionElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const links = Array.from(
      e.currentTarget.querySelectorAll<HTMLAnchorElement>("a[data-row-link]"),
    );
    const at = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (at < 0) return;
    e.preventDefault();
    links[Math.max(0, Math.min(links.length - 1, at + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Patients"
        description="Everyone in your clinic. Search, sort and filter run on the server, so the page matches the whole directory."
      />

      <form
        role="search"
        aria-label="Filter patients"
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-wrap items-end gap-3 rounded-container border border-border bg-surface p-3"
      >
        <FilterField label="Search by name or MRN" id="dir-search">
          <TextInput
            id="dir-search"
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Press / to search"
            className="w-56"
          />
        </FilterField>
        <FilterField label="Status" id="dir-status">
          <Select
            id="dir-status"
            options={statusOptions}
            value={status}
            onValueChange={(v) => update({ status: v })}
          />
        </FilterField>
        <FilterField label="Clinician" id="dir-clinician">
          <Select
            id="dir-clinician"
            options={clinicianOptions}
            value={clinicianOptions.some((o) => o.value === clinician) ? clinician : "any"}
            onValueChange={(v) => update({ clinician: v })}
          />
        </FilterField>
        <FilterField label="Plan stage" id="dir-plan">
          <Select
            id="dir-plan"
            options={planOptions}
            value={plan}
            onValueChange={(v) => update({ plan: v })}
          />
        </FilterField>
        <FilterField label="Activity" id="dir-activity">
          <Select
            id="dir-activity"
            options={activityOptions}
            value={activity}
            onValueChange={(v) => update({ activity: v })}
          />
        </FilterField>
        <FilterField label="Review" id="dir-review">
          <Select
            id="dir-review"
            options={reviewOptions}
            value={review}
            onValueChange={(v) => update({ review: v })}
          />
        </FilterField>
        {filtersActive ? (
          <Button
            variant="quiet"
            onClick={() => {
              setSearch("");
              setQ("");
              router.replace(pathname, { scroll: false });
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </form>

      {result.isError ? (
        <QueryError error={result.error} onRetry={() => void result.refetch()} />
      ) : !result.data ? (
        <ListSkeleton rows={8} label="Loading patients" />
      ) : rows.length === 0 ? (
        <EmptyDirectory
          filtered={filtersActive}
          onClear={() => {
            setSearch("");
            setQ("");
            router.replace(pathname, { scroll: false });
          }}
        />
      ) : (
        <>
          <div
            aria-busy={result.isFetching}
            className={result.isPlaceholderData ? "opacity-70" : undefined}
          >
            <Table caption="Patients">
              <THead>
                <tr>
                  <Th {...sortProps("name")}>Patient</Th>
                  <Th>MRN</Th>
                  <Th {...sortProps("status")}>Status</Th>
                  <Th>Clinician</Th>
                  <Th>Care plan</Th>
                  <Th {...sortProps("lastActivity")}>Last activity</Th>
                  <Th>Next visit</Th>
                  <Th numeric>Open reviews</Th>
                </tr>
              </THead>
              <TBody onKeyDown={onBodyKeyDown}>
                {rows.map((r) => (
                  <Tr
                    key={r.id}
                    className="cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("a,button")) return;
                      router.push(`/patients/${r.id}`);
                    }}
                  >
                    <Td className="font-medium">
                      <AppLink href={`/patients/${r.id}`} data-row-link="true">
                        {fullName(r)}
                      </AppLink>
                    </Td>
                    <Td mono className="text-ink-muted">
                      {r.mrn}
                    </Td>
                    <Td>
                      <PatientStatusTag status={r.status} />
                    </Td>
                    <Td>
                      {r.primaryClinician ? (
                        r.primaryClinician.name.replace(/,.*$/, "")
                      ) : (
                        <span className="text-ink-muted">Not assigned</span>
                      )}
                    </Td>
                    <Td>{planStageText(r.planStage, r.currentVersionNumber)}</Td>
                    <Td>
                      {r.lastActivityAt ? (
                        formatDate(r.lastActivityAt, timezone)
                      ) : (
                        <span className="text-ink-muted">No activity yet</span>
                      )}
                    </Td>
                    <Td>
                      {r.nextAppointmentAt ? (
                        formatDateTime(r.nextAppointmentAt, timezone)
                      ) : (
                        <span className="text-ink-muted">None booked</span>
                      )}
                    </Td>
                    <Td numeric>{r.openReviewCount > 0 ? `${r.openReviewCount} open` : "None"}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
          <nav
            aria-label="Pagination"
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <p role="status" className="text-small text-ink-muted tabular-nums">
              {rangeText}
            </p>
            <div className="flex items-center gap-2">
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
                  setCursors((c) => {
                    const copy = c.slice(0, page + 1);
                    copy.push(nextCursor ?? undefined);
                    return copy;
                  });
                  setPage(page + 1);
                }}
              >
                Next page
              </Button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
