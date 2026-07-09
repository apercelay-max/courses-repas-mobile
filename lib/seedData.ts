import type { Database, Ingredient } from "@/types/database";
import type { Rayon } from "@/lib/rayons";

const base: Array<[string, string, string, string[], Rayon]> = [
  ["ing_pates", "pâte", "g", ["pâtes", "pâtes sèches", "spaghetti", "spaghettis"], "epicerie"],
  ["ing_riz", "riz", "g", ["riz basmati", "riz blanc"], "epicerie"],
  ["ing_viande_hachee", "viande hachée", "g", ["bœuf haché", "viande hachée de bœuf", "steak haché"], "boucherie"],
  ["ing_poulet", "poulet", "g", ["blanc de poulet", "filet de poulet", "escalope de poulet"], "boucherie"],
  ["ing_oeuf", "œuf", "piece", ["œufs", "oeuf", "oeufs"], "frais"],
  ["ing_lait", "lait", "ml", ["lait demi-écrémé", "lait entier"], "frais"],
  ["ing_beurre", "beurre", "g", [], "frais"],
  ["ing_farine", "farine", "g", ["farine de blé", "farine type 45"], "epicerie"],
  ["ing_sucre", "sucre", "g", ["sucre blanc", "sucre en poudre"], "epicerie"],
  ["ing_sel", "sel", "g", [], "epicerie"],
  ["ing_poivre", "poivre", "g", [], "epicerie"],
  ["ing_huile_olive", "huile d'olive", "ml", ["huile d olive"], "epicerie"],
  ["ing_tomate", "tomate", "piece", ["tomates", "tomate cerise", "tomates cerises"], "fruits_legumes"],
  ["ing_tomate_concassee", "tomate concassée", "g", ["tomates concassées", "coulis de tomate", "purée de tomate"], "epicerie"],
  ["ing_oignon", "oignon", "piece", ["oignons", "oignon jaune"], "fruits_legumes"],
  ["ing_ail", "ail", "gousse", ["gousse d'ail", "gousses d'ail"], "fruits_legumes"],
  ["ing_carotte", "carotte", "piece", ["carottes"], "fruits_legumes"],
  ["ing_pomme_de_terre", "pomme de terre", "piece", ["pommes de terre", "patate", "patates"], "fruits_legumes"],
  ["ing_courgette", "courgette", "piece", ["courgettes"], "fruits_legumes"],
  ["ing_poivron", "poivron", "piece", ["poivrons", "poivron rouge", "poivron vert"], "fruits_legumes"],
  ["ing_champignon", "champignon", "g", ["champignons", "champignons de paris"], "fruits_legumes"],
  ["ing_salade", "salade verte", "piece", ["laitue", "salade"], "fruits_legumes"],
  ["ing_fromage_rape", "fromage râpé", "g", ["gruyère râpé", "emmental râpé"], "frais"],
  ["ing_parmesan", "parmesan", "g", [], "frais"],
  ["ing_creme_fraiche", "crème fraîche", "ml", ["crème liquide", "crème épaisse"], "frais"],
  ["ing_yaourt", "yaourt", "piece", ["yaourts", "yaourt nature"], "frais"],
  ["ing_jambon", "jambon", "tranche", ["tranches de jambon", "jambon blanc"], "boucherie"],
  ["ing_saumon", "saumon", "g", ["pavé de saumon", "filet de saumon"], "boucherie"],
  ["ing_thon", "thon", "boite", ["thon en boîte", "boîte de thon"], "epicerie"],
  ["ing_pain", "pain", "piece", ["baguette", "pain de mie"], "boulangerie"],
  ["ing_citron", "citron", "piece", ["citrons", "jus de citron"], "fruits_legumes"],
  ["ing_basilic", "basilic", "g", ["basilic frais"], "fruits_legumes"],
  ["ing_persil", "persil", "g", ["persil frais"], "fruits_legumes"],
  ["ing_mozzarella", "mozzarella", "g", ["boule de mozzarella"], "frais"],
  ["ing_avocat", "avocat", "piece", ["avocats"], "fruits_legumes"],
  ["ing_pomme", "pomme", "piece", ["pommes"], "fruits_legumes"],
  ["ing_banane", "banane", "piece", ["bananes"], "fruits_legumes"],
  ["ing_chocolat", "chocolat", "g", ["chocolat noir", "chocolat pâtissier"], "epicerie"],
  ["ing_lardons", "lardons", "g", ["lardons fumés"], "boucherie"],
  ["ing_bouillon_cube", "bouillon cube", "piece", ["cube de bouillon", "bouillon de légumes"], "epicerie"],
];

const ingredients: Ingredient[] = base.map(([id, canonicalName, defaultUnit, aliases, rayon]) => ({
  id, canonicalName, defaultUnit, aliases, rayon,
}));

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const initialData: Database = {
  ingredients,
  inventoryItems: [
    { id: "inv_1", ingredientId: "ing_pates", location: "placard", quantity: 500, unit: "g", expiryDate: isoDaysFromNow(120), updatedAt: new Date().toISOString() },
    { id: "inv_2", ingredientId: "ing_riz", location: "placard", quantity: 1000, unit: "g", expiryDate: isoDaysFromNow(200), updatedAt: new Date().toISOString() },
    { id: "inv_3", ingredientId: "ing_oeuf", location: "frigo", quantity: 6, unit: "piece", expiryDate: isoDaysFromNow(10), updatedAt: new Date().toISOString() },
    { id: "inv_4", ingredientId: "ing_lait", location: "frigo", quantity: 1000, unit: "ml", expiryDate: isoDaysFromNow(7), updatedAt: new Date().toISOString() },
    { id: "inv_5", ingredientId: "ing_oignon", location: "placard", quantity: 4, unit: "piece", expiryDate: null, updatedAt: new Date().toISOString() },
    { id: "inv_6", ingredientId: "ing_ail", location: "placard", quantity: 6, unit: "gousse", expiryDate: null, updatedAt: new Date().toISOString() },
    { id: "inv_7", ingredientId: "ing_huile_olive", location: "placard", quantity: 500, unit: "ml", expiryDate: isoDaysFromNow(300), updatedAt: new Date().toISOString() },
    { id: "inv_8", ingredientId: "ing_sel", location: "placard", quantity: 1000, unit: "g", expiryDate: null, updatedAt: new Date().toISOString() },
    { id: "inv_9", ingredientId: "ing_tomate_concassee", location: "placard", quantity: 400, unit: "g", expiryDate: isoDaysFromNow(180), updatedAt: new Date().toISOString() },
    { id: "inv_10", ingredientId: "ing_fromage_rape", location: "frigo", quantity: 100, unit: "g", expiryDate: isoDaysFromNow(5), updatedAt: new Date().toISOString() },
  ],
  recipes: [],
  recipeIngredients: [],
  mealPlanEntries: [],
  shoppingListItems: [],
};
