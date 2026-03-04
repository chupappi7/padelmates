export interface CreditType {
  key: string;
  label: string;
  category: "physical" | "mental";
}

export const CREDIT_TYPES: CreditType[] = [
  // Physical (14)
  { key: "bandeja", label: "Bandeja", category: "physical" },
  { key: "vibora", label: "Vibora", category: "physical" },
  { key: "bajada", label: "Bajada", category: "physical" },
  { key: "smash", label: "Smash", category: "physical" },
  { key: "chancletazo", label: "Chancletazo", category: "physical" },
  { key: "out_of_court", label: "Out of Court", category: "physical" },
  { key: "back_glass", label: "Back Glass", category: "physical" },
  { key: "double_glass_volley", label: "Double Glass Volley", category: "physical" },
  { key: "rulo", label: "Rulo", category: "physical" },
  { key: "x3", label: "x3", category: "physical" },
  { key: "x4", label: "x4", category: "physical" },
  { key: "magician", label: "Magician", category: "physical" },
  { key: "lucky", label: "Lucky", category: "physical" },
  { key: "lob", label: "Lob", category: "physical" },
  // Mental/Social (8)
  { key: "hosting", label: "Hosting", category: "mental" },
  { key: "mentoring", label: "Mentoring", category: "mental" },
  { key: "heart", label: "Heart", category: "mental" },
  { key: "leadership", label: "Leadership", category: "mental" },
  { key: "improvement", label: "Improvement", category: "mental" },
  { key: "clutch", label: "Clutch", category: "mental" },
  { key: "motivator", label: "Motivator", category: "mental" },
  { key: "wall", label: "Wall", category: "mental" },
];

export const CREDIT_LABELS: Record<string, string> = Object.fromEntries(
  CREDIT_TYPES.map((c) => [c.key, c.label])
);

// Also keep old labels for backward compatibility
const LEGACY_LABELS: Record<string, string> = {
  mvp: "MVP",
  clutch_play: "Clutch Play",
  sharp_shots: "Sharp Shots",
  team_spirit: "Team Spirit",
  never_gives_up: "Never Gives Up",
  best_sportsmanship: "Best Sportsmanship",
};

export function getCreditLabel(key: string): string {
  return CREDIT_LABELS[key] || LEGACY_LABELS[key] || key;
}
