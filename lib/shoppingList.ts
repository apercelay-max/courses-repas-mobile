import type { Database, Ingredient, ShoppingListEntry, ReverseListEntry, ShoppingLists, ExtractedIngredient } from "@/types/database";
import { toComparable, fromComparable, normalizeUnit } from "./units";

function normalizeIngredientName(name: string): string {
  let s = name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  s = s.replace(/^(de la |de l'|du |des |de |d'|la |le |les |un |une )/g, "");
  if (s.endsWith("s") && s.length > 3 && !s.endsWith("ss")) s = s.slice(0, -1);
  return s.trim();
}

export function findOrCreateIngredient(db: Database, rawName: string, defaultUnit = "piece"): Ingredient {
  const normalized = normalizeIngredientName(rawName);
  for (const ing of db.ingredients) {
    if (normalizeIngredientName(ing.canonicalName) === normalized) return ing;
    for (const alias of ing.aliases) {
      if (normalizeIngredientName(alias) === normalized) return ing;
    }
  }
  const created: Ingredient = {
    id: `ing_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 6)}`,
    canonicalName: normalized,
    defaultUnit,
    aliases: rawName.trim() !== normalized ? [rawName.trim()] : [],
    rayon: "autre",
  };
  db.ingredients.push(created);
  return created;
}

export function getIngredientName(db: Database, ingredientId: string): string {
  const ing = db.ingredients.find(i => i.id === ingredientId);
  return ing ? ing.canonicalName : "(ingrédient inconnu)";
}

export function computeShoppingLists(db: Database, fromDate: string): ShoppingLists {
  const needed = new Map<string, number>();
  const upcomingEntries = db.mealPlanEntries.filter(e => e.plannedDate >= fromDate);
  for (const entry of upcomingEntries) {
    const recipeIngs = db.recipeIngredients.filter(ri => ri.recipeId === entry.recipeId);
    for (const ri of recipeIngs) {
      const { key, value } = toComparable(ri.quantity, ri.unit);
      const mapKey = `${ri.ingredientId}__${key}`;
      needed.set(mapKey, (needed.get(mapKey) ?? 0) + value);
    }
  }

  const stock = new Map<string, number>();
  for (const item of db.inventoryItems) {
    const { key, value } = toComparable(item.quantity, item.unit);
    const mapKey = `${item.ingredientId}__${key}`;
    stock.set(mapKey, (stock.get(mapKey) ?? 0) + value);
  }

  const toBuy: ShoppingListEntry[] = [];
  const reverse: ReverseListEntry[] = [];

  for (const [mapKey, neededValue] of needed.entries()) {
    const [ingredientId, comparableKey] = mapKey.split("__");
    const haveValue = stock.get(mapKey) ?? 0;
    const name = getIngredientName(db, ingredientId);
    const missing = neededValue - haveValue;

    if (missing > 0) {
      const { quantity, unit } = fromComparable(comparableKey, missing);
      const inStockDisplay = fromComparable(comparableKey, haveValue);
      toBuy.push({ ingredientId, name, quantity, unit, inStock: inStockDisplay.quantity, inStockUnit: inStockDisplay.unit, source: "auto" });
    } else {
      const neededDisplay = fromComparable(comparableKey, neededValue);
      const haveDisplay = fromComparable(comparableKey, haveValue);
      reverse.push({ ingredientId, name, needed: neededDisplay, inStock: haveDisplay });
    }
  }

  for (const item of db.shoppingListItems) {
    if (item.status !== "to_buy") continue;
    toBuy.push({
      ingredientId: item.ingredientId,
      name: getIngredientName(db, item.ingredientId),
      quantity: item.quantityNeeded,
      unit: item.unit,
      inStock: 0, inStockUnit: item.unit,
      source: "manual",
      manualItemId: item.id,
    });
  }

  return { toBuy, reverse };
}

const KNOWN_DISHES: Record<string, ExtractedIngredient[]> = {
  "bolognaise": [
    { name: "viande hachée", quantity: 400, unit: "g" },
    { name: "tomate concassée", quantity: 400, unit: "g" },
    { name: "oignon", quantity: 1, unit: "piece" },
    { name: "ail", quantity: 2, unit: "gousse" },
    { name: "huile d'olive", quantity: 20, unit: "ml" },
    { name: "pâte", quantity: 400, unit: "g" },
  ],
  "carbonara": [
    { name: "pâte", quantity: 400, unit: "g" },
    { name: "lardons", quantity: 150, unit: "g" },
    { name: "œuf", quantity: 3, unit: "piece" },
    { name: "parmesan", quantity: 80, unit: "g" },
    { name: "poivre", quantity: 5, unit: "g" },
  ],
  "omelette": [
    { name: "œuf", quantity: 3, unit: "piece" },
    { name: "beurre", quantity: 10, unit: "g" },
    { name: "sel", quantity: 2, unit: "g" },
  ],
  "poulet rôti": [
    { name: "poulet", quantity: 1200, unit: "g" },
    { name: "huile d'olive", quantity: 30, unit: "ml" },
    { name: "ail", quantity: 3, unit: "gousse" },
    { name: "sel", quantity: 5, unit: "g" },
    { name: "poivre", quantity: 3, unit: "g" },
  ],
  "gratin": [
    { name: "pomme de terre", quantity: 6, unit: "piece" },
    { name: "crème fraîche", quantity: 200, unit: "ml" },
    { name: "fromage râpé", quantity: 100, unit: "g" },
    { name: "ail", quantity: 1, unit: "gousse" },
    { name: "sel", quantity: 3, unit: "g" },
  ],
  "salade": [
    { name: "salade verte", quantity: 1, unit: "piece" },
    { name: "tomate", quantity: 2, unit: "piece" },
    { name: "huile d'olive", quantity: 20, unit: "ml" },
    { name: "citron", quantity: 1, unit: "piece" },
  ],
  "pizza": [
    { name: "pâte à pizza", quantity: 1, unit: "piece" },
    { name: "tomate concassée", quantity: 200, unit: "g" },
    { name: "mozzarella", quantity: 125, unit: "g" },
    { name: "basilic", quantity: 10, unit: "g" },
  ],
  "soupe": [
    { name: "carotte", quantity: 3, unit: "piece" },
    { name: "pomme de terre", quantity: 2, unit: "piece" },
    { name: "oignon", quantity: 1, unit: "piece" },
    { name: "bouillon cube", quantity: 1, unit: "piece" },
  ],
};

const UNIT_WORDS: Record<string, string> = {
  grammes: "g", gramme: "g", g: "g",
  kilos: "kg", kilo: "kg", kg: "kg",
  ml: "ml", millilitres: "ml", millilitre: "ml",
  cl: "cl", centilitres: "cl",
  litres: "L", litre: "L", l: "L",
  pièces: "piece", pièce: "piece", piece: "piece",
  gousses: "gousse", gousse: "gousse",
  tranches: "tranche", tranche: "tranche",
  boites: "boite", boîtes: "boite",
};

function parseQuantityLine(line: string): ExtractedIngredient | null {
  const match = line.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Zèéêëàâùûîôüç.]+(?:\s+[a-zA-Zèéêëàâùûîôüç.]+)?)\s+(?:de\s+)?(.+)$/i);
  if (!match) return null;
  const qty = parseFloat(match[1].replace(",", "."));
  const unitWord = match[2].toLowerCase().trim();
  const name = match[3].trim();
  const unit = UNIT_WORDS[unitWord] ?? "piece";
  if (isNaN(qty) || !name) return null;
  return { name, quantity: qty, unit };
}

export function mockExtractIngredients(rawInput: string): ExtractedIngredient[] {
  const lower = rawInput.toLowerCase();
  for (const [dish, ingredients] of Object.entries(KNOWN_DISHES)) {
    if (lower.includes(dish)) return ingredients;
  }
  const lines = rawInput.split(/[\n,;]+/);
  const results: ExtractedIngredient[] = [];
  for (const line of lines) {
    const parsed = parseQuantityLine(line.trim());
    if (parsed) results.push(parsed);
  }
  return results;
}
