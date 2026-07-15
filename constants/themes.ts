export type ThemeId =
  | "classicLight"
  | "classicDark"
  | "ppl"
  | "aube"
  | "soleil"
  | "ocean"
  | "foret"
  | "crepuscule"
  | "nuit"
  | "lavande"
  | "menthe"
  | "neon"
  | "corail"
  | "chrome"
  | "diamant";

export type AppThemeColors = {
  text: string;
  mutedForeground: string;
  background: string;
  card: string;
  cardBorder: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  border: string;
  input: string;
  tint: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  destructive: string;
  destructiveForeground: string;
  frigo: string;
  placard: string;
  congelateur: string;
  radius: number;
  /** Color for the large stat numbers — changes per theme like Not Boring Weather */
  numColor: string;
  /** Optional shadow color for 3D depth effect on cards */
  cardShadow?: string;
  /** Optional glow color (neon themes) */
  numGlow?: string;
  /** Deuxième couleur d'accent (dégradés) — surchargée par la couleur d'accent choisie */
  accent2?: string;
};

export type AppTheme = {
  id: ThemeId;
  name: string;
  emoji: string;
  gradient: readonly [string, string] | readonly [string, string, string];
  gradientStart?: { x: number; y: number };
  gradientEnd?: { x: number; y: number };
  isDark: boolean;
  is3D?: boolean;
  colors: AppThemeColors;
};

const RADIUS = 12;

export const THEMES: Record<ThemeId, AppTheme> = {
  classicLight: {
    id: "classicLight",
    name: "Classique clair",
    emoji: "☀️",
    gradient: ["#F8F9FA", "#FFFFFF"],
    isDark: false,
    colors: {
      text: "#111827", mutedForeground: "#6B7280",
      background: "#F8F9FA", card: "#FFFFFF", cardBorder: "#E5E7EB",
      primary: "#3B5BDB", primaryForeground: "#FFFFFF",
      secondary: "#EEF2FF", secondaryForeground: "#3B5BDB",
      muted: "#F3F4F6", border: "#E5E7EB", input: "#E5E7EB",
      tint: "#3B5BDB", success: "#22C55E", successLight: "#DCFCE7",
      warning: "#F59E0B", warningLight: "#FEF3C7",
      destructive: "#EF4444", destructiveForeground: "#FFFFFF",
      frigo: "#3B82F6", placard: "#8B5CF6", congelateur: "#06B6D4",
      radius: RADIUS, numColor: "#111827",
    },
  },

  classicDark: {
    id: "classicDark",
    name: "Classique sombre",
    emoji: "🌙",
    gradient: ["#0F172A", "#1E293B"],
    isDark: true,
    colors: {
      text: "#F9FAFB", mutedForeground: "#94A3B8",
      background: "#0F172A", card: "#1E293B", cardBorder: "#334155",
      primary: "#818CF8", primaryForeground: "#FFFFFF",
      secondary: "#1E293B", secondaryForeground: "#818CF8",
      muted: "#1E293B", border: "#334155", input: "#334155",
      tint: "#818CF8", success: "#4ADE80", successLight: "#14532D",
      warning: "#FCD34D", warningLight: "#451A03",
      destructive: "#F87171", destructiveForeground: "#FFFFFF",
      frigo: "#60A5FA", placard: "#A78BFA", congelateur: "#22D3EE",
      radius: RADIUS, numColor: "#818CF8",
    },
  },

  ppl: {
    id: "ppl",
    name: "PPL",
    emoji: "💪",
    gradient: ["#0D0D0F", "#161216", "#0D0D0F"],
    isDark: true,
    colors: {
      text: "#FFFFFF", mutedForeground: "#9A9AA5",
      background: "#0D0D0F", card: "#161618", cardBorder: "#242428",
      primary: "#E03030", primaryForeground: "#FFFFFF",
      secondary: "#1C1C1F", secondaryForeground: "#E03030",
      muted: "#18181B", border: "#1C1C1F", input: "#1C1C1F",
      tint: "#E03030", success: "#4CAF50", successLight: "rgba(76,175,80,0.15)",
      warning: "#E8A020", warningLight: "rgba(232,160,32,0.15)",
      destructive: "#E05050", destructiveForeground: "#FFFFFF",
      frigo: "#45A8F5", placard: "#9B27AF", congelateur: "#67E8F9",
      radius: RADIUS, numColor: "#E03030",
      accent2: "#9B27AF",
    },
  },

  aube: {
    id: "aube",
    name: "Aube",
    emoji: "🌅",
    gradient: ["#FF9A9E", "#FAD0C4", "#FFE9D0"],
    isDark: false,
    colors: {
      text: "#3D0C11", mutedForeground: "#8B4251",
      background: "#FF9A9E", card: "rgba(255,255,255,0.72)", cardBorder: "rgba(255,255,255,0.5)",
      primary: "#C0294A", primaryForeground: "#FFFFFF",
      secondary: "rgba(255,255,255,0.4)", secondaryForeground: "#C0294A",
      muted: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.45)", input: "rgba(255,255,255,0.4)",
      tint: "#C0294A", success: "#1E7E34", successLight: "rgba(220,252,231,0.8)",
      warning: "#D97706", warningLight: "rgba(254,243,199,0.8)",
      destructive: "#B91C1C", destructiveForeground: "#FFFFFF",
      frigo: "#2563EB", placard: "#7C3AED", congelateur: "#0891B2",
      radius: RADIUS, numColor: "#C0294A",
    },
  },

  soleil: {
    id: "soleil",
    name: "Soleil",
    emoji: "🌞",
    gradient: ["#F7971E", "#FFD200"],
    isDark: false,
    colors: {
      text: "#3D2000", mutedForeground: "#7A4A00",
      background: "#F7971E", card: "rgba(255,255,255,0.70)", cardBorder: "rgba(255,255,255,0.55)",
      primary: "#C05C00", primaryForeground: "#FFFFFF",
      secondary: "rgba(255,255,255,0.4)", secondaryForeground: "#C05C00",
      muted: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.45)", input: "rgba(255,255,255,0.4)",
      tint: "#C05C00", success: "#15803D", successLight: "rgba(220,252,231,0.8)",
      warning: "#B45309", warningLight: "rgba(254,243,199,0.7)",
      destructive: "#B91C1C", destructiveForeground: "#FFFFFF",
      frigo: "#1D4ED8", placard: "#6D28D9", congelateur: "#0E7490",
      radius: RADIUS, numColor: "#C05C00",
    },
  },

  ocean: {
    id: "ocean",
    name: "Océan",
    emoji: "🌊",
    gradient: ["#0A2342", "#126872", "#1A9DAA"],
    isDark: true,
    colors: {
      text: "#FFFFFF", mutedForeground: "rgba(255,255,255,0.65)",
      background: "#0A2342", card: "rgba(255,255,255,0.10)", cardBorder: "rgba(255,255,255,0.15)",
      primary: "#67E8F9", primaryForeground: "#0A2342",
      secondary: "rgba(255,255,255,0.08)", secondaryForeground: "#67E8F9",
      muted: "rgba(255,255,255,0.10)", border: "rgba(255,255,255,0.15)", input: "rgba(255,255,255,0.10)",
      tint: "#67E8F9", success: "#4ADE80", successLight: "rgba(74,222,128,0.15)",
      warning: "#FCD34D", warningLight: "rgba(252,211,77,0.15)",
      destructive: "#F87171", destructiveForeground: "#FFFFFF",
      frigo: "#93C5FD", placard: "#C4B5FD", congelateur: "#67E8F9",
      radius: RADIUS, numColor: "#67E8F9",
    },
  },

  foret: {
    id: "foret",
    name: "Forêt",
    emoji: "🌲",
    gradient: ["#0B3D2E", "#1A6B4A", "#2D9A6B"],
    isDark: true,
    colors: {
      text: "#FFFFFF", mutedForeground: "rgba(255,255,255,0.65)",
      background: "#0B3D2E", card: "rgba(255,255,255,0.10)", cardBorder: "rgba(255,255,255,0.15)",
      primary: "#86EFAC", primaryForeground: "#0B3D2E",
      secondary: "rgba(255,255,255,0.08)", secondaryForeground: "#86EFAC",
      muted: "rgba(255,255,255,0.10)", border: "rgba(255,255,255,0.15)", input: "rgba(255,255,255,0.10)",
      tint: "#86EFAC", success: "#86EFAC", successLight: "rgba(134,239,172,0.15)",
      warning: "#FCD34D", warningLight: "rgba(252,211,77,0.15)",
      destructive: "#FCA5A5", destructiveForeground: "#0B3D2E",
      frigo: "#93C5FD", placard: "#C4B5FD", congelateur: "#67E8F9",
      radius: RADIUS, numColor: "#86EFAC",
    },
  },

  crepuscule: {
    id: "crepuscule",
    name: "Crépuscule",
    emoji: "🌇",
    gradient: ["#614385", "#A0526B", "#F4A261"],
    isDark: true,
    colors: {
      text: "#FFFFFF", mutedForeground: "rgba(255,255,255,0.70)",
      background: "#614385", card: "rgba(255,255,255,0.12)", cardBorder: "rgba(255,255,255,0.18)",
      primary: "#FED7AA", primaryForeground: "#614385",
      secondary: "rgba(255,255,255,0.08)", secondaryForeground: "#FED7AA",
      muted: "rgba(255,255,255,0.10)", border: "rgba(255,255,255,0.18)", input: "rgba(255,255,255,0.10)",
      tint: "#FED7AA", success: "#86EFAC", successLight: "rgba(134,239,172,0.15)",
      warning: "#FCD34D", warningLight: "rgba(252,211,77,0.15)",
      destructive: "#FCA5A5", destructiveForeground: "#614385",
      frigo: "#93C5FD", placard: "#E9D5FF", congelateur: "#A5F3FC",
      radius: RADIUS, numColor: "#FED7AA",
    },
  },

  nuit: {
    id: "nuit",
    name: "Nuit",
    emoji: "🌃",
    gradient: ["#0F0C29", "#302B63", "#24243E"],
    isDark: true,
    colors: {
      text: "#FFFFFF", mutedForeground: "rgba(255,255,255,0.55)",
      background: "#0F0C29", card: "rgba(255,255,255,0.07)", cardBorder: "rgba(255,255,255,0.10)",
      primary: "#A5B4FC", primaryForeground: "#0F0C29",
      secondary: "rgba(255,255,255,0.06)", secondaryForeground: "#A5B4FC",
      muted: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.10)", input: "rgba(255,255,255,0.07)",
      tint: "#A5B4FC", success: "#86EFAC", successLight: "rgba(134,239,172,0.12)",
      warning: "#FDE68A", warningLight: "rgba(253,230,138,0.12)",
      destructive: "#FCA5A5", destructiveForeground: "#0F0C29",
      frigo: "#93C5FD", placard: "#C4B5FD", congelateur: "#67E8F9",
      radius: RADIUS, numColor: "#A5B4FC",
    },
  },

  lavande: {
    id: "lavande",
    name: "Lavande",
    emoji: "💜",
    gradient: ["#9D50BB", "#6E48AA", "#C9B8F5"],
    isDark: true,
    colors: {
      text: "#FFFFFF", mutedForeground: "rgba(255,255,255,0.70)",
      background: "#9D50BB", card: "rgba(255,255,255,0.12)", cardBorder: "rgba(255,255,255,0.20)",
      primary: "#E9D5FF", primaryForeground: "#6E48AA",
      secondary: "rgba(255,255,255,0.10)", secondaryForeground: "#E9D5FF",
      muted: "rgba(255,255,255,0.10)", border: "rgba(255,255,255,0.18)", input: "rgba(255,255,255,0.10)",
      tint: "#E9D5FF", success: "#86EFAC", successLight: "rgba(134,239,172,0.15)",
      warning: "#FDE68A", warningLight: "rgba(253,230,138,0.15)",
      destructive: "#FCA5A5", destructiveForeground: "#6E48AA",
      frigo: "#BAE6FD", placard: "#E9D5FF", congelateur: "#A5F3FC",
      radius: RADIUS, numColor: "#E9D5FF",
    },
  },

  menthe: {
    id: "menthe",
    name: "Menthe",
    emoji: "🍃",
    gradient: ["#11998E", "#38EF7D"],
    isDark: false,
    colors: {
      text: "#0A2E28", mutedForeground: "#155B4E",
      background: "#11998E", card: "rgba(255,255,255,0.72)", cardBorder: "rgba(255,255,255,0.55)",
      primary: "#059669", primaryForeground: "#FFFFFF",
      secondary: "rgba(255,255,255,0.4)", secondaryForeground: "#059669",
      muted: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.5)", input: "rgba(255,255,255,0.4)",
      tint: "#059669", success: "#065F46", successLight: "rgba(220,252,231,0.8)",
      warning: "#92400E", warningLight: "rgba(254,243,199,0.8)",
      destructive: "#991B1B", destructiveForeground: "#FFFFFF",
      frigo: "#1D4ED8", placard: "#6D28D9", congelateur: "#0E7490",
      radius: RADIUS, numColor: "#059669",
    },
  },

  // ── Nouveaux thèmes ──────────────────────────────────────────────────────────

  neon: {
    id: "neon",
    name: "Néon",
    emoji: "⚡",
    gradient: ["#0D0D0D", "#1A0030", "#0D0D0D"],
    isDark: true,
    colors: {
      text: "#FFFFFF", mutedForeground: "rgba(255,255,255,0.55)",
      background: "#0D0D0D", card: "rgba(255,255,255,0.05)", cardBorder: "rgba(57,255,20,0.30)",
      primary: "#39FF14", primaryForeground: "#0D0D0D",
      secondary: "rgba(57,255,20,0.08)", secondaryForeground: "#39FF14",
      muted: "rgba(255,255,255,0.06)", border: "rgba(57,255,20,0.25)", input: "rgba(57,255,20,0.08)",
      tint: "#39FF14", success: "#39FF14", successLight: "rgba(57,255,20,0.12)",
      warning: "#FFD600", warningLight: "rgba(255,214,0,0.12)",
      destructive: "#FF2079", destructiveForeground: "#FFFFFF",
      frigo: "#00E5FF", placard: "#D400FF", congelateur: "#00E5FF",
      radius: RADIUS,
      numColor: "#39FF14",
      numGlow: "#39FF14",
      cardShadow: "#39FF14",
    },
  },

  corail: {
    id: "corail",
    name: "Corail",
    emoji: "🪸",
    gradient: ["#FF6B6B", "#FF8E53", "#FFB347"],
    isDark: false,
    colors: {
      text: "#2D0A00", mutedForeground: "#7A2E10",
      background: "#FF6B6B", card: "rgba(255,255,255,0.75)", cardBorder: "rgba(255,255,255,0.6)",
      primary: "#C0392B", primaryForeground: "#FFFFFF",
      secondary: "rgba(255,255,255,0.4)", secondaryForeground: "#C0392B",
      muted: "rgba(255,255,255,0.42)", border: "rgba(255,255,255,0.5)", input: "rgba(255,255,255,0.42)",
      tint: "#C0392B", success: "#1A5C38", successLight: "rgba(220,252,231,0.8)",
      warning: "#9A3412", warningLight: "rgba(254,243,199,0.8)",
      destructive: "#7F1D1D", destructiveForeground: "#FFFFFF",
      frigo: "#1D4ED8", placard: "#6D28D9", congelateur: "#0E7490",
      radius: RADIUS, numColor: "#C0392B",
      cardShadow: "rgba(192,57,43,0.20)",
    },
  },

  chrome: {
    id: "chrome",
    name: "Chrome 3D",
    emoji: "🔩",
    gradient: ["#BDC3C7", "#95A5A6", "#D5D8DC"],
    isDark: false,
    is3D: true,
    colors: {
      text: "#1A1A2E", mutedForeground: "#4A5568",
      background: "#BDC3C7", card: "rgba(255,255,255,0.82)", cardBorder: "rgba(255,255,255,0.9)",
      primary: "#2C3E50", primaryForeground: "#FFFFFF",
      secondary: "rgba(255,255,255,0.5)", secondaryForeground: "#2C3E50",
      muted: "rgba(255,255,255,0.5)", border: "rgba(255,255,255,0.7)", input: "rgba(255,255,255,0.5)",
      tint: "#2C3E50", success: "#1E8449", successLight: "rgba(220,252,231,0.85)",
      warning: "#B7770D", warningLight: "rgba(254,243,199,0.85)",
      destructive: "#922B21", destructiveForeground: "#FFFFFF",
      frigo: "#154360", placard: "#4A235A", congelateur: "#0E6655",
      radius: RADIUS, numColor: "#1A1A2E",
      cardShadow: "rgba(44,62,80,0.35)",
    },
  },

  diamant: {
    id: "diamant",
    name: "Diamant 3D",
    emoji: "💎",
    gradient: ["#0B0C10", "#1F2833", "#0B0C10"],
    isDark: true,
    is3D: true,
    colors: {
      text: "#C5C6C7", mutedForeground: "rgba(197,198,199,0.65)",
      background: "#0B0C10", card: "rgba(31,40,51,0.90)", cardBorder: "rgba(102,252,241,0.25)",
      primary: "#66FCF1", primaryForeground: "#0B0C10",
      secondary: "rgba(102,252,241,0.08)", secondaryForeground: "#66FCF1",
      muted: "rgba(255,255,255,0.06)", border: "rgba(102,252,241,0.20)", input: "rgba(102,252,241,0.08)",
      tint: "#66FCF1", success: "#66FCF1", successLight: "rgba(102,252,241,0.12)",
      warning: "#FFE066", warningLight: "rgba(255,224,102,0.12)",
      destructive: "#FF4C60", destructiveForeground: "#FFFFFF",
      frigo: "#45A8F5", placard: "#B794F4", congelateur: "#66FCF1",
      radius: RADIUS, numColor: "#66FCF1",
      numGlow: "#66FCF1",
      cardShadow: "rgba(102,252,241,0.20)",
    },
  },
};

export const THEME_LIST: AppTheme[] = Object.values(THEMES);
export const DEFAULT_THEME_ID: ThemeId = "classicLight";
