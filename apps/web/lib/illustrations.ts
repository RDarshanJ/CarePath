/**
 * Generated illustrations (checkpoint C2, ruling 3.4, WP 3.5). Static files under
 * `public/assets/illustrations`, served by Next; no API route serves media. Every exercise shows its own
 * picture or the picture for its body area, never an empty box. Each file has a 960 wide version and a
 * 480 wide one (`name-480.webp`). The images are generated and have not been medically reviewed.
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
 * The picture for an exercise: its own (`mediaPath` and `mediaAlt` from the API, set together) or the one
 * for its body area. Null only when neither exists.
 */
export function exerciseIllustration(exercise: {
  mediaPath: string | null;
  mediaAlt: string | null;
  bodyArea: string;
}): Illustration | null {
  if (exercise.mediaPath && exercise.mediaAlt) {
    return { path: exercise.mediaPath, alt: exercise.mediaAlt };
  }
  return areaIllustration(exercise.bodyArea);
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
