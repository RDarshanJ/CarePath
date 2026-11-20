import { createHash } from "node:crypto";
import type { DocumentReference } from "@medplum/fhirtypes";
import { EXTENSIONS, identifierSystem, parseIdentifierSystem, SYSTEMS } from "../config.js";
import type { FhirIssue } from "../issues.js";
import type { ClinicalNoteDocumentRecord, ClinicalNoteType } from "../types.js";
import {
  instantUtc,
  mapIssue,
  ref,
  type FromFhirContext,
  type MapResult,
  type ToFhirContext,
} from "./common.js";

/** LOINC note types (research HD section 3.5): progress note, and H&P for an initial evaluation. */
export const NOTE_TYPE_LOINC: Record<ClinicalNoteType, { code: string; display: string }> = {
  progress_note: { code: "11506-3", display: "Progress note" },
  initial_evaluation: { code: "34117-2", display: "History and physical note" },
};

/** A ClinicalNote with its append-only versions, as stored (main's schema; see WP 5.2). */
export interface ClinicalNoteSource {
  id: string;
  patientId: string;
  encounterId: string | null;
  authorPractitionerId: string;
  noteType: ClinicalNoteType;
  status: "draft" | "signed" | "entered_in_error";
  signedAt: string | null;
  signedByPractitionerId: string | null;
  versions: {
    id: string;
    versionNumber: number;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    isAmendment: boolean;
    amendmentReason: string | null;
    createdAt: string;
  }[];
}

/**
 * The exportable versions of one note: only clinician-signed content (advisor plan revision 1).
 * A note that was never signed (a draft, an AI draft, a draft entered in error) yields nothing.
 * Otherwise: the version that was signed (the last version that is not an amendment, since a
 * signed note takes amendments only), then each amendment in order. The newest is `current`,
 * earlier ones `superseded`; every version of a note entered in error is `entered_in_error`.
 */
export function signedNoteDocuments(note: ClinicalNoteSource): ClinicalNoteDocumentRecord[] {
  if (!note.signedAt || !note.signedByPractitionerId || note.status === "draft") return [];
  const ordered = [...note.versions].sort((a, b) => a.versionNumber - b.versionNumber);
  const signed = ordered.filter((v) => !v.isAmendment).at(-1);
  if (!signed) return [];
  const chain = [signed, ...ordered.filter((v) => v.isAmendment)];
  return chain.map((v, i) => ({
    versionId: v.id,
    noteId: note.id,
    patientId: note.patientId,
    encounterId: note.encounterId,
    authorPractitionerId: note.authorPractitionerId,
    signerPractitionerId: note.signedByPractitionerId!,
    noteType: note.noteType,
    versionNumber: v.versionNumber,
    isAmendment: v.isAmendment,
    amendmentReason: v.isAmendment ? v.amendmentReason : null,
    subjective: v.subjective,
    objective: v.objective,
    assessment: v.assessment,
    plan: v.plan,
    signedAt: i === 0 ? note.signedAt! : v.createdAt,
    status:
      note.status === "entered_in_error"
        ? "entered_in_error"
        : i === chain.length - 1
          ? "current"
          : "superseded",
    replacesVersionId: i > 0 ? chain[i - 1]!.id : null,
  }));
}

const SECTIONS = ["Subjective", "Objective", "Assessment", "Plan"] as const;

/** The SOAP text inside the attachment: four headed sections separated by blank lines. */
export function noteText(
  n: Pick<ClinicalNoteDocumentRecord, "subjective" | "objective" | "assessment" | "plan">,
): string {
  return [n.subjective, n.objective, n.assessment, n.plan]
    .map((body, i) => `${SECTIONS[i]}:\n${body}`)
    .join("\n\n");
}

/** Inverse of noteText; null when the text does not have the four headed sections in order. */
export function parseNoteText(
  text: string,
): { subjective: string; objective: string; assessment: string; plan: string } | null {
  if (!text.startsWith("Subjective:\n")) return null;
  const parts: string[] = [];
  let rest = text.slice("Subjective:\n".length);
  for (const next of SECTIONS.slice(1)) {
    const at = rest.indexOf(`\n\n${next}:\n`);
    if (at < 0) return null;
    parts.push(rest.slice(0, at));
    rest = rest.slice(at + `\n\n${next}:\n`.length);
  }
  parts.push(rest);
  const [subjective, objective, assessment, plan] = parts as [string, string, string, string];
  return { subjective, objective, assessment, plan };
}

/** SHA-256 of the SOAP text, for the duplicate natural key. */
export function noteHash(
  n: Pick<ClinicalNoteDocumentRecord, "subjective" | "objective" | "assessment" | "plan">,
): string {
  return createHash("sha256").update(noteText(n)).digest("hex");
}

/**
 * DocumentReference (US Core mandatory: status, type, category, subject, content with
 * contentType; us-core-6: attachment url or data; a responsible organization through custodian
 * or Provenance). One per signed ClinicalNoteVersion. The first signed version has docStatus
 * final; an amendment has docStatus amended and relatesTo replaces the previous version, which is
 * superseded. Custodian is the clinic organization; author is the note's author and authenticator
 * the signer (the same practitioner: only the author signs). Content is the SOAP text as inline
 * base64 text/plain. AI involvement is not exported: only signed text leaves CarePath.
 */
export function documentReferenceToFhir(
  d: ClinicalNoteDocumentRecord,
  ctx: ToFhirContext,
): DocumentReference {
  const type = NOTE_TYPE_LOINC[d.noteType];
  return {
    resourceType: "DocumentReference",
    id: d.versionId,
    extension: [
      { url: EXTENSIONS.noteVersionNumber, valueInteger: d.versionNumber },
      ...(d.amendmentReason
        ? [{ url: EXTENSIONS.amendmentReason, valueString: d.amendmentReason }]
        : []),
    ],
    identifier: [
      { system: identifierSystem(ctx.orgSlug, "clinical-note-version"), value: d.versionId },
      { system: identifierSystem(ctx.orgSlug, "clinical-note"), value: d.noteId },
    ],
    status: d.status === "entered_in_error" ? "entered-in-error" : d.status,
    docStatus: d.isAmendment ? "amended" : "final",
    type: { coding: [{ system: SYSTEMS.loinc, ...type }], text: type.display },
    category: [
      {
        coding: [
          {
            system: SYSTEMS.usCoreDocumentReferenceCategory,
            code: "clinical-note",
            display: "Clinical Note",
          },
        ],
      },
    ],
    subject: ref("Patient", d.patientId),
    date: d.signedAt,
    author: [ref("Practitioner", d.authorPractitionerId)],
    authenticator: ref("Practitioner", d.signerPractitionerId),
    custodian: ref("Organization", ctx.organizationId),
    ...(d.replacesVersionId
      ? { relatesTo: [{ code: "replaces", target: ref("DocumentReference", d.replacesVersionId) }] }
      : {}),
    content: [
      {
        attachment: {
          contentType: "text/plain; charset=utf-8",
          language: "en",
          data: Buffer.from(noteText(d), "utf8").toString("base64"),
          title: `${type.display}, version ${d.versionNumber}`,
          creation: d.signedAt,
        },
      },
    ],
    ...(d.encounterId ? { context: { encounter: [ref("Encounter", d.encounterId)] } } : {}),
  };
}

export function documentReferenceFromFhir(
  r: DocumentReference,
  ctx: FromFhirContext,
): MapResult<ClinicalNoteDocumentRecord> {
  const issues: FhirIssue[] = [];
  const loinc = r.type?.coding?.find((c) => c.system === SYSTEMS.loinc)?.code;
  const noteType = (Object.keys(NOTE_TYPE_LOINC) as ClinicalNoteType[]).find(
    (k) => NOTE_TYPE_LOINC[k].code === loinc,
  );
  const subject = ctx.resolve(r.subject, "subject");
  const author = r.author?.[0] ? ctx.resolve(r.author[0], "author[0]") : null;
  const signer = r.authenticator ? ctx.resolve(r.authenticator, "authenticator") : null;
  const replaces = r.relatesTo?.find((x) => x.code === "replaces");
  const replacesRef = replaces ? ctx.resolve(replaces.target, "relatesTo.target") : null;
  const encounter = r.context?.encounter?.[0]
    ? ctx.resolve(r.context.encounter[0], "context.encounter[0]")
    : null;
  const attachment = r.content?.[0]?.attachment;
  const text =
    attachment?.data && /^text\/plain\b/.test(attachment.contentType ?? "")
      ? Buffer.from(attachment.data, "base64").toString("utf8")
      : null;
  const soap = text === null ? null : parseNoteText(text);
  const signedAt = instantUtc(r.date);
  const status =
    r.status === "entered-in-error"
      ? "entered_in_error"
      : r.status === "current" || r.status === "superseded"
        ? r.status
        : null;

  if (r.docStatus !== "final" && r.docStatus !== "amended")
    issues.push(
      mapIssue(
        "error",
        "not-supported",
        "map.documentreference.docStatus",
        "CarePath holds signed notes only (docStatus final or amended).",
        "docStatus",
      ),
    );
  if (!noteType)
    issues.push(
      mapIssue(
        "error",
        "not-supported",
        "map.documentreference.type",
        "Document type is not a CarePath note type (LOINC 11506-3 or 34117-2).",
        "type",
      ),
    );
  if (!status)
    issues.push(
      mapIssue(
        "error",
        "code-invalid",
        "map.documentreference.status",
        "DocumentReference status is not a document-reference-status code.",
        "status",
      ),
    );
  if (!subject || subject.type !== "Patient")
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.documentreference.subject",
        "Note subject must be a patient.",
        "subject",
      ),
    );
  if (author?.type !== "Practitioner" || signer?.type !== "Practitioner")
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.documentreference.signer",
        "A signed note names its practitioner author and authenticator.",
        "authenticator",
      ),
    );
  if (!soap)
    issues.push(
      mapIssue(
        "error",
        "not-supported",
        "map.documentreference.content",
        "Content is not CarePath SOAP text (text/plain with Subjective, Objective, Assessment and Plan).",
        "content[0].attachment",
      ),
    );
  if (!signedAt)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.documentreference.date",
        "A signed note needs its signature time in date.",
        "date",
      ),
    );
  if (issues.length) return { record: null, issues };

  const versionId =
    r.identifier?.find((i) => parseIdentifierSystem(i.system)?.kind === "clinical-note-version")
      ?.value ??
    r.id ??
    "";
  const noteId =
    r.identifier?.find((i) => parseIdentifierSystem(i.system)?.kind === "clinical-note")?.value ??
    versionId;
  const reason = r.extension?.find((e) => e.url === EXTENSIONS.amendmentReason)?.valueString;
  const versionNumber = r.extension?.find(
    (e) => e.url === EXTENSIONS.noteVersionNumber,
  )?.valueInteger;
  return {
    record: {
      versionId: r.id ?? versionId,
      noteId,
      patientId: subject!.id,
      encounterId: encounter?.type === "Encounter" ? encounter.id : null,
      authorPractitionerId: author!.id,
      signerPractitionerId: signer!.id,
      noteType: noteType!,
      versionNumber: versionNumber ?? 1,
      isAmendment: r.docStatus === "amended",
      amendmentReason: reason ?? null,
      ...soap!,
      signedAt: signedAt!,
      status: status!,
      replacesVersionId: replacesRef?.type === "DocumentReference" ? replacesRef.id : null,
    },
    issues: [],
  };
}
