import type { ConsentType } from "@carepath/shared/contracts";

/**
 * Plain-language consent wording, shared by onboarding and Sharing and consent (REQ-ONB-05). Required and
 * optional are always said in words. Nothing here claims legal or regulatory status, and nothing
 * names a medical condition (AC-A9).
 */
export const consentCopy: Record<
  ConsentType,
  { title: string; requirement: "Required" | "Optional"; summary: string; details: string[] }
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
  },
  motion_tracking: {
    title: "Camera movement tracking",
    requirement: "Optional",
    summary: "Not available yet. CarePath never needs your camera to do your exercises.",
    details: ["If this is added later, it will be off until you turn it on."],
  },
};
