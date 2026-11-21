import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PAIN_ANCHOR_HIGH, PAIN_ANCHOR_LOW } from "@carepath/shared";
import {
  AIDraftBlock,
  ActiveFilterChips,
  Banner,
  BottomTabBar,
  DateOfBirthField,
  DialogPanel,
  EmptyState,
  ErrorSummary,
  FilterBar,
  FilterField,
  FilterPanel,
  LoadMore,
  LoadingStatus,
  PainScale,
  SearchField,
  SideNav,
  Table,
  TablePagination,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TBody,
  Td,
  THead,
  Th,
  Timer,
  ToastSurface,
  Tr,
  painItemLabel,
  rangeText,
  sortButtonLabel,
} from "../../index";

const html = (node: ReactElement) => renderToStaticMarkup(node);
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe("Banner (CD-443, CD-449)", () => {
  it("errors are alerts, others status; icon plus title", () => {
    const err = html(
      <Banner tone="error" title="Your note was not saved">
        Your text is still here.
      </Banner>,
    );
    expect(err).toContain('role="alert"');
    expect(err).toContain("<svg");
    expect(html(<Banner tone="info" title="Your plan changed" />)).toContain('role="status"');
  });
  it("focusOnMount makes the heading a focus target", () => {
    expect(html(<Banner tone="error" title="Not saved" focusOnMount />)).toContain('tabindex="-1"');
  });
});

describe("ErrorSummary (CD-441)", () => {
  it("is an alert with one link per error, to the field id", () => {
    const out = html(
      <ErrorSummary
        errors={[
          { targetId: "dob-day", message: "Date of birth must include a month" },
          { targetId: "pain-0", message: "Choose a pain number from 0 to 10" },
        ]}
      />,
    );
    expect(out).toContain('role="alert"');
    expect(out).toContain("Fix these before you continue");
    expect(out).toContain('href="#dob-day"');
    expect(out).toContain('href="#pain-0"');
  });
  it("renders nothing without errors", () => {
    expect(html(<ErrorSummary errors={[]} />)).toBe("");
  });
});

describe("EmptyState (CD-535, CD-336)", () => {
  it("heading, sentence, optional action, padding and image", () => {
    const out = html(
      <EmptyState title="No visits today" padded image={<img alt="" src="/x.png" />}>
        Nothing is booked with you today.
      </EmptyState>,
    );
    expect(out).toContain("<h3");
    expect(out).toContain("No visits today");
    expect(out).toContain('class="p-4"');
    expect(out).toContain("<img");
  });
});

describe("Table (CD-338 to CD-341)", () => {
  it("caption, one header row, scoped headers, sort names and selection", () => {
    const out = html(
      <Table caption="Patients" captionHelp="Sorted by last activity, newest first.">
        <THead>
          <Tr header>
            <Th
              sort="descending"
              onSort={() => {}}
              sortWords={{ ascending: "oldest first", descending: "newest first" }}
            >
              Last activity
            </Th>
            <Th>Status</Th>
          </Tr>
        </THead>
        <TBody>
          <Tr selected>
            <Td>Row</Td>
            <Td wrap>Long reason text</Td>
          </Tr>
        </TBody>
      </Table>,
    );
    expect(out).toContain("<caption");
    expect(count(out, /scope="col"/g)).toBe(2);
    expect(out).toContain('aria-sort="descending"');
    expect(count(out, /aria-sort/g)).toBe(1);
    expect(out).toContain('aria-label="Last activity, sortable, currently sorted newest first"');
    expect(out).toContain('aria-selected="true"');
    expect(out).toContain("border-selected-edge");
    expect(out).toContain("line-clamp-2");
    expect(sortButtonLabel("Name", "none")).toBe("Name, sortable");
  });
  it("hover only on rows that respond to a pointer", () => {
    expect(
      html(
        <table>
          <tbody>
            <Tr>
              <Td>x</Td>
            </Tr>
          </tbody>
        </table>,
      ),
    ).not.toContain("hover:bg");
    expect(
      html(
        <table>
          <tbody>
            <Tr onClick={() => {}}>
              <Td>x</Td>
            </Tr>
          </tbody>
        </table>,
      ),
    ).toContain("hover:bg-primary-subtle");
  });
});

describe("TablePagination and LoadMore (CD-334, CD-335)", () => {
  const base = {
    noun: "Patients",
    start: 1,
    end: 25,
    total: 87,
    onPrevious: () => {},
    onNext: () => {},
    pageSize: 25,
  };
  it("hides Previous on the first page and shows the range", () => {
    const out = html(<TablePagination {...base} hasPrevious={false} hasNext />);
    expect(out).toContain("Patients 1 to 25 of 87");
    expect(out).toContain('aria-label="Pagination of patients"');
    expect(out).toContain("Next page");
    expect(out).not.toContain("Previous page");
  });
  it("one page: no nav, the range stays", () => {
    const out = html(
      <TablePagination {...base} end={10} total={10} hasPrevious={false} hasNext={false} />,
    );
    expect(out).not.toContain("<nav");
    expect(out).toContain("Patients 1 to 10 of 10");
    expect(rangeText("Patients", 0, 0, 0)).toBe("No patients");
  });
  it("LoadMore: secondary button with the direction, count line, end text", () => {
    const more = html(
      <LoadMore
        label="Show more tasks"
        noun="tasks"
        onLoadMore={() => {}}
        hasMore
        shown={25}
        total={87}
      />,
    );
    expect(more).toContain("Show more tasks");
    expect(more).toContain("Showing 25 of 87");
    expect(more).toContain("border-secondary-border");
    const end = html(
      <LoadMore
        label="Show more tasks"
        noun="tasks"
        onLoadMore={() => {}}
        hasMore={false}
        shown={87}
      />,
    );
    expect(end).toContain("End of the list");
    expect(end).not.toContain("<button");
  });
});

describe("FilterBar (CD-331, CD-342)", () => {
  it("is a named search landmark; Clear filters only when something is active", () => {
    const idle = html(
      <FilterBar label="Search and filter patients" resultText="87 patients">
        <SearchField label="Search patients" value="" onSearch={() => {}} shortcut />
        <FilterField label="Status">{(c) => <select id={c.id} />}</FilterField>
      </FilterBar>,
    );
    expect(idle).toContain('role="search"');
    expect(idle).toContain('aria-label="Search and filter patients"');
    expect(idle).toContain("Search patients");
    expect(idle).toContain("Press / to search.");
    expect(idle).not.toContain("Clear filters");
    const active = html(
      <FilterBar label="Filter" activeCount={2} onClear={() => {}}>
        <FilterPanel activeCount={2}>
          <span />
        </FilterPanel>
      </FilterBar>,
    );
    expect(active).toContain("Clear filters");
    expect(active).toContain("Filters, 2 active");
    expect(active).toContain('aria-expanded="true"');
  });
  it("chips are a labelled list with named remove buttons", () => {
    const out = html(
      <ActiveFilterChips filters={[{ id: "s", label: "Status: Active", onRemove: () => {} }]} />,
    );
    expect(out).toContain('aria-label="Active filters"');
    expect(out).toContain('aria-label="Remove filter Status: Active"');
  });
});

describe("PainScale (CD-100, CD-101)", () => {
  it("eleven radios, anchors visible and in the names, no band words", () => {
    const out = html(<PainScale defaultValue={7} />);
    expect(count(out, /role="radio"/g)).toBe(11);
    expect(out).toContain(PAIN_ANCHOR_LOW);
    expect(out).toContain(PAIN_ANCHOR_HIGH);
    expect(out).toContain('aria-label="0 of 10, no pain"');
    expect(out).toContain('aria-label="10 of 10, worst pain imaginable"');
    expect(out).toContain("You chose 7 of 10.");
    expect(out).not.toMatch(/\b(mild|moderate|severe)\b/i);
    expect(out).not.toMatch(/aria-hidden="true"[^>]*>\s*<span>0 No pain/);
    expect(painItemLabel(4)).toBe("4 of 10");
  });
  it("wraps 0 to 5 and 6 to 10 on a phone, one row when wide, three rows at 320", () => {
    const out = html(<PainScale />);
    expect(out).toContain("grid-cols-4");
    expect(out).toContain("@min-[19.5rem]:grid-cols-6");
    expect(out).toContain("@min-[36rem]:grid-cols-11");
  });
  it("error state and the stop note", () => {
    const out = html(
      <PainScale id="pain" error="Choose a pain number from 0 to 10" value={8} stoppedAt={8} />,
    );
    expect(out).toContain('id="pain"');
    expect(out).toContain('aria-invalid="true"');
    expect(out).toContain("You told us 8 when you stopped.");
  });
});

describe("DateOfBirthField (CD-102)", () => {
  it("three labelled parts with birth-date autocomplete and numeric keyboards", () => {
    const out = html(
      <DateOfBirthField
        id="dob"
        value={{ day: "18", month: "10", year: "1962" }}
        onChange={() => {}}
        today="2026-11-19"
      />,
    );
    expect(out).toContain("<fieldset");
    expect(out).toContain('autoComplete="bday-day"');
    expect(out).toContain('autoComplete="bday-month"');
    expect(out).toContain('autoComplete="bday-year"');
    expect(count(out, /inputMode="numeric"/g)).toBe(2);
    expect(out).toContain("October");
    expect(out).toContain("For example, 18 10 1962");
  });
  it("a form error marks only the named parts", () => {
    const out = html(
      <DateOfBirthField
        id="dob"
        value={{ day: "18", month: "", year: "1962" }}
        onChange={() => {}}
        today="2026-11-19"
        error="Date of birth must include a month"
        errorParts={["month"]}
      />,
    );
    expect(count(out, /aria-invalid="true"/g)).toBe(1);
    expect(out).toContain("Date of birth must include a month");
  });
});

describe("Timer, loading, tabs, toast, dialog panel, nav, AI block", () => {
  it("Timer is role=timer with live announcements off", () => {
    const out = html(<Timer label="Hold" seconds={30} running={false} />);
    expect(out).toContain('role="timer"');
    expect(out).toContain('aria-live="off"');
    expect(out).toContain("0:30");
  });
  it("LoadingStatus says what is loading in words", () => {
    expect(html(<LoadingStatus label="Loading times" />)).toContain("Loading times");
  });
  it("Tabs render a tablist with the selected bar", () => {
    const out = html(
      <Tabs defaultValue="plan">
        <TabsList aria-label="Record sections">
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="plan">Plan panel</TabsContent>
      </Tabs>,
    );
    expect(out).toContain('role="tablist"');
    expect(out).toContain("data-[state=active]:border-selected-edge");
  });
  it("ToastSurface has no error tone", () => {
    expect(html(<ToastSurface tone="success" title="Version 3 published" />)).toContain(
      "text-success-ink",
    );
  });
  it("DialogPanel puts feedback above the footer", () => {
    const out = html(
      <DialogPanel
        title="Resolve this task"
        feedback={<Banner tone="error" title="Not saved" />}
        footer={<button type="button">Resolve task</button>}
      />,
    );
    expect(out.indexOf("Not saved")).toBeLessThan(out.indexOf("Resolve task"));
  });
  it("nav marks the current page and badges with units", () => {
    const side = html(
      <SideNav
        label="Clinician"
        items={[
          {
            href: "/inbox",
            label: "Messages",
            icon: "message",
            current: true,
            count: 3,
            countUnit: "unread",
          },
        ]}
      />,
    );
    expect(side).toContain('aria-current="page"');
    expect(side).toContain("3 unread");
    expect(side).toContain("bg-selected-bg");
    const bottom = html(
      <BottomTabBar label="Patient" items={[{ href: "/today", label: "Today", icon: "home" }]} />,
    );
    expect(bottom).toContain('aria-label="Patient"');
  });
  it("AIDraftBlock keeps its label and dashed rule", () => {
    const out = html(<AIDraftBlock provider="Demo provider, rule-based">Text</AIDraftBlock>);
    expect(out).toContain("Draft, generated, not reviewed");
    expect(out).toContain("border-dashed");
  });
});
