"use client";

import { useEffect } from "react";
import NextLink from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { PatientHeader } from "@carepath/shared/contracts";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@carepath/ui";
import { ApiError } from "../../../../lib/api/errors";
import {
  AppLink,
  ListSkeleton,
  NOT_ON_CARE_TEAM_REASON,
  PageHeader,
  PatientStatusTag,
  QueryError,
} from "../../_components/common";
import { useClinician } from "../../_lib/context";
import { formatLocalDate, fullName } from "../../_lib/format";
import { keys, reads } from "../../_lib/queries";
import { ActivityTab, CheckInsTab, HistoryTab, OverviewTab, PlanTab } from "./tabs";

const tabs = [
  { value: "overview", label: "Overview" },
  { value: "plan", label: "Plan" },
  { value: "activity", label: "Activity" },
  { value: "check-ins", label: "Check-ins" },
  { value: "history", label: "History" },
] as const;
type TabValue = (typeof tabs)[number]["value"];

export function PatientRecord({ patientId }: { patientId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { can } = useClinician();
  const header = useQuery({
    queryKey: keys.header(patientId),
    queryFn: () => reads.header(patientId),
    retry: (count, e) => !(e instanceof ApiError && e.status < 500) && count < 1,
  });
  const careTeam = useQuery({
    queryKey: keys.careTeam(patientId),
    queryFn: () => reads.careTeam(patientId),
    retry: false,
  });

  const requested = params.get("tab");
  const tab: TabValue = tabs.some((t) => t.value === requested)
    ? (requested as TabValue)
    : "overview";

  function selectTab(value: string) {
    const p = new URLSearchParams(params.toString());
    if (value === "overview") p.delete("tab");
    else p.set("tab", value);
    p.delete("checkIn");
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (header.data) document.title = `${fullName(header.data)} | CarePath`;
  }, [header.data]);

  if (header.isError) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Patient record"
          eyebrow={<AppLink href="/patients">All patients</AppLink>}
        />
        <QueryError error={header.error} onRetry={() => void header.refetch()} />
      </div>
    );
  }
  if (!header.data) return <ListSkeleton rows={8} label="Loading patient record" />;
  const patient = header.data;
  const team = careTeam.data?.members ?? [];

  return (
    <div className="flex flex-col gap-4">
      <RecordHeader
        patient={patient}
        team={team.map((m) => `${m.name.replace(/,.*$/, "")} (${m.roleLabel.toLowerCase()})`)}
      >
        {can("clinical.write") ? (
          patient.onCareTeam === false ? (
            <>
              <p id="builder-team-reason" className="max-w-xs text-small text-ink-muted">
                {NOT_ON_CARE_TEAM_REASON}
              </p>
              <Button disabled aria-describedby="builder-team-reason">
                Open care plan builder
              </Button>
            </>
          ) : (
            <Button asChild>
              <NextLink href={`/patients/${patient.id}/plan`}>Open care plan builder</NextLink>
            </Button>
          )
        ) : null}
      </RecordHeader>

      <Tabs value={tab} onValueChange={selectTab}>
        <TabsList aria-label="Patient record sections">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="plan">
          <PlanTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab patientId={patient.id} />
        </TabsContent>
        <TabsContent value="check-ins">
          <CheckInsTab patientId={patient.id} highlight={params.get("checkIn")} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab patientId={patient.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Persistent header: it stays at the top while the section content scrolls (REQ-REC-01). */
function RecordHeader({
  patient,
  team,
  children,
}: {
  patient: PatientHeader;
  team: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-1 border-b border-border bg-bg px-1 pb-3 pt-1">
      <PageHeader
        eyebrow={<AppLink href="/patients">All patients</AppLink>}
        title={fullName(patient)}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body">
            <span className="font-mono tabular-nums">{patient.mrn}</span>
            <span>Born {formatLocalDate(patient.birthDate, true)}</span>
            <PatientStatusTag status={patient.status} />
            <span>Time zone {patient.timezone}</span>
            {team.length > 0 ? <span>Care team: {team.join(", ")}</span> : null}
          </span>
        }
        actions={children}
      />
    </div>
  );
}
