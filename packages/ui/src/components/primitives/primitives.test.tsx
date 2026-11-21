import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Button,
  Checkbox,
  CountBadge,
  Field,
  FieldError,
  FieldGroup,
  Heading,
  IconButton,
  Link,
  LinkProvider,
  Progress,
  Radio,
  RadioGroup,
  SegmentedControl,
  SkipLink,
  SlotButton,
  StatusChip,
  Switch,
  Tag,
  TextInput,
  ToggleChip,
  ToggleChipGroup,
  buttonClasses,
  countBadgeText,
  iconNames,
} from "../../index";

const html = (node: ReactElement) => renderToStaticMarkup(node);
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe("Button (CD-420, CD-421, CD-429, CD-530)", () => {
  it("defaults to type=button and keeps words while loading", () => {
    const out = html(
      <Button loading loadingLabel="Saving">
        Save
      </Button>,
    );
    expect(out).toContain('type="button"');
    expect(out).toContain('aria-busy="true"');
    expect(out).toContain("Saving");
    expect(out).not.toContain(">Save<");
  });

  it("follows the interaction-state table for each variant", () => {
    expect(buttonClasses({ variant: "secondary" })).toContain("border-secondary-border");
    expect(buttonClasses({ variant: "secondary" })).toContain("text-link");
    expect(buttonClasses({ variant: "secondary" })).toContain("hover:bg-secondary-hover-bg");
    expect(buttonClasses({ variant: "neutral" })).toContain("border-border-control");
    expect(buttonClasses({ variant: "neutral" })).toContain("active:bg-selected-bg");
    expect(buttonClasses({ variant: "quiet" })).toContain("hover:bg-primary-subtle");
    expect(buttonClasses({ variant: "primary" })).toContain("active:bg-primary-active");
    expect(buttonClasses({ fullWidthOnPhone: true })).toContain("w-full");
  });

  it('tone="critical" uses error ink, an icon and the words', () => {
    const out = html(
      <Button variant="secondary" tone="critical">
        Stop, this hurts
      </Button>,
    );
    expect(out).toContain("border-error-ink");
    expect(out).toContain("text-error-ink");
    expect(out).toContain("<svg");
    expect(out).toContain("Stop, this hurts");
    expect(out).not.toContain("bg-error-ink");
  });

  it("unavailable stays focusable with aria-disabled and its reason", () => {
    const out = html(
      <Button unavailable aria-describedby="why">
        Publish version 3
      </Button>,
    );
    expect(out).toContain('aria-disabled="true"');
    expect(out).toContain('aria-describedby="why"');
    expect(out).not.toMatch(/\sdisabled=""/);
  });

  it("href renders a link (navigation is a link)", () => {
    const out = html(
      <Button href="/plan" variant="secondary">
        Open care plan
      </Button>,
    );
    expect(out).toMatch(/^<a /);
    expect(out).toContain('href="/plan"');
  });

  it("IconButton has an accessible name and no visible tooltip at rest", () => {
    const out = html(<IconButton label="Close evidence panel" icon="x" />);
    expect(out).toContain('aria-label="Close evidence panel"');
    expect(out).not.toContain("data-tooltip");
  });
});

describe("Link (CD-530)", () => {
  it("is underlined, uses the provided element, and a plain anchor for tel:", () => {
    function Fake(p: { href: string; className?: string; children?: React.ReactNode }) {
      return (
        <a data-fake="" href={p.href} className={p.className}>
          {p.children}
        </a>
      );
    }
    const inApp = html(
      <LinkProvider component={Fake}>
        <Link href="/today">Back to Today</Link>
      </LinkProvider>,
    );
    expect(inApp).toContain("data-fake");
    expect(inApp).toContain("underline");
    const tel = html(
      <LinkProvider component={Fake}>
        <Link href="tel:5550100">555 0100</Link>
      </LinkProvider>,
    );
    expect(tel).not.toContain("data-fake");
  });
  it("standalone links get the theme's target height", () => {
    expect(
      html(
        <Link href="/a" variant="standalone">
          Open
        </Link>,
      ),
    ).toContain("min-h-target");
  });
});

describe("Field, FieldError and FieldGroup (CD-531, CD-441)", () => {
  it("says required in words, places the error above the input and orders describedby", () => {
    const out = html(
      <Field
        label="Repetitions"
        requirement="required"
        hint="From 1 to 100."
        error="Enter repetitions from 1 to 100"
      >
        {(c) => <TextInput {...c} />}
      </Field>,
    );
    expect(out).toContain("(required)");
    expect(out).toContain('aria-invalid="true"');
    expect(out).toContain('aria-required="true"');
    expect(out).toMatch(/aria-describedby="[^"]+-hint [^"]+-err"/);
    expect(out.indexOf("Enter repetitions")).toBeLessThan(out.indexOf("<input"));
    expect(out).toContain('<span class="sr-only">Error: </span>');
  });

  it("counts characters only near the limit", () => {
    const quiet = html(
      <Field label="Note" requirement="optional" count={{ length: 10, max: 100 }}>
        {(c) => <TextInput {...c} />}
      </Field>,
    );
    expect(quiet).not.toContain("characters left");
    const near = html(
      <Field label="Note" requirement="optional" count={{ length: 95, max: 100 }}>
        {(c) => <TextInput {...c} />}
      </Field>,
    );
    expect(near).toContain("5 characters left");
  });

  it("FieldError has the hidden prefix and becomes an alert only when live", () => {
    expect(html(<FieldError>Choose a side</FieldError>)).not.toContain('role="alert"');
    expect(html(<FieldError live>Choose a side</FieldError>)).toContain('role="alert"');
  });

  it("FieldGroup is a fieldset with a legend and a linked error", () => {
    const out = html(
      <FieldGroup legend="Side" requirement="required" id="side" error="Select a side">
        <span />
      </FieldGroup>,
    );
    expect(out).toContain("<fieldset");
    expect(out).toContain("<legend");
    expect(out).toContain('aria-describedby="side-err"');
  });

  it("a unit is visible and read with the value", () => {
    const out = html(<TextInput aria-describedby="h" unit="seconds" />);
    expect(out).toContain("seconds");
    expect(out).toMatch(/aria-describedby="h [^"]+"/);
  });
});

describe("choice controls (CD-534, CD-532, CD-311)", () => {
  it("checkbox, radio and switch keep a label linked to the control", () => {
    const cb = html(<Checkbox label="Mornings" />);
    expect(cb).toMatch(/<button[^>]+role="checkbox"[^>]+id="([^"]+)"[\s\S]*for="\1"/);
    const rd = html(
      <RadioGroup aria-label="Side">
        <Radio value="left" label="Left side" />
      </RadioGroup>,
    );
    expect(rd).toContain('role="radio"');
    const sw = html(<Switch label="Reminders" checked />);
    expect(sw).toContain('role="switch"');
    expect(sw).toContain("On");
  });

  it("SegmentedControl is a radio group with a check on the selected option", () => {
    const out = html(
      <SegmentedControl
        label="Show"
        value="open"
        onValueChange={() => {}}
        options={[
          { value: "open", label: "Open and in review" },
          { value: "closed", label: "Closed" },
        ]}
      />,
    );
    expect(out).toContain('role="radiogroup"');
    expect(count(out, /role="radio"/g)).toBe(2);
    expect(out).toContain('aria-checked="true"');
    expect(out).toContain("bg-selected-edge");
  });

  it("ToggleChip is a pressed toggle in a fieldset, with a check mark when on", () => {
    const out = html(
      <ToggleChipGroup legend="Days">
        <ToggleChip label="Monday" shortLabel="Mon" pressed onPressedChange={() => {}} />
        <ToggleChip label="Tuesday" shortLabel="Tue" pressed={false} onPressedChange={() => {}} />
      </ToggleChipGroup>,
    );
    expect(out).toContain("<fieldset");
    expect(out).toContain('aria-pressed="true"');
    expect(out).toContain('aria-pressed="false"');
    expect(count(out, /<svg/g)).toBe(1);
    expect(out).toContain('<span class="sr-only">Monday</span>');
  });

  it("SlotButton names the full date and says Selected in words", () => {
    const plain = html(<SlotButton time="9:00 AM" fullLabel="Friday, November 20, 9:00 AM" />);
    expect(plain).toContain('aria-label="Friday, November 20, 9:00 AM"');
    expect(plain).not.toContain("Selected");
    const chosen = html(
      <SlotButton time="9:00 AM" fullLabel="Friday, November 20, 9:00 AM" selected />,
    );
    expect(chosen).toContain("Selected");
    expect(chosen).toContain("bg-selected-bg");
  });
});

describe("status (CD-230, CD-508)", () => {
  it("StatusChip has an icon and words; Tag is outlined text only", () => {
    const chip = html(<StatusChip tone="warning">Discomfort reported</StatusChip>);
    expect(chip).toContain("<svg");
    expect(chip).toContain("bg-warning-bg");
    const crit = html(<StatusChip tone="critical">Stopped for discomfort</StatusChip>);
    expect(crit).toContain("bg-critical-subtle-bg");
    const tag = html(<Tag tone="warning">Intake incomplete</Tag>);
    expect(tag).not.toContain("<svg");
    expect(tag).not.toMatch(/\bbg-(success|warning|error|info)-bg\b/);
  });

  it("CountBadge is hidden at zero, caps at 99+ and carries the full value and unit", () => {
    expect(html(<CountBadge count={0} unit="unread" />)).toBe("");
    const out = html(<CountBadge count={120} unit="unread" />);
    expect(out).toContain("99+");
    expect(out).toContain("120 unread");
    expect(countBadgeText(7)).toBe("7");
  });
});

describe("Progress, Heading, SkipLink", () => {
  it("Progress shows the label and value words, never a bare percentage", () => {
    const out = html(<Progress label="Exercises" value={3} max={6} valueText="3 of 6 exercises" />);
    expect(out).toContain("Exercises");
    expect(out).toContain("3 of 6 exercises");
    expect(out).not.toContain("%<");
  });
  it("Heading h4 reads the theme weight; focusOnMount makes it a static focus target", () => {
    expect(html(<Heading level={4}>Before you start</Heading>)).toContain("font-h4");
    const out = html(
      <Heading level={1} focusOnMount>
        Session paused
      </Heading>,
    );
    expect(out).toContain('tabindex="-1"');
  });
  it("SkipLink targets main", () => {
    expect(html(<SkipLink />)).toContain('href="#main"');
  });
  it("the icon set has no sparkle and has the back chevron", () => {
    expect(iconNames.some((n) => /spark|magic|wand/i.test(n))).toBe(false);
    expect(iconNames).toContain("chevron-left");
  });
});
