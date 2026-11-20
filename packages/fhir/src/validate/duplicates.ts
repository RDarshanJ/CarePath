/**
 * Layer 3: duplicate detection (research HD section 5). The primary key is a business
 * identifier (system + value). Without one, a natural key per resource type:
 *   Patient: family + given + birth date + gender
 *   Practitioner: family + given + staff identifier
 *   Goal: patient + description + start date
 *   CarePlan: patient + title + published time + version number
 *   Observation: patient + code + effective time + value
 *   Condition: patient + code system + code + onset date + recorded time
 *   Appointment: patient + practitioner + start + created time
 *   Encounter: patient + start + class + type
 *   DocumentReference: patient + note type + signature time + SHA-256 of the SOAP text
 * Keys are computed from mapped records, so the importer can compare an incoming record with
 * rows already stored through the same function.
 */
import { encounterTypeColumn, noteHash } from "../mappers/index.js";
import type { MappedType, RecordByType } from "../types.js";

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export function naturalKey<T extends MappedType>(type: T, r: RecordByType[T]): string {
  switch (type) {
    case "Organization": {
      const o = r as RecordByType["Organization"];
      return `organization|${norm(o.slug || o.name)}`;
    }
    case "Patient": {
      const p = r as RecordByType["Patient"];
      return `patient|${norm(p.familyName)}|${norm(p.givenName)}|${p.birthDate}|${p.gender}`;
    }
    case "Practitioner": {
      const p = r as RecordByType["Practitioner"];
      return `practitioner|${norm(p.familyName)}|${norm(p.givenName)}|${norm(p.staffId)}`;
    }
    case "Goal": {
      const g = r as RecordByType["Goal"];
      return `goal|${g.patientId}|${norm(g.description)}|${g.startDate ?? ""}`;
    }
    case "CarePlan": {
      const c = r as RecordByType["CarePlan"];
      return `careplan|${c.patientId}|${norm(c.title)}|${c.publishedAt}|${c.versionNumber}`;
    }
    case "Observation": {
      const o = r as RecordByType["Observation"];
      // Values are compared at the database's precision (Decimal(10, 2)).
      const value =
        o.valueQuantity !== null
          ? Number(o.valueQuantity).toFixed(2)
          : (o.valueString ?? `absent:${o.dataAbsentReason ?? ""}`);
      return `observation|${o.patientId}|${o.codeSystem}|${o.code}|${o.effectiveAt}|${norm(value)}`;
    }
    case "Condition": {
      const c = r as RecordByType["Condition"];
      return `condition|${c.patientId}|${c.codeSystem}|${c.code}|${c.onsetDate ?? ""}|${c.recordedAt ?? ""}`;
    }
    case "Appointment": {
      const a = r as RecordByType["Appointment"];
      return `appointment|${a.patientId}|${a.practitionerId}|${a.startsAt}|${a.createdAt}`;
    }
    case "Encounter": {
      const e = r as RecordByType["Encounter"];
      return `encounter|${e.patientId}|${e.startedAt}|${e.class}|${encounterTypeColumn(e)}`;
    }
    case "DocumentReference": {
      const d = r as RecordByType["DocumentReference"];
      return `documentreference|${d.patientId}|${d.noteType}|${d.signedAt}|${noteHash(d)}`;
    }
  }
  return `${type}|unknown`;
}
