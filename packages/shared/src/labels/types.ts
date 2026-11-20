/**
 * Shared shapes for the status vocabularies (CD-239). Every vocabulary is an exhaustive
 * `Record<Enum, ...>`: a new enum value is a compile error until it has a label, and the tests in
 * this folder compare each map with the Prisma schema and the contract enums.
 *
 * Tones are semantic roles, never colours. Form says how the screen shows the status (CD-230):
 * `tag` for administrative states, `chip` for states that need attention or are live, `text` for
 * an expected state shown as plain words.
 */
export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";
export type StatusForm = "tag" | "chip" | "text";

/** The one allowed difference between apps is the perspective pronoun (CD-233). */
export type Audience = "staff" | "patient";

export interface StatusLabel {
  label: string;
  tone: StatusTone;
  form: StatusForm;
}
