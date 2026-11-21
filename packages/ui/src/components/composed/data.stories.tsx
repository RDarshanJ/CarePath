import { useId, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Case, Cases } from "../../stories/helpers";
import { Table, TBody, Td, THead, Th, Tr } from "./table";
import { LoadMore, TablePagination } from "./pagination";
import { ActiveFilterChips, FilterBar, FilterField, FilterPanel, SearchField } from "./filter-bar";
import { EmptyState } from "./empty-state";
import { Select } from "../primitives/select";
import { Link } from "../primitives/link";

const meta = { title: "Composed/Tables and filters" } satisfies Meta;
export default meta;
type Story = StoryObj;

/* All names and values are synthetic. */
const firstNames = ["Avery", "Blake", "Casey", "Dana", "Ellis", "Frankie", "Gray", "Harper"];
const statuses = ["Active", "Intake incomplete", "Awaiting assignment", "Inactive"] as const;
const rows = Array.from({ length: 57 }, (_, i) => ({
  id: `p${i + 1}`,
  name: `${firstNames[i % firstNames.length]} Demopatient${i + 1}`,
  mrn: `CP-${String(10400 + i * 7).padStart(6, "0")}`,
  status: statuses[i % statuses.length]!,
  pain: (i * 3) % 11,
  last: `Nov ${19 - (i % 18)}`,
}));

function PatientTable() {
  const id = useId();
  const [sort, setSort] = useState<"ascending" | "descending">("descending");
  const [selected, setSelected] = useState("p2");
  const [size] = useState(5);
  const shown = useMemo(
    () =>
      [...rows]
        .sort((a, b) => (sort === "ascending" ? a.pain - b.pain : b.pain - a.pain))
        .slice(0, size),
    [sort, size],
  );
  return (
    <Table
      caption="Patients"
      captionId={`${id}-caption`}
      captionHelp="Sorted by reported pain. Synthetic data."
    >
      <THead>
        <Tr header>
          <Th>Patient</Th>
          <Th>MRN</Th>
          <Th>Status</Th>
          <Th
            numeric
            sort={sort}
            sortWords={{ ascending: "lowest first", descending: "highest first" }}
            onSort={() => setSort(sort === "ascending" ? "descending" : "ascending")}
          >
            Reported pain
          </Th>
          <Th>Last activity</Th>
        </Tr>
      </THead>
      <TBody>
        {shown.map((r) => (
          <Tr key={r.id} selected={r.id === selected} onClick={() => setSelected(r.id)}>
            <Td>
              <button
                type="button"
                className="rounded-control text-link underline underline-offset-2 focus-visible:focus-ring"
                aria-current={r.id === selected ? "true" : undefined}
                onClick={() => setSelected(r.id)}
              >
                {r.name}
              </button>
            </Td>
            <Td mono>{r.mrn}</Td>
            <Td>{r.status}</Td>
            <Td numeric>{r.pain} of 10</Td>
            <Td>{r.last}</Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}

export const TableStory: Story = {
  name: "Table",
  render: () => <PatientTable />,
};

export const TablePaginationStory: Story = {
  name: "TablePagination",
  render: () => (
    <Cases>
      <Case label="Middle page">
        <TablePagination
          noun="Patients"
          start={11}
          end={20}
          total={57}
          hasPrevious
          hasNext
          onPrevious={() => undefined}
          onNext={() => undefined}
          pageSize={10}
          onPageSizeChange={() => undefined}
          pageSizes={[10, 25, 50]}
        />
      </Case>
      <Case label="First page: Previous is hidden">
        <TablePagination
          noun="Patients"
          start={1}
          end={10}
          total={57}
          hasPrevious={false}
          hasNext
          onPrevious={() => undefined}
          onNext={() => undefined}
          pageSize={10}
          onPageSizeChange={() => undefined}
          pageSizes={[10, 25, 50]}
        />
      </Case>
      <Case label="No results">
        <TablePagination
          noun="Patients"
          start={0}
          end={0}
          total={0}
          hasPrevious={false}
          hasNext={false}
          onPrevious={() => undefined}
          onNext={() => undefined}
          pageSize={10}
          onPageSizeChange={() => undefined}
          pageSizes={[10, 25, 50]}
        />
      </Case>
    </Cases>
  ),
};

const tasks = Array.from(
  { length: 23 },
  (_, i) => `Check-in from ${firstNames[i % 8]} Demopatient${i + 1}`,
);

function LoadMoreList({ loading }: { loading?: boolean }) {
  const list = useRef<HTMLUListElement>(null);
  const count = 5;
  return (
    <div className="flex flex-col gap-3">
      <ul
        ref={list}
        className="flex flex-col divide-y divide-border rounded-container border border-border bg-surface"
      >
        {tasks.slice(0, count).map((t) => (
          <li key={t} className="px-3 py-2">
            <Link href="#tasks" variant="standalone">
              {t}
            </Link>
          </li>
        ))}
      </ul>
      <LoadMore
        label="Show more tasks"
        noun="tasks"
        hasMore
        loading={loading ?? false}
        shown={count}
        total={tasks.length}
        listRef={list}
        onLoadMore={() => undefined}
      />
    </div>
  );
}

export const LoadMoreStory: Story = {
  name: "LoadMore",
  render: () => (
    <Cases>
      <Case label="More to show">
        <LoadMoreList />
      </Case>
      <Case label="Loading the next page">
        <LoadMoreList loading />
      </Case>
    </Cases>
  ),
};

function Filters({ withStatus }: { withStatus: boolean }) {
  const id = useId();
  const [status, setStatus] = useState(withStatus ? "Intake incomplete" : "all");
  const [q, setQ] = useState(withStatus ? "Casey" : "");
  const active = status !== "all" ? 1 : 0;
  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        label="Search and filter patients"
        resultText={withStatus ? "3 patients" : "57 patients"}
        activeCount={active + (q ? 1 : 0)}
        onClear={() => {
          setQ("");
          setStatus("all");
        }}
      >
        <SearchField label="Search patients" placeholder="Name or MRN" value={q} onSearch={setQ} />
        <FilterPanel activeCount={active}>
          <FilterField label="Status" id={`${id}-status`}>
            <Select
              id={`${id}-status`}
              value={status}
              onValueChange={setStatus}
              options={[
                { value: "all", label: "All statuses" },
                ...statuses.map((s) => ({ value: s, label: s })),
              ]}
            />
          </FilterField>
        </FilterPanel>
      </FilterBar>
      <ActiveFilterChips
        filters={
          status !== "all"
            ? [{ id: "status", label: `Status: ${status}`, onRemove: () => setStatus("all") }]
            : []
        }
      />
    </div>
  );
}

export const FilterBarStory: Story = {
  name: "FilterBar",
  render: () => (
    <Cases>
      <Case label="No filters">
        <Filters withStatus={false} />
      </Case>
      <Case label="A search and one filter applied">
        <Filters withStatus />
      </Case>
    </Cases>
  ),
};

export const FilterFieldStory: Story = {
  name: "FilterField",
  render: () => (
    <FilterField label="Status" id="story-filter-status">
      <Select
        id="story-filter-status"
        defaultValue="all"
        options={[
          { value: "all", label: "All statuses" },
          ...statuses.map((s) => ({ value: s, label: s })),
        ]}
      />
    </FilterField>
  ),
};

export const SearchFieldStory: Story = {
  name: "SearchField",
  render: () => (
    <div className="max-w-sm">
      <SearchField
        label="Search patients"
        placeholder="Name or MRN"
        value=""
        onSearch={() => undefined}
      />
    </div>
  ),
};

export const FilterPanelStory: Story = {
  name: "FilterPanel",
  render: () => (
    <FilterPanel activeCount={1}>
      <FilterField label="Status" id="story-panel-status">
        <Select
          id="story-panel-status"
          defaultValue="Active"
          options={statuses.map((s) => ({ value: s, label: s }))}
        />
      </FilterField>
    </FilterPanel>
  ),
};

export const ActiveFilterChipsStory: Story = {
  name: "ActiveFilterChips",
  render: () => (
    <Cases>
      <Case label="Two applied filters">
        <ActiveFilterChips
          filters={[
            { id: "status", label: "Status: Intake incomplete", onRemove: () => undefined },
            { id: "therapist", label: "Therapist: Dana Whitfield", onRemove: () => undefined },
          ]}
        />
      </Case>
      <Case label="No match for the filters">
        <EmptyState icon="search" title="No patients match">
          Try fewer filters, or check the spelling.
        </EmptyState>
      </Case>
    </Cases>
  ),
};
