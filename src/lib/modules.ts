// Canonical list of app modules used across PRD + Feedback.
export type ModuleDef = { key: string; label: string; route: string };

export const MODULES: ModuleDef[] = [
  { key: "daily", label: "Daily session", route: "/" },
  { key: "diary", label: "Emotion diary", route: "/diary" },
  { key: "motivation", label: "Motivation engine", route: "/motivation" },
  { key: "campaigns", label: "Campaigns", route: "/campaigns" },
  { key: "quests", label: "Daily quests", route: "/quests" },
  { key: "stats", label: "Stats", route: "/stats" },
  { key: "progress", label: "Progress", route: "/progress" },
  { key: "knowledge", label: "Knowledge vault", route: "/knowledge" },
  { key: "ecosystem", label: "Ecosystem", route: "/ecosystem" },
  { key: "relations", label: "Relations", route: "/relations" },
  { key: "worldmap", label: "World map", route: "/worldmap" },
  { key: "map", label: "Personal map", route: "/map" },
  { key: "philosophy", label: "Philosophy", route: "/philosophy" },
  { key: "manifesto", label: "Manifesto", route: "/manifesto" },
  { key: "perma", label: "PERMA+4", route: "/perma" },
  { key: "desire", label: "Desire engine", route: "/desire" },
];

export function moduleFromRoute(path: string): ModuleDef | undefined {
  const exact = MODULES.find((m) => m.route === path);
  if (exact) return exact;
  // longest-prefix match for nested paths
  return MODULES.filter((m) => m.route !== "/" && path.startsWith(m.route))
    .sort((a, b) => b.route.length - a.route.length)[0];
}

export const PRD_TEMPLATE_HINTS = {
  problem: "What pain or gap does this module close? Describe the user's state before and after.",
  users: "Who uses this and in what mode (anchoring, executing, reflecting)? When do they show up?",
  principles: "What rules govern the design? What will this module refuse to do?",
  features: "Concrete capabilities this module ships. Each one should be verifiable as working or broken.",
  success_metrics: "How do you know it's working? Behavioral indicators, not vanity stats.",
  non_goals: "What this module is explicitly NOT trying to do. The boundary that prevents scope creep.",
};
