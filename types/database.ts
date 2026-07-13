import type { Rayon } from "@/lib/rayons";

export type Location = "frigo" | "placard" | "congelateur";

export interface Ingredient {
  id: string;
  canonicalName: string;
  defaultUnit: string;
  aliases: string[];
  rayon: Rayon;
}

export interface InventoryItem {
  id: string;
  ingredientId: string;
  location: Location;
  quantity: number;
  unit: string;
  expiryDate: string | null;
  isFavorite?: boolean;
  updatedAt: string;
}

export interface Recipe {
  id: string;
  title: string;
  rawInput: string;
  createdAt: string;
  /** Nombre de personnes pour lequel la recette est prévue (défaut : 4) */
  servings?: number;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
}

export interface MealPlanEntry {
  id: string;
  recipeId: string;
  plannedDate: string;
  mealSlot: "breakfast" | "lunch" | "dinner";
  cookedAt: string | null;
  /** Nombre de personnes pour ce repas (défaut : servings de la recette) */
  portions?: number;
}

export type ShoppingItemStatus = "to_buy" | "bought";
export type ShoppingItemSource = "auto" | "manual";

export interface ShoppingListItem {
  id: string;
  ingredientId: string;
  quantityNeeded: number;
  unit: string;
  status: ShoppingItemStatus;
  source: ShoppingItemSource;
  updatedAt: string;
}

export interface Database {
  ingredients: Ingredient[];
  inventoryItems: InventoryItem[];
  recipes: Recipe[];
  recipeIngredients: RecipeIngredient[];
  mealPlanEntries: MealPlanEntry[];
  shoppingListItems: ShoppingListItem[];
}

export interface ExtractedIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface ShoppingListEntry {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  inStock: number;
  inStockUnit: string;
  source: "auto" | "manual";
  manualItemId?: string;
}

export interface ReverseListEntry {
  ingredientId: string;
  name: string;
  needed: { quantity: number; unit: string };
  inStock: { quantity: number; unit: string };
}

export interface ShoppingLists {
  toBuy: ShoppingListEntry[];
  reverse: ReverseListEntry[];
}
