import type { KnownIdentifiers } from "./inputs.js";

/**
 * Redaction before any external provider call (ADR-6, PRD section 11). Names, birth dates, contact
 * fields, street addresses, record identifiers and calendar dates are replaced with stable tokens
 * such as `[[NAME_1]]`; the same original always gets the same token within one redactor, so a
 * model can still refer to it, and `restore` puts the originals back into the model's output.
 *
 * Two layers: identifiers the caller knows (from the patient record, care team and message
 * participants) and patterns for anything not known in advance (an email typed into a message).
 * Dates are redacted in full (HHS Safe Harbor keeps only the year; CarePath keeps nothing).
 * This is a demonstration control, not a de-identification certification.
 */

export type TokenKind =
  "NAME" | "DOB" | "EMAIL" | "PHONE" | "ADDRESS" | "SSN" | "MRN" | "ID" | "DATE" | "IDENT";

declare const redactedBrand: unique symbol;
/** A string that has been through a redactor. External providers accept only this type. */
export type RedactedText = string & { readonly [redactedBrand]: true };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const MONTHS =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

/** Order matters: more specific patterns first. */
const PATTERNS: { kind: TokenKind; re: RegExp }[] = [
  { kind: "EMAIL", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { kind: "ID", re: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi },
  { kind: "SSN", re: /\b\d{3}-\d{2}-\d{4}\b/g },
  {
    kind: "MRN",
    re: /\b(?:MRN|medical record(?: number)?|member id|account(?: number)?)\s*[:#]?\s*[A-Z0-9-]{4,}\b/gi,
  },
  {
    kind: "DATE",
    re: new RegExp(
      [
        "\\b\\d{4}-\\d{2}-\\d{2}(?:[T ]\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d+)?)?(?:Z|[+-]\\d{2}:?\\d{2})?)?",
        "\\b\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4}\\b",
        `\\b${MONTHS}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}\\b`,
        `\\b\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTHS}\\.?,?\\s+\\d{4}\\b`,
      ].join("|"),
      "gi",
    ),
  },
  {
    kind: "PHONE",
    re: /(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\b\d{3}[\s.-])\d{3}[\s.-]\d{4}\b|\b\d{3}[.-]\d{4}\b/g,
  },
  {
    kind: "ADDRESS",
    re: /\b\d{1,6}\s+(?:[A-Z][a-z]+\s){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Way|Place|Pl|Terrace|Circle)\b\.?/g,
  },
  /** A capitalised word after an honorific is a name even when nobody told us. */
  { kind: "NAME", re: /\b(?:Mr|Mrs|Ms|Mx|Dr|Miss)\.?\s+[A-Z][a-zA-Z'-]+/g },
];

export interface Redactor {
  redact(text: string): RedactedText;
  /** Replaces every token in a string, or every string inside a JSON-like value, with its original. */
  restore<T>(value: T): T;
  /** Number of distinct originals replaced so far. */
  readonly tokenCount: number;
  /** Count of distinct originals per kind, for the generation record. No originals. */
  counts(): Partial<Record<TokenKind, number>>;
}

export function createRedactor(identifiers: Partial<KnownIdentifiers> = {}): Redactor {
  const toToken = new Map<string, string>();
  const toOriginal = new Map<string, string>();
  const perKind = new Map<TokenKind, number>();

  const tokenFor = (kind: TokenKind, original: string) => {
    const key = `${kind}\u0000${original.toLowerCase()}`;
    let token = toToken.get(key);
    if (!token) {
      const n = (perKind.get(kind) ?? 0) + 1;
      perKind.set(kind, n);
      token = `[[${kind}_${n}]]`;
      toToken.set(key, token);
      toOriginal.set(token, original);
    }
    return token;
  };

  // Known identifiers, longest first so "Marta Quill" wins over "Marta".
  const known: { kind: TokenKind; value: string }[] = [];
  const add = (kind: TokenKind, values: string[] | undefined) => {
    for (const v of values ?? []) {
      const value = v.trim();
      if (value.length >= 2) known.push({ kind, value });
    }
  };
  add("NAME", identifiers.names);
  // Each part of a multi-word name on its own ("Hi Marta").
  add(
    "NAME",
    (identifiers.names ?? [])
      .flatMap((n) => n.split(/\s+/))
      .filter((p) => p.length >= 3 && /^[A-Za-z'-]+$/.test(p)),
  );
  add("DOB", identifiers.birthDates);
  add("EMAIL", identifiers.emails);
  add("PHONE", identifiers.phones);
  add("ADDRESS", identifiers.addresses);
  add("IDENT", identifiers.otherIdentifiers);
  known.sort((a, b) => b.value.length - a.value.length);
  const knownRes = known.map(({ kind, value }) => ({
    kind,
    re: new RegExp(`(?<![A-Za-z0-9])${escapeRe(value)}(?![A-Za-z0-9])`, "gi"),
  }));

  const protectTokens = (text: string, fn: (segment: string) => string) =>
    text
      .split(/(\[\[[A-Z]+_\d+\]\])/)
      .map((seg, i) => (i % 2 === 1 ? seg : fn(seg)))
      .join("");

  return {
    redact(text) {
      let out = text;
      for (const { kind, re } of [...knownRes, ...PATTERNS]) {
        out = protectTokens(out, (seg) => seg.replace(re, (m) => tokenFor(kind, m)));
      }
      return out as RedactedText;
    },
    restore<T>(value: T): T {
      const fix = (s: string) => s.replace(/\[\[[A-Z]+_\d+\]\]/g, (t) => toOriginal.get(t) ?? t);
      const walk = (v: unknown): unknown => {
        if (typeof v === "string") return fix(v);
        if (Array.isArray(v)) return v.map(walk);
        if (v && typeof v === "object") {
          return Object.fromEntries(
            Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, walk(x)]),
          );
        }
        return v;
      };
      return walk(value) as T;
    },
    get tokenCount() {
      return toOriginal.size;
    },
    counts() {
      return Object.fromEntries(perKind) as Partial<Record<TokenKind, number>>;
    },
  };
}

const TOKEN_RE = /\[\[[A-Z]+_\d+\]\]/g;

/**
 * Every redaction-shaped token (`[[NAME_9]]`) in a string or in any string inside a JSON-like
 * value, in order of appearance. Run on a model's output after `restore`: a token still there
 * matches nothing the redactor issued (the model invented or altered it), and the pipeline treats
 * the output as invalid rather than store it (checkpoint C3, A3).
 */
export function findRedactionTokens(value: unknown): string[] {
  const found: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === "string") found.push(...(v.match(TOKEN_RE) ?? []));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach(walk);
  };
  walk(value);
  return found;
}

/**
 * Canary check run on the final outbound payload: returns every known identifier still present.
 * The pipeline refuses to send when this is not empty.
 */
export function findIdentifierLeaks(
  payload: string,
  identifiers: Partial<KnownIdentifiers>,
): string[] {
  const lower = payload.toLowerCase();
  const all = [
    ...(identifiers.names ?? []),
    ...(identifiers.birthDates ?? []),
    ...(identifiers.emails ?? []),
    ...(identifiers.phones ?? []),
    ...(identifiers.addresses ?? []),
    ...(identifiers.otherIdentifiers ?? []),
  ];
  return all.filter((v) => v.trim().length >= 2 && lower.includes(v.trim().toLowerCase()));
}
