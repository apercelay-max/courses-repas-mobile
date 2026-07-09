export type Rayon =
  | "fruits_legumes"
  | "boucherie"
  | "frais"
  | "surgeles"
  | "epicerie"
  | "boulangerie"
  | "autre";

// Ordre d'affichage dans la liste de courses, pensé comme un parcours magasin classique.
export const RAYON_ORDER: Rayon[] = [
  "fruits_legumes",
  "boucherie",
  "frais",
  "surgeles",
  "epicerie",
  "boulangerie",
  "autre",
];

export const RAYON_LABELS: Record<Rayon, string> = {
  fruits_legumes: "Fruits & légumes",
  boucherie: "Boucherie / Poissonnerie",
  frais: "Frais (lait, œufs, fromage...)",
  surgeles: "Surgelés",
  epicerie: "Épicerie",
  boulangerie: "Boulangerie",
  autre: "Autre",
};
