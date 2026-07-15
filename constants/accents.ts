// Couleurs d'accent — la même palette que PPL Tracker, pour que les deux
// apps puissent avoir exactement le même look.

export interface AccentPreset {
  id: string;
  label: string;
  c1: string;   // couleur principale
  c2: string;   // couleur de dégradé (associée)
  rgb1: string; // c1 en "r,g,b" pour les rgba()
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "red",    label: "Rouge",  c1: "#e03030", c2: "#9b27af", rgb1: "224,48,48" },
  { id: "blue",   label: "Bleu",   c1: "#2563eb", c2: "#06b6d4", rgb1: "37,99,235" },
  { id: "green",  label: "Vert",   c1: "#16a34a", c2: "#84cc16", rgb1: "22,163,74" },
  { id: "orange", label: "Orange", c1: "#ea580c", c2: "#f59e0b", rgb1: "234,88,12" },
  { id: "violet", label: "Violet", c1: "#9333ea", c2: "#ec4899", rgb1: "147,51,234" },
  { id: "cyan",   label: "Cyan",   c1: "#0891b2", c2: "#22d3ee", rgb1: "8,145,178" },
];

export const getAccent = (id: string): AccentPreset | undefined =>
  ACCENT_PRESETS.find((a) => a.id === id);
