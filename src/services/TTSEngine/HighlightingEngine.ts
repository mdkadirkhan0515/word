/**
 * src/services/TTSEngine/HighlightingEngine.ts
 * TTS UI Highlighting - Yellow + Primary Color Dynamic Glow
 * No Hardcode Theme, Border Glow, Real-time Highlight
 * Dependencies: @react-native-material/core theme context
 */

import { StyleSheet, TextStyle, ViewStyle } from "react-native";

// --- Theme Interface (No Hardcode) ---
export interface ThemeColors {
  primary: string;
  primaryLight: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  highlightYellow: string; // Dynamic from theme, fallback #FFEB3B
  highlightPrimaryGlow: string; // Primary with opacity
}

export interface HighlightState {
  isHighlighted: boolean;
  word_id: number | null;
  startChar: number;
  endChar: number;
  mode: "m1" | "m2" | "m3" | "m4" | "m5" | null;
}

// Default fallback (Will be overridden by theme context)
const FALLBACK_THEME: ThemeColors = {
  primary: "#6750A4",
  primaryLight: "#E8DEF8",
  background: "#FFFBFE",
  surface: "#FFFFFF",
  text: "#1C1B1F",
  textSecondary: "#49454F",
  border: "#E7E0EC",
  highlightYellow: "#FFEB3B",
  highlightPrimaryGlow: "rgba(103, 80, 164, 0.15)",
};

class HighlightingEngineSingleton {
  private static instance: HighlightingEngineSingleton;
  private theme: ThemeColors = FALLBACK_THEME;
  private listeners: Array<(state: HighlightState) => void> = [];
  private currentState: HighlightState = {
    isHighlighted: false,
    word_id: null,
    startChar: 0,
    endChar: 0,
    mode: null,
  };

  private constructor() {}

  static getInstance(): HighlightingEngineSingleton {
    if (!HighlightingEngineSingleton.instance) {
      HighlightingEngineSingleton.instance = new HighlightingEngineSingleton();
    }
    return HighlightingEngineSingleton.instance;
  }

  /**
   * Update theme dynamically (No Hardcode Theme)
   * Called from ThemeContext or Material Core provider
   */
  setTheme(theme: Partial<ThemeColors>): void {
    this.theme = { ...this.theme, ...theme };
  }

  getTheme(): ThemeColors {
    return this.theme;
  }

  /**
   * Subscribe to highlight state changes
   */
  subscribe(listener: (state: HighlightState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.currentState));
  }

  /**
   * Start Highlighting - Called when TTS starts reading a segment
   */
  startHighlight(
    word_id: number,
    startChar: number,
    endChar: number,
    mode: HighlightState["mode"]
  ): void {
    this.currentState = {
      isHighlighted: true,
      word_id,
      startChar,
      endChar,
      mode,
    };
    this.notify();
  }

  /**
   * Update Highlight during TTS Progress (Real-time)
   */
  updateHighlight(word_id: number, currentChar: number, length: number): void {
    this.currentState = {
      ...this.currentState,
      word_id,
      startChar: currentChar,
      endChar: currentChar + length,
      isHighlighted: true,
    };
    this.notify();
  }

  /**
   * End Highlighting - Auto revert to normal when TTS finishes
   */
  endHighlight(): void {
    this.currentState = {
      isHighlighted: false,
      word_id: null,
      startChar: 0,
      endChar: 0,
      mode: null,
    };
    this.notify();
  }

  /**
   * Get Card Container Style with Border Glow (Dynamic Height, Fixed Width)
   * Implements: Border Radius 12-16px, overflow hidden, dynamic glow
   */
  getCardContainerStyle(isActive: boolean, isHighlighted: boolean): ViewStyle {
    const outerRadius = 16; // As per Architecture: 12-16px perfect

    return {
      borderRadius: outerRadius,
      overflow: "hidden", // Smooth Corners for Android
      backgroundColor: this.theme.surface,
      borderWidth: isHighlighted ? 1.5 : 1,
      borderColor: isHighlighted ? this.theme.primary : this.theme.border,
      // Visual Depth with Primary Shade
      shadowColor: isHighlighted ? this.theme.primary : "#000",
      shadowOffset: { width: 0, height: isHighlighted ? 4 : 2 },
      shadowOpacity: isHighlighted ? 0.15 : 0.06,
      shadowRadius: isHighlighted ? 8 : 4,
      elevation: isHighlighted ? 6 : 2,
      // Card Spacing Architecture
      marginVertical: 6, // Half of 12px gap
      marginHorizontal: 16, // Fixed margin for responsive width
      padding: 16, // Inner breathing space
    } as ViewStyle;
  }

  /**
   * Get Highlighted Text Style - Yellow + Primary Adjusted
   */
  getHighlightedTextStyle(isHighlightedWord: boolean): TextStyle {
    if (!isHighlightedWord) {
      return {
        color: this.theme.text,
        backgroundColor: "transparent",
      };
    }

    return {
      color: this.theme.text,
      backgroundColor: this.theme.highlightYellow, // Yellow highlight
      borderRadius: 4, // Inner radius = outer - padding logic
      paddingHorizontal: 2,
      // Primary glow effect via text shadow
      textShadowColor: this.theme.highlightPrimaryGlow,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 8,
    } as TextStyle;
  }

  /**
   * Get Inner Element Radius (Inner vs Outer Radius Rule)
   * Inner Radius = Outer Radius - Padding
   */
  getInnerRadius(outerRadius: number = 16, padding: number = 16): number {
    return Math.max(4, outerRadius - padding / 2); // Minimum 4px
  }

  /**
   * Render Text with Highlighting - Utility to split text
   * Used in ModeCard component
   */
  getHighlightedSegments(
    fullText: string,
    highlightState: HighlightState
  ): Array<{ text: string; highlighted: boolean }> {
    if (!highlightState.isHighlighted || highlightState.word_id === null) {
      return [{ text: fullText, highlighted: false }];
    }

    const { startChar, endChar } = highlightState;

    if (startChar >= fullText.length) {
      return [{ text: fullText, highlighted: false }];
    }

    const safeEnd = Math.min(endChar, fullText.length);

    return [
      { text: fullText.substring(0, startChar), highlighted: false },
      { text: fullText.substring(startChar, safeEnd), highlighted: true },
      { text: fullText.substring(safeEnd), highlighted: false },
    ].filter((seg) => seg.text.length > 0);
  }

  /**
   * Get Progress Indicator Style for Active TTS
   */
  getProgressBarStyle(progress: number): ViewStyle {
    return {
      height: 3,
      backgroundColor: this.theme.primary,
      width: `${Math.min(100, Math.max(0, progress))}%`,
      borderRadius: 1.5,
    } as ViewStyle;
  }
}

export const HighlightingEngine = HighlightingEngineSingleton.getInstance();
export default HighlightingEngine;

// --- Stylesheet Factory (No Hardcode, Theme Aware) ---
export const createHighlightStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    cardContainer: {
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      marginVertical: 6,
      marginHorizontal: 16,
      padding: 16,
    },
    cardHighlighted: {
      borderColor: theme.primary,
      borderWidth: 1.5,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    textNormal: {
      color: theme.text,
      fontSize: 16,
      lineHeight: 24,
    },
    textHighlighted: {
      color: theme.text,
      backgroundColor: theme.highlightYellow,
      borderRadius: 4,
      textShadowColor: theme.highlightPrimaryGlow,
      textShadowRadius: 8,
    },
    innerButton: {
      borderRadius: 12, // Inner = Outer - Padding (16 - 4)
      overflow: "hidden",
    },
  });
