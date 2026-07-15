import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { type AppTheme, type ThemeId, THEMES, DEFAULT_THEME_ID } from "@/constants/themes";
import { getAccent } from "@/constants/accents";

export type WidgetShape  = "arrondi" | "doux" | "carre" | "pilule";
export type WidgetLayout = "grille" | "liste";
export type TabStyle     = "classique" | "verre";
/** "auto" = couleur du thème, sinon id d'un preset de constants/accents.ts */
export type AccentId = string;

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
  accentId: AccentId;
  setAccentId: (id: AccentId) => void;
  amoled: boolean;
  setAmoled: (on: boolean) => void;
  widgetShape: WidgetShape;
  setWidgetShape: (s: WidgetShape) => void;
  widgetLayout: WidgetLayout;
  setWidgetLayout: (l: WidgetLayout) => void;
  tabStyle: TabStyle;
  setTabStyle: (t: TabStyle) => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_KEY  = "@repas-courses:theme";
const SHAPE_KEY  = "@repas-courses:widgetShape";
const LAYOUT_KEY = "@repas-courses:widgetLayout";
const TAB_KEY    = "@repas-courses:tabStyle";
const ACCENT_KEY = "@repas-courses:accent";
const AMOLED_KEY = "@repas-courses:amoled";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() ?? "light";
  const [themeId,      setThemeIdState]      = useState<ThemeId | "system">("system");
  const [accentId,     setAccentIdState]     = useState<AccentId>("auto");
  const [amoled,       setAmoledState]       = useState(false);
  const [widgetShape,  setWidgetShapeState]  = useState<WidgetShape>("arrondi");
  const [widgetLayout, setWidgetLayoutState] = useState<WidgetLayout>("grille");
  const [tabStyle,     setTabStyleState]     = useState<TabStyle>("classique");

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(SHAPE_KEY),
      AsyncStorage.getItem(LAYOUT_KEY),
      AsyncStorage.getItem(TAB_KEY),
      AsyncStorage.getItem(ACCENT_KEY),
      AsyncStorage.getItem(AMOLED_KEY),
    ]).then(([tv, sv, lv, tbv, av, amv]) => {
      if (tv && (tv in THEMES || tv === "system")) setThemeIdState(tv as ThemeId | "system");
      if (sv && sv in WIDGET_SHAPES)  setWidgetShapeState(sv as WidgetShape);
      if (lv === "grille" || lv === "liste") setWidgetLayoutState(lv);
      if (tbv === "classique" || tbv === "verre") setTabStyleState(tbv);
      if (av) setAccentIdState(av);
      if (amv === "1") setAmoledState(true);
    });
  }, []);

  const resolvedId: ThemeId =
    themeId === "system"
      ? systemScheme === "dark" ? "classicDark" : "classicLight"
      : themeId;

  const baseTheme = THEMES[resolvedId] ?? THEMES[DEFAULT_THEME_ID];

  // Thème final = thème de base + mode AMOLED + couleur d'accent choisie
  // (même logique que PPL Tracker : l'accent surcharge la couleur principale
  // partout dans l'app, l'AMOLED passe le fond en noir pur sur les thèmes
  // sombres).
  const theme = useMemo<AppTheme>(() => {
    let t = baseTheme;

    if (amoled && t.isDark) {
      const solidCards = !t.colors.card.startsWith("rgba");
      t = {
        ...t,
        gradient: ["#000000", "#000000"] as const,
        colors: {
          ...t.colors,
          background: "#000000",
          ...(solidCards
            ? {
                card: "#0D0D10", cardBorder: "#1E1E24",
                muted: "#101014", border: "#17171C",
                input: "#101014", secondary: "#101014",
              }
            : {}),
        },
      };
    }

    if (accentId !== "auto") {
      const a = getAccent(accentId);
      if (a) {
        t = {
          ...t,
          colors: {
            ...t.colors,
            primary: a.c1,
            primaryForeground: "#FFFFFF",
            tint: a.c1,
            numColor: a.c1,
            secondaryForeground: a.c1,
            accent2: a.c2,
          },
        };
      }
    }

    return t;
  }, [baseTheme, amoled, accentId]);

  const setThemeId = useCallback((id: ThemeId | "system") => {
    setThemeIdState(id);
    AsyncStorage.setItem(THEME_KEY, id);
  }, []);

  const setAccentId = useCallback((id: AccentId) => {
    setAccentIdState(id);
    AsyncStorage.setItem(ACCENT_KEY, id);
  }, []);

  const setAmoled = useCallback((on: boolean) => {
    setAmoledState(on);
    AsyncStorage.setItem(AMOLED_KEY, on ? "1" : "0");
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

  return (
    <ThemeContext.Provider value={{
      theme, themeId, setThemeId,
      accentId, setAccentId,
      amoled, setAmoled,
      widgetShape, setWidgetShape,
      widgetLayout, setWidgetLayout,
      tabStyle, setTabStyle,
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
