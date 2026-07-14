import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { type AppTheme, type ThemeId, THEMES, DEFAULT_THEME_ID } from "@/constants/themes";

export type WidgetShape  = "arrondi" | "doux" | "carre" | "pilule";
export type WidgetLayout = "grille" | "liste";
export type TabStyle     = "classique" | "verre";

export const WIDGET_SHAPES: Record<WidgetShape, { label: string; radius: number }> = {
  arrondi: { label: "Arrondi", radius: 16 },
  doux:    { label: "Doux",    radius: 28 },
  carre:   { label: "Carré",  radius: 6  },
  pilule:  { label: "Pilule",  radius: 44 },
};

interface ThemeContextType {
  theme: AppTheme;
  themeId: ThemeId | "system";
  setThemeId: (id: ThemeId | "system") => void;
  widgetShape: WidgetShape;
  setWidgetShape: (s: WidgetShape) => void;
  widgetLayout: WidgetLayout;
  setWidgetLayout: (l: WidgetLayout) => void;
  tabStyle: TabStyle;
  setTabStyle: (t: TabStyle) => void;
  showFavoriteDishes: boolean;
  setShowFavoriteDishes: (v: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_KEY  = "@repas-courses:theme";
const SHAPE_KEY  = "@repas-courses:widgetShape";
const LAYOUT_KEY = "@repas-courses:widgetLayout";
const TAB_KEY    = "@repas-courses:tabStyle";
const FAV_DISHES_KEY = "@repas-courses:showFavDishes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() ?? "light";
  const [themeId,      setThemeIdState]      = useState<ThemeId | "system">("system");
  const [widgetShape,  setWidgetShapeState]  = useState<WidgetShape>("arrondi");
  const [widgetLayout, setWidgetLayoutState] = useState<WidgetLayout>("grille");
  const [tabStyle,     setTabStyleState]     = useState<TabStyle>("classique");
  const [showFavoriteDishes, setShowFavoriteDishesState] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(SHAPE_KEY),
      AsyncStorage.getItem(LAYOUT_KEY),
      AsyncStorage.getItem(TAB_KEY),
      AsyncStorage.getItem(FAV_DISHES_KEY),
    ]).then(([tv, sv, lv, tbv, fv]) => {
      if (tv && (tv in THEMES || tv === "system")) setThemeIdState(tv as ThemeId | "system");
      if (sv && sv in WIDGET_SHAPES)  setWidgetShapeState(sv as WidgetShape);
      if (lv === "grille" || lv === "liste") setWidgetLayoutState(lv);
      if (tbv === "classique" || tbv === "verre") setTabStyleState(tbv);
      if (fv === "0") setShowFavoriteDishesState(false);
    });
  }, []);

  const resolvedId: ThemeId =
    themeId === "system"
      ? systemScheme === "dark" ? "classicDark" : "classicLight"
      : themeId;

  const theme = THEMES[resolvedId] ?? THEMES[DEFAULT_THEME_ID];

  const setThemeId = useCallback((id: ThemeId | "system") => {
    setThemeIdState(id);
    AsyncStorage.setItem(THEME_KEY, id);
  }, []);

  const setWidgetShape = useCallback((s: WidgetShape) => {
    setWidgetShapeState(s);
    AsyncStorage.setItem(SHAPE_KEY, s);
  }, []);

  const setWidgetLayout = useCallback((l: WidgetLayout) => {
    setWidgetLayoutState(l);
    AsyncStorage.setItem(LAYOUT_KEY, l);
  }, []);

  const setTabStyle = useCallback((t: TabStyle) => {
    setTabStyleState(t);
    AsyncStorage.setItem(TAB_KEY, t);
  }, []);

  const setShowFavoriteDishes = useCallback((v: boolean) => {
    setShowFavoriteDishesState(v);
    AsyncStorage.setItem(FAV_DISHES_KEY, v ? "1" : "0");
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme, themeId, setThemeId,
      widgetShape, setWidgetShape,
      widgetLayout, setWidgetLayout,
      tabStyle, setTabStyle,
      showFavoriteDishes, setShowFavoriteDishes,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
