export type CampaignTemplate = {
  key: string;
  title: string;
  win_condition: string;
  tags: string[];
  milestones: { id: string; title: string; complete: boolean }[];
  framework_slugs: string[];
  blurb: string;
};

const ms = (titles: string[]) =>
  titles.map((t) => ({ id: crypto.randomUUID(), title: t, complete: false }));

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    key: "tech",
    title: "Use of Technology",
    blurb: "Turn passive consumption into intentional production.",
    win_condition:
      "Every screen-hour is either coupled to a production loop or capped by a daily budget for 30 consecutive days.",
    tags: ["tech", "consumption", "attention"],
    milestones: ms([
      "Audit current screen-time per app for one week",
      "Define 'consume only after produce' coupling rule",
      "Remove or hide 3 highest-friction time sinks",
      "Hold cap for 14 days",
      "Review and adjust thresholds",
    ]),
    framework_slugs: ["first-principles", "inversion"],
  },
  {
    key: "career",
    title: "Career Development",
    blurb: "Build the next clear rung on your professional ladder.",
    win_condition:
      "Land the next-level role, project, or client by [date] — measured by signed offer, accepted proposal, or shipped lead artifact.",
    tags: ["career", "skill", "income"],
    milestones: ms([
      "Name the next-level role and what disqualifies you today",
      "Identify the single most leveraged missing skill",
      "Ship one public artifact demonstrating that skill",
      "Have 5 conversations with people one rung ahead",
      "Submit / pitch / apply",
    ]),
    framework_slugs: ["first-principles", "eisenhower-matrix"],
  },
  {
    key: "health",
    title: "Health Baseline",
    blurb: "Sleep, movement, nutrition — re-establish the floor.",
    win_condition:
      "Hold a stable baseline (≥7h sleep, ≥4 movement sessions/wk, no skipped meals) for 8 consecutive weeks.",
    tags: ["health", "habit"],
    milestones: ms([
      "Track 7 days of sleep, movement, meals",
      "Set non-negotiable bedtime and wake window",
      "Schedule 4 movement slots into the week",
      "Pre-decide weekday meals",
      "Review at week 4 and adjust",
    ]),
    framework_slugs: ["eisenhower-matrix"],
  },
  {
    key: "knowledge-prod",
    title: "Knowledge Production",
    blurb: "From reader to writer — ship at a steady cadence.",
    win_condition:
      "Publish 12 substantive pieces (essay, talk, video) in 12 weeks, each tied to a framework or open question.",
    tags: ["writing", "knowledge", "production"],
    milestones: ms([
      "Pick the publication channel and minimum format",
      "Build a 20-item idea backlog",
      "Ship piece #1",
      "Hit weekly cadence for 4 weeks",
      "Mid-quarter review of resonance",
    ]),
    framework_slugs: ["paul-elder-critical-thinking", "first-principles"],
  },
  {
    key: "relations",
    title: "Relational Capital",
    blurb: "Deepen five key ties — quality over reach.",
    win_condition:
      "Five named people each receive sustained attention (≥1 meaningful contact / 2 weeks) for one quarter, with no important 'want-to-say' left unsaid.",
    tags: ["relations", "social"],
    milestones: ms([
      "Name the 5 people and why each matters now",
      "Set the cadence for each",
      "Complete first round of contact",
      "Mid-quarter check: anything unsaid?",
      "End-of-quarter reflection per person",
    ]),
    framework_slugs: ["map-not-territory"],
  },
];
