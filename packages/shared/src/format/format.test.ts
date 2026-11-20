import { describe, expect, it } from "vitest";
import {
  addDays,
  clock,
  daysBetween,
  daysText,
  doseText,
  formatAgeCompact,
  formatAgeHours,
  formatBornText,
  formatCalendarDay,
  formatCount,
  formatDate,
  formatDateTime,
  formatRecordAsOf,
  formatTime,
  formatUpdatedAt,
  formatVisitTime,
  hourOf,
  isLocalDate,
  listWords,
  localDayOf,
  ofTotal,
  painPatientListText,
  painPatientSentenceText,
  painStaffText,
  plural,
  restText,
  scheduleText,
  secondsText,
  tzAbbreviation,
  zoneName,
  zoneNameGeneric,
  zoneOffsetMinutes,
} from "./index.js";

const DENVER = "America/Denver";
const PHOENIX = "America/Phoenix";
const LA = "America/Los_Angeles";
const NY = "America/New_York";

describe("dates and times", () => {
  it("formats instants in the clinic zone, never numeric-only", () => {
    const at = "2026-11-18T16:01:00Z";
    expect(formatDateTime(at, DENVER)).toBe("Nov 18, 9:01 AM");
    expect(formatDate(at, DENVER)).toBe("Nov 18, 2026");
    expect(formatTime(at, DENVER)).toBe("9:01 AM");
    expect(formatTime("2026-11-18T05:00:00Z", DENVER)).toBe("10:00 PM");
  });

  it("puts an instant on the clinic's calendar day, not UTC's", () => {
    expect(localDayOf("2026-11-19T03:30:00Z", DENVER)).toBe("2026-11-18");
    expect(localDayOf("2026-11-19T03:30:00Z", NY)).toBe("2026-11-18");
    expect(localDayOf("2026-11-19T06:30:00Z", NY)).toBe("2026-11-19");
    expect(hourOf("2026-11-19T03:30:00Z", DENVER)).toBe(20);
  });

  it("writes calendar days without a clock", () => {
    expect(formatCalendarDay("2026-11-12")).toBe("Nov 12");
    expect(formatCalendarDay("2026-11-12", "withYear")).toBe("Nov 12, 2026");
    expect(formatCalendarDay("2026-11-19", "long")).toBe("Thursday, November 19");
    expect(formatCalendarDay("2026-11-19", "longYear")).toBe("Thursday, Nov 19, 2026");
    expect(formatCalendarDay("2026-11-19", "weekday")).toBe("Thursday");
    expect(formatCalendarDay("not a day")).toBe("not a day");
    expect(formatBornText("1984-03-04")).toBe("Born Mar 4, 1984");
  });

  it("does calendar arithmetic across month, year and daylight saving without a zone", () => {
    expect(addDays("2026-11-29", 3)).toBe("2026-12-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
    expect(isLocalDate("2026-02-30")).toBe(false);
    expect(isLocalDate("2026-11-19")).toBe(true);
  });

  it("states updated stamps in the clinic zone", () => {
    expect(formatUpdatedAt("2026-11-18T16:12:00Z", DENVER)).toBe("Updated 9:12 AM");
    expect(formatRecordAsOf("2026-11-18T16:12:00Z", DENVER)).toBe("Record as of 9:12 AM");
  });
});

describe("zone naming", () => {
  it("names the zone for patients and clinicians, steady across daylight saving", () => {
    for (const at of ["2026-01-15T17:00:00Z", "2026-07-15T17:00:00Z"]) {
      expect(zoneNameGeneric(DENVER, at, "long")).toBe("Mountain Time");
      expect(zoneNameGeneric(DENVER, at, "short")).toBe("MT");
    }
    expect(tzAbbreviation("2026-01-15T17:00:00Z", DENVER)).toBe("MST");
    expect(tzAbbreviation("2026-07-15T17:00:00Z", DENVER)).toBe("MDT");
    expect(zoneName(DENVER, "2026-07-15T17:00:00Z")).toBe("Mountain Daylight Time");
  });

  it("keeps the honest name for a zone with no daylight saving", () => {
    expect(zoneNameGeneric(PHOENIX, "2026-07-15T17:00:00Z", "long")).toBe("Mountain Standard Time");
  });

  it("measures offsets on both sides of the spring and autumn changes", () => {
    expect(zoneOffsetMinutes("2026-03-08T08:59:00Z", DENVER)).toBe(-420); // before: MST
    expect(zoneOffsetMinutes("2026-03-08T09:00:00Z", DENVER)).toBe(-360); // after: MDT
    expect(zoneOffsetMinutes("2026-11-01T07:59:00Z", DENVER)).toBe(-360);
    expect(zoneOffsetMinutes("2026-11-01T08:00:00Z", DENVER)).toBe(-420);
    expect(zoneOffsetMinutes("2026-07-15T12:00:00Z", PHOENIX)).toBe(-420);
  });
});

describe("formatVisitTime (CD-314)", () => {
  const winter = "2026-01-15T16:00:00Z"; // 9:00 AM in Denver, 8:00 AM in Los Angeles
  const summer = "2026-07-15T15:00:00Z"; // 9:00 AM in Denver

  it("shows a physical visit on the clinic clock with the zone named", () => {
    const patient = formatVisitTime(winter, {
      clinicZone: DENVER,
      viewerZone: LA,
      audience: "patient",
    });
    expect(patient).toEqual({
      clinic: "9:00 AM Mountain Time",
      viewer: null,
      text: "9:00 AM Mountain Time",
    });
    expect(
      formatVisitTime(winter, { clinicZone: DENVER, viewerZone: LA, audience: "staff" }).text,
    ).toBe("9:00 AM MT");
  });

  it("adds the viewer's own time for a video visit from another zone", () => {
    const t = formatVisitTime(winter, {
      clinicZone: DENVER,
      viewerZone: LA,
      isVideo: true,
      audience: "patient",
    });
    expect(t.clinic).toBe("9:00 AM Mountain Time");
    expect(t.viewer).toBe("8:00 AM Pacific Time");
    expect(t.text).toBe("9:00 AM Mountain Time, which is 8:00 AM Pacific Time for you");
    expect(
      formatVisitTime(winter, {
        clinicZone: DENVER,
        viewerZone: LA,
        isVideo: true,
        audience: "staff",
      }).text,
    ).toBe("9:00 AM MT (8:00 AM PT for you)");
  });

  it("adds nothing when the viewer is on the clinic's clock", () => {
    const same = formatVisitTime(winter, {
      clinicZone: DENVER,
      viewerZone: DENVER,
      isVideo: true,
      audience: "patient",
    });
    expect(same.viewer).toBeNull();
    // Another zone id with the same offset at that instant shows the same wall time: no second time.
    const phoenixWinter = formatVisitTime(winter, {
      clinicZone: DENVER,
      viewerZone: PHOENIX,
      isVideo: true,
      audience: "patient",
    });
    expect(phoenixWinter.viewer).toBeNull();
    const none = formatVisitTime(winter, {
      clinicZone: DENVER,
      isVideo: true,
      audience: "patient",
    });
    expect(none.viewer).toBeNull();
  });

  it("handles daylight saving: the same viewer differs in summer, not in winter", () => {
    const summerPhoenix = formatVisitTime(summer, {
      clinicZone: DENVER,
      viewerZone: PHOENIX,
      isVideo: true,
      audience: "patient",
    });
    expect(summerPhoenix.clinic).toBe("9:00 AM Mountain Time");
    expect(summerPhoenix.viewer).toBe("8:00 AM Mountain Standard Time");
  });

  it("spans the spring change: a visit either side of it keeps the clinic wall time", () => {
    const before = formatVisitTime("2026-03-07T16:00:00Z", {
      clinicZone: DENVER,
      audience: "patient",
    });
    const after = formatVisitTime("2026-03-09T15:00:00Z", {
      clinicZone: DENVER,
      audience: "patient",
    });
    expect(before.text).toBe("9:00 AM Mountain Time");
    expect(after.text).toBe("9:00 AM Mountain Time");
  });

  it("shows the viewer's day when the video visit falls on another calendar day for them", () => {
    // 10:30 PM in Denver on Thu Jan 15 is 12:30 AM Friday in New York.
    const at = "2026-01-16T05:30:00Z";
    const t = formatVisitTime(at, {
      clinicZone: DENVER,
      viewerZone: NY,
      isVideo: true,
      audience: "patient",
      withDay: true,
    });
    expect(t.clinic).toBe("Thu, Jan 15, 10:30 PM Mountain Time");
    expect(t.viewer).toBe("Fri, Jan 16, 12:30 AM Eastern Time");
  });
});

describe("relative and absolute time", () => {
  it("prose age", () => {
    expect(formatAgeHours(0)).toBe("under an hour");
    expect(formatAgeHours(1)).toBe("1 hour");
    expect(formatAgeHours(19)).toBe("19 hours");
    expect(formatAgeHours(47)).toBe("47 hours");
    expect(formatAgeHours(48)).toBe("2 days");
    expect(formatAgeHours(100)).toBe("4 days");
  });
  it("compact age is for narrow columns only", () => {
    expect(formatAgeCompact(0)).toBe("under 1 h");
    expect(formatAgeCompact(5)).toBe("5 h");
    expect(formatAgeCompact(72)).toBe("3 d");
  });
  it("durations", () => {
    expect(secondsText(1)).toBe("1 second");
    expect(secondsText(45)).toBe("45 seconds");
    expect(secondsText(60)).toBe("1 minute");
    expect(secondsText(150)).toBe("2 minutes 30 seconds");
    expect(clock(45)).toBe("00:45");
    expect(clock(605)).toBe("10:05");
  });
});

describe("numbers", () => {
  it("pluralises, groups and says of", () => {
    expect(plural(1, "visit")).toBe("1 visit");
    expect(plural(2, "visit")).toBe("2 visits");
    expect(plural(0, "repetition")).toBe("0 repetitions");
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1000)).toBe("1,000");
    expect(formatCount(1234567.5)).toBe("1,234,567.5");
    expect(ofTotal(7, 10)).toBe("7 of 10");
    expect(listWords(["Monday", "Wednesday", "Friday"])).toBe("Monday, Wednesday and Friday");
    expect(listWords(["Monday"])).toBe("Monday");
  });
});

describe("dose and schedule text (CD-301)", () => {
  const base = { sets: null, reps: null, holdSeconds: null, durationSeconds: null, restSeconds: 0 };
  it("spells units out", () => {
    expect(doseText({ ...base, sets: 3, reps: 10, holdSeconds: 5, restSeconds: 30 })).toBe(
      "3 sets of 10 repetitions, hold 5 seconds, rest 30 seconds",
    );
    expect(doseText({ ...base, sets: 1, reps: 1 })).toBe("1 set of 1 repetition");
    expect(doseText({ ...base, reps: 12 })).toBe("12 repetitions");
    expect(doseText({ ...base, sets: 3, durationSeconds: 30 })).toBe("3 sets, 30 seconds each");
    expect(doseText({ ...base, sets: 2 })).toBe("2 sets");
  });
  it("leaves rest to its own sentence for patients", () => {
    const d = { ...base, sets: 3, reps: 12, restSeconds: 45 };
    expect(doseText(d, { rest: false })).toBe("3 sets of 12 repetitions");
    expect(restText(d)).toBe("Rest 45 seconds between sets");
    expect(restText(base)).toBe("No rest timer");
  });
  it("writes schedules, Monday first for patients and in order for staff", () => {
    expect(daysText([0, 1, 3, 5])).toBe("Mon, Wed, Fri, Sun");
    expect(daysText([0, 1, 2, 3, 4, 5, 6])).toBe("Every day");
    expect(scheduleText([5, 1, 3], 1)).toBe("Mon, Wed, Fri, once a day");
    expect(scheduleText([0, 1, 2, 3, 4, 5, 6], 2)).toBe("Every day, 2 times a day");
  });
});

describe("pain value (CD-220)", () => {
  it("prints the same value three ways by audience and context", () => {
    expect(painStaffText(7)).toBe("Pain 7 of 10 (patient-reported)");
    expect(painStaffText(7, "2026-11-19")).toBe("Pain 7 of 10 (patient-reported), Nov 19");
    expect(painPatientListText(7)).toBe("7 of 10");
    expect(painPatientSentenceText(7)).toBe("pain of 7 out of 10");
  });
  it("never adds a band word", () => {
    for (let n = 0; n <= 10; n++) {
      for (const s of [painStaffText(n), painPatientListText(n), painPatientSentenceText(n)]) {
        expect(s).not.toMatch(/mild|moderate|severe|improv/i);
      }
    }
  });
});
