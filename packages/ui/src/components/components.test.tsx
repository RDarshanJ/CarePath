import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AIDraftBlock,
  Banner,
  Button,
  Field,
  IconButton,
  PainScale,
  StatusChip,
  Table,
  Tag,
  TBody,
  TextInput,
  THead,
  Th,
  Tr,
  Td,
  iconNames,
} from "../index";

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("component accessibility contracts", () => {
  it("IconButton exposes its label as the accessible name", () => {
    expect(html(<IconButton label="Close panel" icon="x" />)).toContain('aria-label="Close panel"');
  });

  it("Button defaults to type=button and marks loading as busy", () => {
    const out = html(
      <Button loading loadingLabel="Saving">
        Save
      </Button>,
    );
    expect(out).toContain('type="button"');
    expect(out).toContain('aria-busy="true"');
    expect(out).toContain("Saving");
  });

  it("Field labels requirement in words and wires hint and error to the control", () => {
    const out = html(
      <Field
        label="Date of birth"
        requirement="required"
        hint="Use the format on your card."
        error="Enter a date that has passed."
      >
        {(c) => <TextInput {...c} />}
      </Field>,
    );
    expect(out).toContain("(required)");
    expect(out).toContain('aria-invalid="true"');
    expect(out).toMatch(/aria-describedby="[^"]+-hint [^"]+-err"/);
    expect(out).toContain("Error: ");
  });

  it("StatusChip carries an icon and text; Tag is outlined text only", () => {
    const chip = html(<StatusChip tone="warning">Discomfort reported</StatusChip>);
    expect(chip).toContain("<svg");
    expect(chip).toContain("bg-warning-bg");
    const tag = html(<Tag tone="neutral">Unscheduled</Tag>);
    expect(tag).not.toContain("<svg");
    expect(tag).toContain("border");
    expect(tag).not.toMatch(/\bbg-(success|warning|error|info)-bg\b/);
  });

  it("Banner errors are announced as alerts", () => {
    expect(
      html(
        <Banner tone="error" title="We could not save">
          Your answers are kept on this device.
        </Banner>,
      ),
    ).toContain('role="alert"');
  });

  it("AIDraftBlock shows the fixed label, the provider and a dashed rule", () => {
    const out = html(<AIDraftBlock provider="Demo provider, rule-based">Text</AIDraftBlock>);
    expect(out).toContain("Draft, generated, not reviewed");
    expect(out).toContain("Demo provider, rule-based");
    expect(out).toContain("border-dashed");
    expect(out).not.toMatch(/sparkle/i);
  });

  it("PainScale renders eleven radios and a plain-language value line", () => {
    const out = html(<PainScale defaultValue={4} />);
    expect((out.match(/role="radio"/g) ?? []).length).toBe(11);
    expect(out).toContain("You chose 4 of 10: moderate.");
  });

  it("Table has a caption, column scopes and aria-sort", () => {
    const out = html(
      <Table caption="Review queue">
        <THead>
          <tr>
            <Th sort="ascending" onSort={() => {}}>
              Name
            </Th>
          </tr>
        </THead>
        <TBody>
          <Tr selected>
            <Td>Row</Td>
          </Tr>
        </TBody>
      </Table>,
    );
    expect(out).toContain("<caption");
    expect(out).toContain('scope="col"');
    expect(out).toContain('aria-sort="ascending"');
    expect(out).toContain('aria-selected="true"');
  });

  it("icon set has no sparkle", () => {
    expect(iconNames.some((n) => /spark|magic|wand/i.test(n))).toBe(false);
  });
});
