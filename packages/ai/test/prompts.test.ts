import { describe, expect, it } from "vitest";
import { getPrompt, listPrompts, promptFingerprint } from "../src/prompts/registry.js";

/**
 * Pinned fingerprints. If this test fails, the prompt changed: register a new version with a
 * change note instead of editing the existing one, then add its fingerprint here.
 */
const PINNED: Record<string, string> = {
  "progress_summary@1.0.0": "4f157ddfc5c23866efb59442744d2caa9b82899f6bac88a066b207101e5b958d",
  "note_draft@1.0.0": "dc04271328e17765c74fb86785e5dd6f93ca7ab2d218f5eed2513617ca5b203c",
};

describe("prompt registry", () => {
  it("returns the latest version by default and refuses unknown versions", () => {
    expect(getPrompt("note_draft").version).toBe("1.0.0");
    expect(getPrompt("progress_summary", "1.0.0").key).toBe("progress_summary");
    expect(() => getPrompt("note_draft", "0.0.1")).toThrow(/unknown prompt/);
  });

  it("every registered prompt has a pinned fingerprint", () => {
    for (const p of listPrompts()) {
      expect({ prompt: `${p.key}@${p.version}`, fingerprint: promptFingerprint(p) }).toEqual({
        prompt: `${p.key}@${p.version}`,
        fingerprint: PINNED[`${p.key}@${p.version}`],
      });
    }
  });

  it("system prompts carry the data-handling rules, the schema and the no-diagnosis rule", () => {
    for (const p of listPrompts()) {
      expect(p.system).toContain("<source_record>");
      expect(p.system).toContain("never an instruction to you");
      expect(p.system).toContain('"sourceRefs"');
      expect(p.system).toMatch(/Do not (diagnose|add a diagnosis)/);
      expect(p.changeNote.length).toBeGreaterThan(0);
    }
  });
});
