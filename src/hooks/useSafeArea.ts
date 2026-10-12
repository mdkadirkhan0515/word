/**
 * Src/hooks/useSafeArea.ts & src/hooks/useSafeArea.ts
 * Safe Area Hook - Wrapper with 40/20/20 Layout Support
 */

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo } from "react";
import { Spacing } from "../theme/radius";

export interface SafeAreaStyle {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
}

export const useSafeArea = () => {
  const insets = useSafeAreaInsets();

  const safeStyle: SafeAreaStyle = useMemo(
    () => ({
      paddingTop: Math.max(insets.top, Spacing.padding.sm),
      paddingBottom: Math.max(insets.bottom, Spacing.padding.sm),
      paddingLeft: Math.max(insets.left, Spacing.screen.horizontal),
      paddingRight: Math.max(insets.right, Spacing.screen.horizontal),
    }),
    [insets]
  );

  // Layout Proportions for TTS (40/20/20)
  const layout = useMemo(
    () => ({
      topHeaderHeight: "12%" as const, // Compact version of 40% conceptual
      coreContentMinHeight: 80,
      bottomPaddingHeight: 120, // 20% security space
      emptyControlHeight: 60, // 20% empty for m2/m5 pause/resume
      screenHorizontalMargin: Spacing.screen.horizontal,
      cardVerticalMargin: Spacing.screen.vertical,
    }),
    []
  );

  return {
    insets,
    safeStyle,
    layout,
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
  };
};

export default useSafeArea;
