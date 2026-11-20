import { describe, expect, it } from "vitest";
import { initialStatus, statusTransitions } from "../src/status.js";

/** C1 ruling 3.4: one initial status per status table, and it is a state that can move on. */
describe("initialStatus", () => {
  it("names every status table", () => {
    expect(Object.keys(initialStatus).sort()).toEqual(Object.keys(statusTransitions).sort());
  });

  it("uses a source state of each table, never a terminal one", () => {
    for (const [table, status] of Object.entries(initialStatus)) {
      const allowed = statusTransitions[table as keyof typeof statusTransitions].allowed;
      expect(Object.keys(allowed), table).toContain(status);
    }
  });

  it("never starts an appointment as requested (C1 ruling 3.3)", () => {
    expect(initialStatus.Appointment).toBe("booked");
  });
});
