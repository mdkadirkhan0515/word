/**
 * src/theme/typography.ts
 * Typography System - Professional, Clean, Minimalist
 * No Emoji, Vector Icons Only, Dynamic Theme Aware
 * Supports Bengali & English with proper line height
 */

import { TextStyle } from "react-native";

export const FontFamily = {
  // Bengali Support
  bengali: {
    regular: "NotoSansBengali-Regular",
    medium: "NotoSansBengali-Medium",
    bold: "NotoSansBengali-Bold",
  },
  // English
  english: {
    regular: "Inter-Regular",
    medium: "Inter-Medium",
    bold: "Inter-Bold",
    // Fallback system
    systemRegular: "System",
    systemMedium: "System",
  },
} as const;

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16, // Default card text
  lg: 18,
  xl: 20,
  xxl: 22, // Icon size standard 22-24px
  xxxl: 24,
  displaySm: 28,
  displayMd: 32,
  displayLg: 36,
} as const;

export const LineHeight = {
  xs: 14,
  sm: 16,
  md: 20,
  base: 24, // base 16px * 1.5 = 24 for Bengali readability
  lg: 28,
  xl: 32,
  xxl: 36,
} as const;

export const FontWeight = {
  regular: "400" as TextStyle["fontWeight"],
  medium: "500" as TextStyle["fontWeight"],
  semiBold: "600" as TextStyle["fontWeight"],
  bold: "700" as TextStyle["fontWeight"],
} as const;

// Text Styles - Production Ready

export const Typography = {
  // Headers
  h1: {
    fontSize: FontSize.displayMd,
    lineHeight: LineHeight.xxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  } as TextStyle,

  h2: {
    fontSize: FontSize.xxl,
    lineHeight: LineHeight.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  } as TextStyle,

  h3: {
    fontSize: FontSize.xl,
    lineHeight: LineHeight.lg,
    fontWeight: FontWeight.semiBold,
  } as TextStyle,

  // Body
  bodyLarge: {
    fontSize: FontSize.lg,
    lineHeight: LineHeight.lg,
    fontWeight: FontWeight.regular,
  } as TextStyle,

  bodyBase: {
    fontSize: FontSize.base, // 16px default
    lineHeight: LineHeight.base, // 24px
    fontWeight: FontWeight.regular,
  } as TextStyle,

  bodySmall: {
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
    fontWeight: FontWeight.regular,
  } as TextStyle,

  bodyXS: {
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    fontWeight: FontWeight.regular,
  } as TextStyle,

  // Labels & Badges
  labelLarge: {
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.1,
  } as TextStyle,

  labelSmall: {
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.5,
  } as TextStyle,

  // For Event Card [+1%] badge
  badge: {
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.3,
  } as TextStyle,

  // For Drawer Progress
  progress: {
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    fontWeight: FontWeight.semiBold,
  } as TextStyle,

  // Settings
  settingsRow: {
    fontSize: FontSize.base,
    lineHeight: LineHeight.base,
    fontWeight: FontWeight.regular,
  } as TextStyle,

  settingsHeader: {
    fontSize: FontSize.lg,
    lineHeight: LineHeight.lg,
    fontWeight: FontWeight.semiBold,
  } as TextStyle,
} as const;

// Bengali Specific Adjustments (Noto Sans Bengali needs more line height)
export const BengaliTypography = {
  bodyBase: {
    ...Typography.bodyBase,
    lineHeight: 28, // More for Bengali conjuncts
    fontFamily: FontFamily.bengali.regular,
  } as TextStyle,

  bodyLarge: {
    ...Typography.bodyLarge,
    lineHeight: 32,
    fontFamily: FontFamily.bengali.regular,
  } as TextStyle,

  h2: {
    ...Typography.h2,
    lineHeight: 32,
    fontFamily: FontFamily.bengali.bold,
  } as TextStyle,
} as const;

// Font Size Control (From Settings - format-font-size-decrease/increase)
export const FontSizeControl = {
  min: 12,
  max: 24,
  default: 16,
  step: 1,

  icons: {
    decrease: "format-font-size-decrease" as const, // Vector icon
    increase: "format-font-size-increase" as const,
    size: 24, // Header icon size
  },

  // Get scaled typography based on user font size preference
  getScaled: (baseSize: number, userScale: number = 16): TextStyle => {
    const scaleFactor = userScale / FontSizeControl.default;
    return {
      fontSize: Math.round(baseSize * scaleFactor),
      lineHeight: Math.round(baseSize * scaleFactor * 1.5),
    } as TextStyle;
  },
} as const;

// TTS Highlight Text Style Factory (Dynamic)
export const getHighlightTextStyle = (
  isHighlighted: boolean,
  colors: {
    text: string;
    highlightYellow: string;
    highlightPrimaryGlow: string;
  }
): TextStyle => {
  if (!isHighlighted) {
    return {
      color: colors.text,
      backgroundColor: "transparent",
    } as TextStyle;
  }

  return {
    color: colors.text,
    backgroundColor: colors.highlightYellow,
    borderRadius: 4,
    paddingHorizontal: 2,
    textShadowColor: colors.highlightPrimaryGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  } as TextStyle;
};

export default {
  FontFamily,
  FontSize,
  LineHeight,
  FontWeight,
  Typography,
  BengaliTypography,
  FontSizeControl,
  getHighlightTextStyle,
};
