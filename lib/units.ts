const MASS_TO_G: Record<string, number> = {
  g: 1, gramme: 1, grammes: 1,
  kg: 1000, kilo: 1000, kilos: 1000,
};

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1, millilitre: 1, millilitres: 1,
  cl: 10, centilitre: 10, centilitres: 10,
  l: 1000, litre: 1000, litres: 1000,
};

const UNIT_ALIASES: Record<string, string> = {
  pièce: "piece", pièces: "piece", pieces: "piece", piece: "piece",
  unité: "piece", unités: "piece",
  gousses: "gousse", gousse: "gousse",
  tranches: "tranche", tranche: "tranche",
  boites: "boite", boîtes: "boite", boîte: "boite", boite: "boite",
};

export function normalizeUnit(unit: string): string {
  const u = unit.trim().toLowerCase();
  return UNIT_ALIASES[u] ?? u;
}

export interface Comparable {
  key: string;
  value: number;
}

export function toComparable(quantity: number, unitRaw: string): Comparable {
  const unit = normalizeUnit(unitRaw);
  if (unit in MASS_TO_G) return { key: "g", value: quantity * MASS_TO_G[unit] };
  if (unit in VOLUME_TO_ML) return { key: "ml", value: quantity * VOLUME_TO_ML[unit] };
  return { key: `count:${unit}`, value: quantity };
}

export function fromComparable(key: string, value: number): { quantity: number; unit: string } {
  if (key === "g") return value >= 1000 ? { quantity: round(value / 1000), unit: "kg" } : { quantity: round(value), unit: "g" };
  if (key === "ml") return value >= 1000 ? { quantity: round(value / 1000), unit: "L" } : { quantity: round(value), unit: "ml" };
  return { quantity: round(value), unit: key.replace("count:", "") };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export const UNITS = ["g", "kg", "ml", "cl", "L", "piece", "gousse", "tranche", "boite", "c.à.s", "c.à.c"];
