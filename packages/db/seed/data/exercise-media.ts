import type { BodyArea } from "./exercises.js";

/**
 * Illustrations for the exercise library (checkpoint C2, ruling 3.4; WP 3.5 assets that passed review, plus six added in D-WP-7).
 * Static files in `apps/web/public/assets/illustrations`, served by the web app. An exercise with its own
 * picture uses it; every other exercise uses the picture for its body area, so none is left without one.
 * `mediaPath` and `mediaAlt` are set together (check `Exercise_media_alt_with_path`). The descriptions say
 * what is drawn and never how to move. Keep them in step with `apps/web/lib/illustrations.ts`.
 */
const DIR = "/assets/illustrations";

const own: Record<string, { file: string; alt: string }> = {
  "knee-to-chest": {
    file: "ex-knee-to-chest",
    alt: "A person lying on a mat with one knee held toward the chest",
  },
  "pelvic-tilt": {
    file: "ex-pelvic-tilt",
    alt: "A person lying on a mat with both knees bent and feet flat",
  },
  "standing-trunk-rotation": {
    file: "ex-standing-trunk-rotation",
    alt: "A person standing with arms folded across the chest, upper body turned a little to one side",
  },
  "deep-breathing": {
    file: "ex-deep-breathing",
    alt: "A person sitting upright on a chair with hands resting on the thighs",
  },
  "mini-squat": {
    file: "ex-mini-squat",
    alt: "A person standing behind a chair with both hands on its back, knees slightly bent",
  },
  "marching-in-place": {
    file: "ex-marching-in-place",
    alt: "A person standing beside a chair with one knee lifted",
  },
  "quad-set": {
    file: "ex-quad-set",
    alt: "A person sitting on a mat with both legs out in front, leaning back on the hands, a small rolled towel under the knees",
  },
  "heel-slide": {
    file: "ex-heel-slide",
    alt: "A person lying on their back on a mat with one knee bent and the other leg straight",
  },
  "straight-leg-raise": {
    file: "ex-straight-leg-raise",
    alt: "A person lying on their back on a mat with one knee bent and the other leg straight and a little off the mat",
  },
  "upper-trap-stretch": {
    file: "ex-upper-trap-stretch",
    alt: "A person sitting on a stool with one hand on the seat, head tilted a little to one side",
  },
  "towel-reach-behind": {
    file: "ex-towel-reach-behind",
    alt: "A person standing, seen from the side, holding a small towel behind the back",
  },
  "walking-program": {
    file: "ex-walking-program",
    alt: "A person walking, seen from the side",
  },
};

const area: Record<BodyArea, { file: string; alt: string }> = {
  "lower back": {
    file: "area-lower-back",
    alt: "A person seen from behind, from the lower ribs to the upper thighs, arms hanging at the sides",
  },
  neck: { file: "area-neck", alt: "The head, neck and shoulders of a person, seen from the side" },
  shoulder: {
    file: "area-shoulder",
    alt: "A person's shoulder and upper arm, seen from the front",
  },
  knee: {
    file: "area-knee",
    alt: "A person sitting on a chair, from mid-thigh to the shoe, seen from the side",
  },
  hip: {
    file: "area-hip",
    alt: "A person standing, seen from the side, from the waist to above the knee",
  },
  "ankle and foot": {
    file: "area-ankle-and-foot",
    alt: "Two lower legs and shoes, seen from the side",
  },
  core: {
    file: "area-core",
    alt: "A person's torso from the chest to the hips, seen from the front",
  },
  "upper back": {
    file: "area-upper-back",
    alt: "A person seen from behind, from the back of the head to the waist",
  },
  balance: {
    file: "area-balance",
    alt: "A person standing with one hand on a walking cane, shown from the waist down",
  },
  general: {
    file: "area-general",
    alt: "A person standing, seen from the front, from the head to the knees",
  },
};

export function exerciseMedia(
  slug: string,
  bodyArea: BodyArea,
): { mediaPath: string; mediaAlt: string } {
  const pick = own[slug] ?? area[bodyArea];
  return { mediaPath: `${DIR}/${pick.file}.webp`, mediaAlt: pick.alt };
}
