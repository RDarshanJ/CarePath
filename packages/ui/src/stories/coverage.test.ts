/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import * as ui from "../index";

/*
 * D-WP-4: the stories cover the library. One story per exported component, named after it, with the
 * component's states shown inside the story. The test reads the package's public exports and the story
 * files, so adding a component without a story (or a story for something that is not exported) fails.
 *
 * Exclusions are for compound parts that cannot render without their parent. Each one names the story
 * that shows it and the reason; the test checks that the story exists and that its source uses the part.
 */

/** Exported names that are components: a function or forwardRef object with a mixed-case name. */
function exportedComponents(): string[] {
  return Object.entries(ui)
    .filter(([name, value]) => {
      if (!/^[A-Z]/.test(name) || /^[A-Z0-9_]+$/.test(name)) return false; // constants such as TOAST_MS
      return (
        typeof value === "function" ||
        (typeof value === "object" && value !== null && "$$typeof" in value)
      );
    })
    .map(([name]) => name)
    .sort();
}

const modules = import.meta.glob<Record<string, unknown>>("../components/**/*.stories.tsx", {
  eager: true,
});
const sources = import.meta.glob<string>("../components/**/*.stories.tsx", {
  eager: true,
  query: "?raw",
  import: "default",
});

/** Story display names (the `name` on each story object), with the file each came from. */
function stories(): { name: string; file: string }[] {
  const out: { name: string; file: string }[] = [];
  for (const [file, mod] of Object.entries(modules)) {
    for (const [exportName, value] of Object.entries(mod)) {
      if (exportName === "default") continue;
      const name = (value as { name?: string }).name;
      out.push({ name: name ?? exportName, file });
    }
  }
  return out;
}

/** Compound parts shown inside their parent's story. */
const covered: Record<string, { by: string; reason: string }> = {
  LinkProvider: {
    by: "Link",
    reason: "Supplies the router link element; it has no visual of its own.",
  },
  ThemeWrap: {
    by: "ThemeScope",
    reason:
      "Re-applies the theme inside portalled overlays; every overlay story renders through it.",
  },
  Radio: { by: "RadioGroup", reason: "A radio exists only inside its group." },
  ToggleChip: { by: "ToggleChipGroup", reason: "A chip exists only inside its labelled group." },
  TabsList: { by: "Tabs", reason: "Part of the tabs composition." },
  TabsTrigger: { by: "Tabs", reason: "Part of the tabs composition." },
  TabsContent: { by: "Tabs", reason: "Part of the tabs composition." },
  THead: { by: "Table", reason: "A table section; needs the table." },
  TBody: { by: "Table", reason: "A table section; needs the table." },
  Tr: { by: "Table", reason: "A table row; needs a table section." },
  Th: { by: "Table", reason: "A header cell; needs a row." },
  Td: { by: "Table", reason: "A cell; needs a row." },
  DialogTrigger: { by: "Dialog", reason: "Opens the dialog; needs the root." },
  DialogClose: { by: "Dialog", reason: "Closes the dialog; needs the root." },
  PopoverTrigger: { by: "Popover", reason: "Opens the popover; needs the root." },
  PopoverClose: { by: "Popover", reason: "Closes the popover; needs the root." },
  PopoverContent: { by: "Popover", reason: "The popover surface; needs the root." },
  TooltipProvider: { by: "Tooltip", reason: "Shared delay settings; no visual of its own." },
  TooltipTrigger: { by: "Tooltip", reason: "Anchors the tooltip; needs the root." },
  TooltipContent: { by: "Tooltip", reason: "The tooltip surface; needs the root." },
  DropdownMenuTrigger: { by: "DropdownMenu", reason: "Opens the menu; needs the root." },
  DropdownMenuContent: { by: "DropdownMenu", reason: "The menu surface; needs the root." },
  DropdownMenuItem: { by: "DropdownMenu", reason: "A menu item; needs the menu." },
  DropdownMenuCheckboxItem: { by: "DropdownMenu", reason: "A menu item; needs the menu." },
  DropdownMenuLabel: { by: "DropdownMenu", reason: "A menu group label; needs the menu." },
  DropdownMenuSeparator: { by: "DropdownMenu", reason: "A menu divider; needs the menu." },
  ToastProvider: {
    by: "ToastSurface",
    reason: "Hosts live toasts raised with useToast; the story raises one.",
  },
};

describe("Storybook coverage", () => {
  const components = exportedComponents();
  const all = stories();
  const names = all.map((s) => s.name);

  it("finds the exported components and the stories", () => {
    expect(components.length).toBeGreaterThan(100);
    expect(all.length).toBeGreaterThan(50);
  });

  it("has one story per story name", () => {
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes).toEqual([]);
  });

  it("has a story for every exported component that is not a covered part", () => {
    const missing = components.filter((c) => !names.includes(c) && !(c in covered));
    expect(missing).toEqual([]);
  });

  it("has no story for something that is not an exported component", () => {
    const stray = names.filter((n) => !components.includes(n));
    expect(stray).toEqual([]);
  });

  it("excludes only real components, each shown by an existing story that uses it", () => {
    for (const [part, { by, reason }] of Object.entries(covered)) {
      expect(components, `${part} is not an exported component`).toContain(part);
      expect(reason.length, `${part} needs a reason`).toBeGreaterThan(10);
      const parent = all.find((s) => s.name === by);
      expect(parent, `${part}: no story named ${by}`).toBeDefined();
      expect(names, `${part} has its own story and needs no exclusion`).not.toContain(part);
      const source = sources[parent!.file] ?? "";
      expect(source, `${by} does not render ${part}`).toMatch(new RegExp(`<${part}[\\s>/]`));
    }
  });

  it("makes the story count equal the exported component count less the exclusions", () => {
    expect(all.length).toBe(components.length - Object.keys(covered).length);
  });
});
