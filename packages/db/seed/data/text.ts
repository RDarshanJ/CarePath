/** Fixed word lists and text templates for the seed. Everything here is fictional. */
import type { BodyArea } from "./exercises.js";

export const givenNames = [
  "Alder",
  "Briar",
  "Calla",
  "Dorian",
  "Elowen",
  "Fenwick",
  "Garnet",
  "Hollis",
  "Iris",
  "Jasper",
  "Kestrel",
  "Linden",
  "Marlow",
  "Nova",
  "Oriel",
  "Perrin",
  "Quinn",
  "Rowan",
  "Sable",
  "Tamsin",
  "Ulric",
  "Vesper",
  "Wren",
  "Xander",
  "Yarrow",
  "Zephyr",
  "Ansel",
  "Bryn",
  "Cleo",
  "Dawn",
  "Emery",
  "Finch",
  "Gwen",
  "Hale",
  "Ivy",
  "Joss",
  "Kit",
  "Lark",
  "Maple",
  "Noor",
] as const;

/** Invented surnames, so no seeded person can be mistaken for a real one. */
export const familyNames = [
  "Brindlemoor",
  "Quillwick",
  "Thistlegate",
  "Ashcombe-Test",
  "Fernwhistle",
  "Hollowell-Demo",
  "Marrowby",
  "Pennywhistle",
  "Ravenscroft-Test",
  "Stillwater-Demo",
  "Tumbleweed",
  "Underhill-Test",
  "Valebrook",
  "Wimbleton-Demo",
  "Yellowfin",
  "Zinnowitz",
  "Applegarth-Test",
  "Bramblecote",
  "Cinderfield",
  "Dunmorrow-Demo",
  "Eldermere",
  "Fallowmere-Test",
  "Glimmerton",
  "Harrowgate-Demo",
  "Ironwillow",
  "Juniperly-Test",
  "Kettleby",
  "Larkspur-Demo",
  "Mossgrove",
  "Nettlebed-Test",
  "Oakenshaw",
  "Primrose-Demo",
  "Quarrington",
  "Rookwood-Test",
  "Sparrowhawk",
  "Tansley-Demo",
] as const;

export const clinicNames = [
  "Fictional Desert Rehab",
  "Fictional Harbor Physical Therapy",
  "Fictional Prairie Movement Clinic",
  "Fictional Island Recovery Center",
  "Fictional Ridge Physical Therapy",
] as const;

/** Time zones without daylight saving, so local-hour arithmetic is a fixed offset. */
export const clinicZones = [
  ["America/Phoenix", -7],
  ["Pacific/Honolulu", -10],
  ["America/Regina", -6],
  ["America/Puerto_Rico", -4],
  ["America/Phoenix", -7],
] as const;

export interface Regimen {
  area: BodyArea;
  conditionCode: string;
  conditionDisplay: string;
  bodySite: string;
  planTitle: string;
  reason: string;
  goals: readonly { description: string; unit: string; target: number }[];
  /** Exercise body areas used to build the plan. */
  pool: readonly BodyArea[];
}

export const regimens: readonly Regimen[] = [
  {
    area: "lower back",
    conditionCode: "SYN-LB-01",
    conditionDisplay: "Low back pain (synthetic example)",
    bodySite: "lower back",
    planTitle: "Lower back movement plan",
    reason: "Aching lower back after long hours sitting",
    goals: [
      {
        description: "Sit through a one-hour meeting without needing to stand",
        unit: "minutes",
        target: 60,
      },
      { description: "Walk the dog for 30 minutes", unit: "minutes", target: 30 },
    ],
    pool: ["lower back", "core", "general"],
  },
  {
    area: "neck",
    conditionCode: "SYN-NK-01",
    conditionDisplay: "Neck stiffness (synthetic example)",
    bodySite: "neck",
    planTitle: "Neck and upper back plan",
    reason: "Stiff neck from desk work",
    goals: [
      {
        description: "Check over my shoulder while driving with ease",
        unit: "degrees",
        target: 70,
      },
    ],
    pool: ["neck", "upper back", "general"],
  },
  {
    area: "shoulder",
    conditionCode: "SYN-SH-01",
    conditionDisplay: "Shoulder movement limitation (synthetic example)",
    bodySite: "shoulder",
    planTitle: "Shoulder mobility plan",
    reason: "Trouble reaching overhead",
    goals: [{ description: "Reach a high kitchen shelf", unit: "degrees", target: 150 }],
    pool: ["shoulder", "upper back", "general"],
  },
  {
    area: "knee",
    conditionCode: "SYN-KN-01",
    conditionDisplay: "Knee discomfort on stairs (synthetic example)",
    bodySite: "knee",
    planTitle: "Knee strength plan",
    reason: "Knee discomfort climbing stairs",
    goals: [
      {
        description: "Climb one flight of stairs without holding the rail",
        unit: "flights",
        target: 1,
      },
      {
        description: "Bend the knee to sit comfortably in a low chair",
        unit: "degrees",
        target: 110,
      },
    ],
    pool: ["knee", "hip", "general"],
  },
  {
    area: "hip",
    conditionCode: "SYN-HP-01",
    conditionDisplay: "Hip tightness (synthetic example)",
    bodySite: "hip",
    planTitle: "Hip strength and mobility plan",
    reason: "Tight hip after returning to running",
    goals: [{ description: "Run 20 minutes at an easy pace", unit: "minutes", target: 20 }],
    pool: ["hip", "core", "general"],
  },
  {
    area: "ankle and foot",
    conditionCode: "SYN-AF-01",
    conditionDisplay: "Ankle stiffness after a sprain (synthetic example)",
    bodySite: "ankle",
    planTitle: "Ankle recovery plan",
    reason: "Ankle feels unsteady after a sprain",
    goals: [{ description: "Stand on one leg while brushing teeth", unit: "seconds", target: 30 }],
    pool: ["ankle and foot", "balance", "general"],
  },
  {
    area: "core",
    conditionCode: "SYN-CR-01",
    conditionDisplay: "Trunk weakness (synthetic example)",
    bodySite: "trunk",
    planTitle: "Core control plan",
    reason: "Wants steadier trunk for lifting at work",
    goals: [{ description: "Hold a forearm plank for one minute", unit: "seconds", target: 60 }],
    pool: ["core", "lower back", "balance"],
  },
  {
    area: "balance",
    conditionCode: "SYN-BL-01",
    conditionDisplay: "Unsteadiness when walking (synthetic example)",
    bodySite: "lower limb",
    planTitle: "Steady walking plan",
    reason: "Feels unsteady on uneven ground",
    goals: [{ description: "Walk around the block without a cane", unit: "minutes", target: 15 }],
    pool: ["balance", "ankle and foot", "general"],
  },
];

export const planInstructions = [
  "Do your exercises at a comfortable pace and rest between sets. A mild stretching feeling is expected. Stop and message your therapist if you notice sharp pain.",
  "Aim for the days shown, but a missed day is fine; pick up where you left off. Log how it felt after each session so your therapist can adjust the plan.",
  "Warm up with a short walk first. Move slowly and keep breathing. If a movement feels worse than it did last time, skip it and tell your therapist.",
] as const;

export const changeReasons = [
  "You told us the last set felt easier.",
  "Your check-ins show you are doing well with the current plan.",
  "This keeps the plan varied and matched to what you reported.",
  "You mentioned some exercises felt repetitive.",
  "This follows what we talked about at your last visit.",
] as const;

export const checkInNotes = [
  "Felt stiff at the start, better after the warm-up.",
  "Skipped the last exercise, ran out of time.",
  "Slept badly last night so everything felt harder.",
  "Good session. Went a bit slower on the hold.",
  "A little achy afterwards but settled within an hour.",
  "Did this on the porch this morning.",
  "Needed a break halfway through.",
  "Felt steadier than last week.",
] as const;

export const skipReasons = [
  "Short on time today.",
  "Too tired today.",
  "Did not have the space for it.",
  "Not sure how to do this one.",
  "Felt uncomfortable to start.",
] as const;

export const discomfortNotes = [
  "Pulling feeling on the second set.",
  "Felt tight at the end of the movement.",
  "Uncomfortable when I held the position.",
  "A bit sore on the left side.",
] as const;

export const conversationSubjects = [
  "Question about my exercises",
  "Rescheduling my visit",
  "Update on how I'm feeling",
  "Do I need the band for this one?",
  "Plan change question",
] as const;

export const patientMessages = [
  "Hi, I had a question about the second exercise. Should I go slower on the way down?",
  "Thanks, that helps. I will try it tomorrow morning.",
  "I am not able to make my appointment next week. Is there another time?",
  "The exercises felt fine today, a little tight at the end.",
  "Can I do the walking on a treadmill instead of outside?",
  "Is it normal for it to feel sore the day after?",
  "I updated my check-in. Let me know if you want me to change anything.",
] as const;

export const clinicianMessages = [
  "Hello, thanks for asking. Slow and steady is fine. Keep the movement comfortable and let me know how it feels.",
  "Good to hear. Please keep logging your check-ins and we will go over them at your next visit.",
  "Yes, a treadmill works as long as the pace stays easy. Tell me if anything changes.",
  "I have a few openings next week. Please pick one from the Appointments tab.",
  "Thanks for the update. I have adjusted your plan, and there is a note on your Today screen explaining the change.",
  "Mild soreness the next day can be common after new exercises. If it lasts longer or worsens, please message the clinic or call.",
] as const;

export const failedMessageReason =
  "Delivery failed: the demo message service did not respond (simulated).";

export const aiProviderLabel = "Demo provider, rule-based";
