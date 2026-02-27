export const CZECH_REGIONS = [
  { value: "Prague", label: "Prague (Praha)" },
  { value: "Central Bohemia", label: "Central Bohemia (Středočeský)" },
  { value: "South Bohemia", label: "South Bohemia (Jihočeský)" },
  { value: "Plzeň", label: "Plzeň (Plzeňský)" },
  { value: "Karlovy Vary", label: "Karlovy Vary (Karlovarský)" },
  { value: "Ústí nad Labem", label: "Ústí nad Labem (Ústecký)" },
  { value: "Liberec", label: "Liberec (Liberecký)" },
  { value: "Hradec Králové", label: "Hradec Králové (Královéhradecký)" },
  { value: "Pardubice", label: "Pardubice (Pardubický)" },
  { value: "Vysočina", label: "Vysočina" },
  { value: "South Moravia", label: "South Moravia (Jihomoravský)" },
  { value: "Olomouc", label: "Olomouc (Olomoucký)" },
  { value: "Zlín", label: "Zlín (Zlínský)" },
  { value: "Moravian-Silesian", label: "Moravian-Silesian (Moravskoslezský)" },
] as const;

export type RegionValue = typeof CZECH_REGIONS[number]["value"];

export function getRegionLabel(value: string): string {
  return CZECH_REGIONS.find(r => r.value === value)?.label ?? value;
}
