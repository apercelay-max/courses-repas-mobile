import { useContext } from "react";
import { ThemeContext } from "@/context/ThemeContext";
import { THEMES } from "@/constants/themes";

/**
 * Returns the design tokens for the currently active theme.
 * Falls back to classicLight if ThemeContext is not available.
 */
export function useColors() {
  const ctx = useContext(ThemeContext);
  return ctx?.theme.colors ?? THEMES.classicLight.colors;
}
