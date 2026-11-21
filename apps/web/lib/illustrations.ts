/**
 * Generated illustrations (checkpoint C2, ruling 3.4, WP 3.5). Static files under
 * `public/assets/illustrations`, served by Next; no API route serves media. Each file has a 960 wide
 * version and a 480 wide one (`name-480.webp`). The images are generated and have not been medically
 * reviewed.
 *
 * Manifest: `ex-*` (12) are exercise pictures, `moment-*` (3) are quiet pictures for empty or finished
 * states, `area-*` (10) are body-area pictures. The `area-*` files are tight crops (a headless torso at
 * player size), so they appear only as tiles of 64 px or less (library, plan rows): at the `hero` and
 * `overview` sizes an exercise without a picture of its own gets no picture and a text-first layout,
 * never an empty box (DR-004 U9). No further pictures are generated for this.
 */
export const ILLUSTRATION_CAPTION =
  "Illustration only. Follow the written steps from your care team.";

export const ILLUSTRATION_DIR = "/assets/illustrations";
export const ILLUSTRATION_WIDTH = 960;
export const ILLUSTRATION_HEIGHT = 720;

export interface Illustration {
  /** Public path of the 960 wide file. */
  path: string;
  /** A plain description of what the picture shows; never an instruction. */
  alt: string;
}

/** One entry per value of `bodyAreas` in the intake contract. Descriptions say what is drawn, nothing more. */
const areaAlt: Record<string, string> = {
  "lower back":
    "A person seen from behind, from the lower ribs to the upper thighs, arms hanging at the sides",
  neck: "The head, neck and shoulders of a person, seen from the side",
  shoulder: "A person's shoulder and upper arm, seen from the front",
  knee: "A person sitting on a chair, from mid-thigh to the shoe, seen from the side",
  hip: "A person standing, seen from the side, from the waist to above the knee",
  "ankle and foot": "Two lower legs and shoes, seen from the side",
  core: "A person's torso from the chest to the hips, seen from the front",
  "upper back": "A person seen from behind, from the back of the head to the waist",
  balance: "A person standing with one hand on a walking cane, shown from the waist down",
  general: "A person standing, seen from the front, from the head to the knees",
};

const slugOf = (bodyArea: string) => bodyArea.trim().toLowerCase().replace(/\W+/g, "-");

/** The picture for a body area, or null for a value the set does not cover. */
export function areaIllustration(bodyArea: string): Illustration | null {
  const alt = areaAlt[bodyArea.trim().toLowerCase()];
  if (!alt) return null;
  return { path: `${ILLUSTRATION_DIR}/area-${slugOf(bodyArea)}.webp`, alt };
}

/**
 * Where a picture is drawn: `hero` (the session player), `overview` (plan lists, the session intro, the
 * clinician plan view, up to 320 px), `tile` (64 px or less: library and plan rows).
 */
export type IllustrationSize = "hero" | "overview" | "tile";

/**
 * The picture for an exercise: its own (`mediaPath` and `mediaAlt` from the API, set together). Only a
 * `tile` falls back to the picture for the body area; at `hero` and `overview` an exercise without its
 * own picture returns null and the screen lays the exercise out text first (DR-004 U9).
 */
export function exerciseIllustration(
  exercise: {
    mediaPath: string | null;
    mediaAlt: string | null;
    bodyArea: string;
  },
  size: IllustrationSize,
): Illustration | null {
  if (exercise.mediaPath && exercise.mediaAlt) {
    return { path: exercise.mediaPath, alt: exercise.mediaAlt };
  }
  return size === "tile" ? areaIllustration(exercise.bodyArea) : null;
}

/** The 480 wide file next to a 960 wide path. */
export function smallVariant(path: string): string {
  return path.replace(/\.webp$/, "-480.webp");
}

export const moments = {
  doneForToday: `${ILLUSTRATION_DIR}/moment-done-for-today.webp`,
  detailsWithClinic: `${ILLUSTRATION_DIR}/moment-details-with-clinic.webp`,
  nothingToReview: `${ILLUSTRATION_DIR}/moment-nothing-to-review.webp`,
} as const;
