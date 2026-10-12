/**
 * src/theme/colors.ts
 * No Hardcode Theme - Dynamic Theme System
 * Supports Dark, Light, System Default + Dynamic Primary Color
 * Used by HighlightingEngine, Cards, Drawer
 */

export interface AppColors {
  // Core
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryContainer: string;
  onPrimary: string;

  // Background & Surface
  background: string;
  surface: string;
  surfaceVariant: string;
  onBackground: string;
  onSurface: string;
  onSurfaceVariant: string;

  // Text
  text: string;
  textSecondary: string;
  textDisabled: string;

  // Border & Divider
  border: string;
  borderLight: string;
  divider: string;

  // States
  success: string;
  successLight: string;
  error: string;
  errorLight: string;
  warning: string;
  warningLight: string;

  // Highlighting (TTS)
  highlightYellow: string;
  highlightPrimaryGlow: string;
  highlightBackground: string;

  // Drawer & Bank
  greenProgress: string; // #4CAF50 for 80% bar
  greenLight: string;
  bankGold: string;

  // Neutral
  neutralGray: string;
  neutralLightGray: string;
}

export interface AppTheme {
  colors: AppColors;
  isDark: boolean;
  name: "light" | "dark" | "system";
}

// Light Theme - Clean & Minimalist
export const lightColors: AppColors = {
  // Primary - Dynamic, can be changed from Settings
  primary: "#6750A4", // Material 3 Primary
  primaryLight: "#E8DEF8",
  primaryDark: "#4F378B",
  primaryContainer: "#EADDFF",
  onPrimary: "#FFFFFF",

  // Background
  background: "#FFFBFE",
  surface: "#FFFFFF",
  surfaceVariant: "#E7E0EC",
  onBackground: "#1C1B1F",
  onSurface: "#1C1B1F",
  onSurfaceVariant: "#49454F",

  text: "#1C1B1F",
  textSecondary: "#49454F",
  textDisabled: "#79747E",

  border: "#E7E0EC",
  borderLight: "#F3EDF7",
  divider: "#E7E0EC",

  success: "#2E7D32",
  successLight: "#E8F5E9",
  error: "#BA1A1A",
  errorLight: "#FFDAD6",
  warning: "#F57F17",
  warningLight: "#FFF8E1",

  highlightYellow: "#FFEB3B", // TTS Highlight
  highlightPrimaryGlow: "rgba(103, 80, 164, 0.15)",
  highlightBackground: "#FFF9C4",

  greenProgress: "#4CAF50", // Drawer Green Fill
  greenLight: "#E8F5E9",
  bankGold: "#FFC107",

  neutralGray: "#888888", // Idle icon color
  neutralLightGray: "#E0E0E0",
};

// Dark Theme - Premium Dark
export const darkColors: AppColors = {
  primary: "#D0BCFF",
  primaryLight: "#4F378B",
  primaryDark: "#EADDFF",
  primaryContainer: "#4F378B",
  onPrimary: "#381E72",

  background: "#1C1B1F",
  surface: "#2B2930",
  surfaceVariant: "#49454F",
  onBackground: "#E6E0E9",
  onSurface: "#E6E0E9",
  onSurfaceVariant: "#CAC4D0",

  text: "#E6E0E9",
  textSecondary: "#CAC4D0",
  textDisabled: "#938F99",

  border: "#49454F",
  borderLight: "#36343B",
  divider: "#49454F",

  success: "#81C784",
  successLight: "#1B5E20",
  error: "#FFB4AB",
  errorLight: "#680003",
  warning: "#FFB74D",
  warningLight: "#E65100",

  highlightYellow: "#F9A825", // Dark mode yellow adjusted
  highlightPrimaryGlow: "rgba(208, 188, 255, 0.2)",
  highlightBackground: "#5D4037",

  greenProgress: "#81C784",
  greenLight: "#2E7D32",
  bankGold: "#FFD54F",

  neutralGray: "#938F99",
  neutralLightGray: "#36343B",
};

export const lightTheme: AppTheme = {
  colors: lightColors,
  isDark: false,
  name: "light",
};

export const darkTheme: AppTheme = {
  colors: darkColors,
  isDark: true,
  name: "dark",
};

// Dynamic Primary Color Generator (From Settings)
export const generateDynamicColors = (
  primaryHex: string,
  isDark: boolean
): AppColors => {
  const base = isDark ? darkColors : lightColors;

  // Generate light/dark variants from primary
  // Simple: Use primary as is, light = primary + 80% white, dark = primary + 40% black
  const primaryLight = adjustColor(primaryHex, 0.8, isDark ? -0.3 : 0.7);
  const primaryDark = adjustColor(primaryHex, 0.6, isDark ? 0.3 : -0.3);

  return {
    ...base,
    primary: primaryHex,
    primaryLight,
    primaryDark,
    highlightPrimaryGlow: `${primaryHex}26`, // 15% opacity
  };
};

// Helper: Lighten/Darken hex color
function adjustColor(hex: string, mix: number, lighten: number): string {
  // Simple hex lighten/darken - for production use tinycolor2
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const adjust = (c: number) => {
      if (lighten > 0) {
        return Math.round(c + (255 - c) * lighten * mix);
      } else {
        return Math.round(c * (1 + lighten * mix));
      }
    };

    const toHex = (c: number) => {
      const clamped = Math.max(0, Math.min(255, c));
      return clamped.toString(16).padStart(2, "0");
    };

    return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
  } catch {
    return hex;
  }
}

// Theme Selector (No Hardcode - Dynamic from MMKV)
export const getTheme = (
  themeName: "light" | "dark" | "system",
  systemIsDark: boolean = false,
  customPrimary?: string
): AppTheme => {
  let isDark = false;
  let name: "light" | "dark" | "system" = themeName;

  if (themeName === "system") {
    isDark = systemIsDark;
  } else {
    isDark = themeName === "dark";
  }

  const baseTheme = isDark ? darkTheme : lightTheme;

  if (customPrimary) {
    return {
      ...baseTheme,
      colors: generateDynamicColors(customPrimary, isDark),
      name,
      isDark,
    };
  }

  return {
    ...baseTheme,
    name,
    isDark,
  };
};

// For HighlightingEngine compatibility
export const getHighlightColors = (theme: AppTheme) => ({
  primary: theme.colors.primary,
  primaryLight: theme.colors.primaryLight,
  background: theme.colors.background,
  surface: theme.colors.surface,
  text: theme.colors.text,
  textSecondary: theme.colors.textSecondary,
  border: theme.colors.border,
  highlightYellow: theme.colors.highlightYellow,
  highlightPrimaryGlow: theme.colors.highlightPrimaryGlow,
});

export default {
  lightColors,
  darkColors,
  lightTheme,
  darkTheme,
  getTheme,
  generateDynamicColors,
  getHighlightColors,
};
