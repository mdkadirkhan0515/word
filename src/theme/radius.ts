/**
 * src/theme/radius.ts
 * Border Radius & Shape Harmony - Card Layout Architecture
 * Rules:
 * - Outer Radius: 12-16px perfect for modern look
 * - Inner Radius = Outer Radius - Padding
 * - Smooth Corners: overflow: 'hidden' for Android
 */

import { ViewStyle } from "react-native";

export const Radius = {
  // Core Radius Scale
  none: 0,
  xs: 4,
  sm: 8,
  md: 12, // Inner elements
  lg: 16, // Outer card perfect (12-16px from architecture)
  xl: 20,
  xxl: 24,
  full: 9999, // Circular

  // Semantic Radius
  card: {
    outer: 16, // Main card outer radius - 12-16px perfect
    inner: 12, // Inner button/input = outer - padding (16 - 4)
    small: 12, // Small card
  },

  button: {
    small: 8,
    medium: 12,
    large: 16,
    pill: 9999,
  },

  input: {
    default: 12, // Inner vs Outer Rule: Card 16 - Padding 4 = 12
  },

  // Highlight
  highlight: {
    text: 4, // Yellow highlight text background
    progressBar: 1.5,
  },
} as const;

export const Spacing = {
  // Padding (Inner breathing space)
  padding: {
    xs: 4,
    sm: 8,
    md: 16, // Card inner padding 16px as per architecture
    lg: 20,
    xl: 24,
  },

  // Margin/Gap (Between cards)
  gap: {
    xs: 4,
    sm: 8,
    md: 12, // Between cards 12-16px
    lg: 16, // Between cards max
    xl: 20,
  },

  // Screen Margins
  screen: {
    horizontal: 16, // Fixed margin for responsive width
    vertical: 6, // Half of 12px gap
  },
} as const;

export const CardLayout = {
  // Dynamic Height & Fixed Width Architecture
  width: {
    fixedMargin: 16, // Left/right fixed margin
    responsive: "100%" as const, // Width = Screen - 2*16
  },

  height: {
    fixed: undefined, // Never fixed - Unlimited expand
    unlimited: true, // Content amount -> expand downward
  },

  // Visual Depth
  border: {
    width: 1, // Thin 1px border
    widthHighlighted: 1.5, // When TTS playing
    opacity: 0.01, // 1-2% light opacity primary shade for dark bg
  },

  // Shadow
  shadow: {
    default: {
      offset: { width: 0, height: 2 },
      opacity: 0.06,
      radius: 4,
      elevation: 2,
    },
    highlighted: {
      offset: { width: 0, height: 4 },
      opacity: 0.15,
      radius: 8,
      elevation: 6,
    },
  },
} as const;

// Style Factories

/**
 * Get Card Container Style - Implements all layout rules
 */
export const getCardContainerStyle = (
  isHighlighted: boolean,
  colors: { surface: string; border: string; primary: string }
): ViewStyle => {
  return {
    borderRadius: Radius.card.outer, // 16px
    overflow: "hidden", // Smooth Corners for Android
    backgroundColor: colors.surface,
    borderWidth: isHighlighted
      ? CardLayout.border.widthHighlighted
      : CardLayout.border.width,
    borderColor: isHighlighted ? colors.primary : colors.border,
    // Visual Depth
    shadowColor: isHighlighted ? colors.primary : "#000",
    shadowOffset: isHighlighted
      ? CardLayout.shadow.highlighted.offset
      : CardLayout.shadow.default.offset,
    shadowOpacity: isHighlighted
      ? CardLayout.shadow.highlighted.opacity
      : CardLayout.shadow.default.opacity,
    shadowRadius: isHighlighted
      ? CardLayout.shadow.highlighted.radius
      : CardLayout.shadow.default.radius,
    elevation: isHighlighted
      ? CardLayout.shadow.highlighted.elevation
      : CardLayout.shadow.default.elevation,
    // Spacing
    marginVertical: Spacing.screen.vertical, // 6px = half of 12px gap
    marginHorizontal: Spacing.screen.horizontal, // 16px
    padding: Spacing.padding.md, // 16px inner
  } as ViewStyle;
};

/**
 * Get Inner Element Radius - Inner = Outer - Padding Rule
 */
export const getInnerRadius = (
  outerRadius: number = Radius.card.outer,
  padding: number = Spacing.padding.md
): number => {
  return Math.max(Radius.xs, outerRadius - padding / 2); // Minimum 4px
};

/**
 * Get Inner Button Style
 */
export const getInnerButtonStyle = (
  outerRadius: number = Radius.card.outer
): ViewStyle => {
  return {
    borderRadius: getInnerRadius(outerRadius, Spacing.padding.md), // 12px
    overflow: "hidden",
  } as ViewStyle;
};

// Screen Layout Proportions (From TTS Architecture)
export const ScreenLayout = {
  // 100% screen divided as per TTS UI Layout Architecture
  topHeaderAndSubHeader: 0.4, // 40% top
  coreContentArea: 0.2, // 20% middle - dynamic cards
  bottomAndFooterPadding: 0.2, // 20% bottom for security/space
  emptyArea: 0.2, // Remaining 20% empty for m2/m5 control

  // For m2 & m5: Empty spaces 20% top + 20% bottom are controllers
  m2m5Controller: {
    topEmpty: 0.2, // Top 20% empty area = Pause/Resume control
    bottomEmpty: 0.2, // Bottom 20% empty = Pause/Resume
    middleContent: 0.2, // Middle 20% = Core content
  },
} as const;

export default {
  Radius,
  Spacing,
  CardLayout,
  ScreenLayout,
  getCardContainerStyle,
  getInnerRadius,
  getInnerButtonStyle,
};
