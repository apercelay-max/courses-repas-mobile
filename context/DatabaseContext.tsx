import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Database, InventoryItem, Location, MealPlanEntry, ShoppingLists, ExtractedIngredient } from "@/types/database";
import { initialData } from "@/lib/seedData";
import { computeShoppingLists, findOrCreateIngredient, getIngredientName, getPortionFactor, DEFAULT_SERVINGS } from "@/lib/shoppingList";
import { toComparable, fromComparable } from "@/lib/units";

const STORAGE_KEY = "@repas-courses:db";

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 6)}`;
}

export interface BatchInventoryInput {
  name: string;
  quantity: number;
  unit: string;
  location: Location;
  expiryDate?: string | null;
}

interface DatabaseContextType {
  db: Database;
  isLoading: boolean;
  shoppingLists: ShoppingLists;
  addInventoryItem: (item: Omit<InventoryItem, "id" | "updatedAt">) => Promise<void>;
  addInventoryItemsBatch: (items: BatchInventoryInput[]) => Promise<void>;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  removeInventoryItem: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  addRecipeWithIngredients: (title: string, rawInput: string, ingredients: ExtractedIngredient[], servings?: number) => Promise<string>;
  addMealPlanEntry: (recipeId: string, date: string, slot: MealPlanEntry["mealSlot"], portions?: number) => Promise<void>;
  removeMealPlanEntry: (id: string) => Promise<void>;
  cookMealPlanEntry: (id: string) => Promise<void>;
  addManualShoppingItem: (ingredientName: string, quantity: number, unit: string) => Promise<void>;
  markItemBought: (manualItemId: string) => Promise<void>;
  removeShoppingItem: (id: string) => Promise<void>;
  // Remplace toute la base (utilisé par la synchro cloud : restauration
  // depuis le cloud, ou résolution d'un conflit entre appareils).
  replaceDb: (newDb: Database) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database>(initialData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setDb(JSON.parse(stored));
        }
      } catch (e) {
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const save = useCallback(async (newDb: Database) => {
    setDb(newDb);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newDb));
  }, []);

  const addInventoryItem = useCallback(async (item: Omit<InventoryItem, "id" | "updatedAt">) => {
    const newDb = { ...db };
    newDb.inventoryItems = [...db.inventoryItems, {
      ...item, id: genId("inv"), updatedAt: new Date().toISOString(),
    }];
    await save(newDb);
  }, [db, save]);

  // Ajout groupé (scan de ticket de caisse) : crée/rapproche les ingrédients
  // via findOrCreateIngredient puis ajoute tout l'inventaire en une seule sauvegarde.
  const addInventoryItemsBatch = useCallback(async (items: BatchInventoryInput[]) => {
    const newDb = { ...db, ingredients: [...db.ingredients], inventoryItems: [...db.inventoryItems] };
    for (const it of items) {
      const ingredient = findOrCreateIngredient(newDb, it.name, it.unit);
      newDb.inventoryItems.push({
        id: genId("inv"),
        ingredientId: ingredient.id,
        location: it.location,
        quantity: it.quantity,
        unit: it.unit,
        expiryDate: it.expiryDate ?? null,
        isFavorite: false,
        updatedAt: new Date().toISOString(),
      });
    }
    await save(newDb);
  }, [db, save]);

  const updateInventoryItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    const newDb = { ...db };
    newDb.inventoryItems = db.inventoryItems.map(item =>
      item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    );
    await save(newDb);
  }, [db, save]);

  const removeInventoryItem = useCallback(async (id: string) => {
    const newDb = { ...db, inventoryItems: db.inventoryItems.filter(i => i.id !== id) };
    await save(newDb);
  }, [db, save]);

  const toggleFavorite = useCallback(async (id: string) => {
    const newDb = { ...db };
    newDb.inventoryItems = db.inventoryItems.map(item =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite, updatedAt: new Date().toISOString() } : item
    );
    await save(newDb);
  }, [db, save]);

  const addRecipeWithIngredients = useCallback(async (title: string, rawInput: string, ingredients: ExtractedIngredient[], servings?: number): Promise<string> => {
    const newDb = { ...db, ingredients: [...db.ingredients], recipes: [...db.recipes], recipeIngredients: [...db.recipeIngredients] };
    const recipeId = genId("rec");
    newDb.recipes.push({
      id: recipeId,
      title,
      rawInput,
      createdAt: new Date().toISOString(),
      servings: servings && servings > 0 ? servings : DEFAULT_SERVINGS,
    });
    for (const ing of ingredients) {
      const ingredient = findOrCreateIngredient(newDb, ing.name, ing.unit);
      newDb.recipeIngredients.push({
        id: genId("ri"),
        recipeId,
        ingredientId: ingredient.id,
        quantity: ing.quantity,
        unit: ing.unit,
      });
    }
    await save(newDb);
    return recipeId;
  }, [db, save]);

  const addMealPlanEntry = useCallback(async (recipeId: string, date: string, slot: MealPlanEntry["mealSlot"], portions?: number) => {
    const newDb = { ...db, mealPlanEntries: [...db.mealPlanEntries] };
    newDb.mealPlanEntries.push({
      id: genId("meal"),
      recipeId,
      plannedDate: date,
      mealSlot: slot,
      cookedAt: null,
      portions: portions && portions > 0 ? portions : undefined,
    });
    await save(newDb);
  }, [db, save]);

  const removeMealPlanEntry = useCallback(async (id: string) => {
    const newDb = { ...db, mealPlanEntries: db.mealPlanEntries.filter(e => e.id !== id) };
    await save(newDb);
  }, [db, save]);

  // "J'ai cuisiné ce repas" : déduit les ingrédients de la recette du stock (frigo/placard/congélateur confondus),
  // en tenant compte du nombre de portions, en consommant en priorité ce qui expire le plus tôt,
  // puis marque le repas comme cuisiné.
  const cookMealPlanEntry = useCallback(async (id: string) => {
    const entry = db.mealPlanEntries.find(e => e.id === id);
    if (!entry || entry.cookedAt) return;

    const factor = getPortionFactor(db, entry);
    const recipeIngs = db.recipeIngredients.filter(ri => ri.recipeId === entry.recipeId);
    let inventoryItems = [...db.inventoryItems];

    for (const ri of recipeIngs) {
      const { key, value: neededBase } = toComparable(ri.quantity, ri.unit);
      let remainingNeeded = neededBase * factor;

      const candidateIds = inventoryItems
        .filter(item => item.ingredientId === ri.ingredientId && toComparable(item.quantity, item.unit).key === key)
        .sort((a, b) => {
          if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
          if (a.expiryDate) return -1;
          if (b.expiryDate) return 1;
          return 0;
        })
        .map(item => item.id);

      for (const itemId of candidateIds) {
        if (remainingNeeded <= 0) break;
        const current = inventoryItems.find(item => item.id === itemId);
        if (!current) continue;
        const currentComparable = toComparable(current.quantity, current.unit);
        const deduct = Math.min(currentComparable.value, remainingNeeded);
        remainingNeeded -= deduct;
        const remainingValue = currentComparable.value - deduct;

        if (remainingValue <= 0.0001) {
          inventoryItems = inventoryItems.filter(item => item.id !== itemId);
        } else {
          const { quantity, unit } = fromComparable(key, remainingValue);
          inventoryItems = inventoryItems.map(item =>
            item.id === itemId ? { ...item, quantity, unit, updatedAt: new Date().toISOString() } : item
          );
        }
      }
    }

    const mealPlanEntries = db.mealPlanEntries.map(e =>
      e.id === id ? { ...e, cookedAt: new Date().toISOString() } : e
    );
    await save({ ...db, inventoryItems, mealPlanEntries });
  }, [db, save]);

  const addManualShoppingItem = useCallback(async (ingredientName: string, quantity: number, unit: string) => {
    const newDb = { ...db, ingredients: [...db.ingredients], shoppingListItems: [...db.shoppingListItems] };
    const ingredient = findOrCreateIngredient(newDb, ingredientName);
    newDb.shoppingListItems.push({
      id: genId("shop"),
      ingredientId: ingredient.id,
      quantityNeeded: quantity,
      unit,
      status: "to_buy",
      source: "manual",
      updatedAt: new Date().toISOString(),
    });
    await save(newDb);
  }, [db, save]);

  const markItemBought = useCallback(async (manualItemId: string) => {
    const newDb = { ...db, shoppingListItems: [...db.shoppingListItems], inventoryItems: [...db.inventoryItems] };
    const shopItem = db.shoppingListItems.find(i => i.id === manualItemId);
    if (shopItem) {
      newDb.shoppingListItems = newDb.shoppingListItems.map(i =>
        i.id === manualItemId ? { ...i, status: "bought" as const, updatedAt: new Date().toISOString() } : i
      );
      newDb.inventoryItems.push({
        id: genId("inv"),
        ingredientId: shopItem.ingredientId,
        location: "placard",
        quantity: shopItem.quantityNeeded,
        unit: shopItem.unit,
        expiryDate: null,
        updatedAt: new Date().toISOString(),
      });
    }
    await save(newDb);
  }, [db, save]);

  const removeShoppingItem = useCallback(async (id: string) => {
    const newDb = { ...db, shoppingListItems: db.shoppingListItems.filter(i => i.id !== id) };
    await save(newDb);
  }, [db, save]);

  const today = new Date().toISOString().slice(0, 10);
  const shoppingLists = computeShoppingLists(db, today);

  return (
    <DatabaseContext.Provider value={{
      db, isLoading, shoppingLists,
      addInventoryItem, addInventoryItemsBatch, updateInventoryItem, removeInventoryItem, toggleFavorite,
      addRecipeWithIngredients, addMealPlanEntry, removeMealPlanEntry, cookMealPlanEntry,
      addManualShoppingItem, markItemBought, removeShoppingItem,
      replaceDb: save,
    }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error("useDatabase must be used inside DatabaseProvider");
  return ctx;
}
