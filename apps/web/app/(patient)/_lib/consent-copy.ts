import type { ConsentType } from "@carepath/shared/contracts";

/** The two consents a patient can give. Camera movement tracking is not offered and is not shown (C3 item 5, R7). */
export type OfferedConsent = Exclude<ConsentType, "motion_tracking">;

/**
 * Plain-language consent wording, shared by onboarding and Sharing and consent (REQ-ONB-05). Required and
 * optional are always said in words. Nothing here claims legal or regulatory status, and nothing
 * names a medical condition (AC-A9). The summary and the short list are always on screen (CD-143); the
 * full wording is one disclosure away. The wording is a demonstration draft that nobody has reviewed
 * (DR-002 S6a), and each full text says so.
 */
export const consentCopy: Record<
  OfferedConsent,
  {
    title: string;
    requirement: "Required" | "Optional";
    summary: string;
    details: string[];
    fullWording: string[];
  }
> = {
  treatment_and_data_use: {
    title: "Treatment and data use",
    requirement: "Required",
    summary:
      "Your clinic keeps the answers, plan, sessions and check-ins you enter here, so your care team can look after you.",
    details: [
      "Your care team at the clinic can read your answers, your care plan, your sessions and your check-ins.",
      "People who work for the clinic only see what their job needs, and each time a record is opened it is logged.",
      "CarePath cannot work without this. To withdraw it, contact the clinic, because your care team needs to know.",
    ],
    fullWording: [
      "By agreeing, you let your clinic keep and use what you enter in CarePath: your intake answers, your care plan and its versions, your sessions, your check-ins and your pain ratings.",
      "Your care team uses this information to build your plan, to review how you are doing and to contact you about your care.",
      "Clinic staff can open a record only if their role needs it. Each time a record is opened, the opening is logged with the person and the time.",
      "You cannot withdraw this agreement inside CarePath. Contact your clinic and tell your care team, so they know before they stop using your information.",
      "This is demonstration wording. It has not been reviewed by a lawyer or by a clinic.",
    ],
  },
  ai_assisted_features: {
    title: "Automated drafting tools",
    requirement: "Optional",
    summary:
      "Lets your care team use automated tools that read your records to draft summaries for them.",
    details: [
      "A therapist reads and approves every draft before anyone else sees it. Drafts are labelled as drafts.",
      "This is off unless you turn it on. If it is off, no drafts are made from your records.",
      "You can change this at any time in Sharing and consent. Turning it off is logged.",
    ],
    fullWording: [
      "If you allow this, your care team can use automated tools that read your records in CarePath and write draft summaries and draft notes for the therapist.",
      "A draft is a starting point. A therapist reads it, can change it and decides whether to use it. Nothing is added to your record as final until a therapist approves it.",
      "If you do not allow this, or later stop allowing it, no new drafts are made from your records. Drafts that were already approved stay in your record.",
      "You can allow or stop allowing this at any time in Sharing and consent. Each change is logged with the date and the wording version.",
      "This is demonstration wording. It has not been reviewed by a lawyer or by a clinic.",
    ],
  },
};

export const offeredConsents = Object.keys(consentCopy) as OfferedConsent[];

export const isOfferedConsent = (type: ConsentType): type is OfferedConsent => type in consentCopy;
