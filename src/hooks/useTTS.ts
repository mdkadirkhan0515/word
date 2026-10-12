/**
 * src/hooks/useTTS.ts
 * Production-ready Hook for TTS Control with MMKV Central Brain
 * Implements: m1/m4 Card Tap, m2/m5 Empty Space Control, Auto Gap 300ms, Background Audio
 * No Emoji, No Hardcode Theme, Zero Loss Mechanics
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import TTSController, {
  TTSMode,
  TTSState,
  ResumePosition,
} from "../services/TTSEngine/TTSController";
import HighlightingEngine, {
  HighlightState,
  ThemeColors,
} from "../services/TTSEngine/HighlightingEngine";
import { ttsMMKV, TTS_KEYS } from "../services/TTSEngine/TTSController";

export interface UseTTSOptions {
  word_id: number;
  fullText: string;
  mode: TTSMode;
  theme?: Partial<ThemeColors>;
  autoPlayGapMs?: number; // Default 300ms as per architecture
  onComplete?: (word_id: number) => void; // For MMKV progress + view_id logic
  onProgress?: (charIndex: number) => void;
}

export interface UseTTSReturn {
  // State
  ttsState: TTSState;
  highlightState: HighlightState;
  isPlaying: boolean;
  isPaused: boolean;
  currentCharIndex: number;
  resumePosition: ResumePosition | null;

  // Controls for m1 & m4 (Sound & Emoji)
  handleCardPress: () => Promise<void>; // Card Tap = Play/Stop

  // Controls for m2 & m5 (Play Modes - Empty Space Control)
  handleEmptySpacePress: () => Promise<void>; // Empty Area 20% Top/Bottom = Pause/Resume

  // Global Controls
  stop: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;

  // Styles (No Hardcode Theme)
  getCardStyle: (isActive: boolean) => any;
  getTextStyle: (isHighlighted: boolean) => any;
  highlightedSegments: Array<{ text: string; highlighted: boolean }>;
}

export const useTTS = (options: UseTTSOptions): UseTTSReturn => {
  const {
    word_id,
    fullText,
    mode,
    theme,
    autoPlayGapMs = 300,
    onComplete,
    onProgress,
  } = options;

  const [ttsState, setTtsState] = useState<TTSState>("STOPPED");
  const [highlightState, setHighlightState] = useState<HighlightState>({
    isHighlighted: false,
    word_id: null,
    startChar: 0,
    endChar: 0,
    mode: null,
  });
  const [currentCharIndex, setCurrentCharIndex] = useState<number>(0);
  const [resumePosition, setResumePosition] = useState<ResumePosition | null>(
    null
  );

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const gapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Initialize ---
  useEffect(() => {
    TTSController.initialize();
    if (theme) {
      HighlightingEngine.setTheme(theme);
    }

    // Load existing resume position
    const pos = TTSController.getResumePosition();
    if (pos && pos.word_id === word_id) {
      setResumePosition(pos);
      setCurrentCharIndex(pos.char_index);
    }

    // Subscribe to MMKV state changes (for cross-mode sync)
    const interval = setInterval(() => {
      const state = TTSController.getState() as TTSState;
      setTtsState(state);

      const savedPos = TTSController.getResumePosition();
      if (savedPos && savedPos.word_id === word_id) {
        setResumePosition(savedPos);
      }
    }, 200); // Polling for MMKV sync (MMKV has no built-in listener in JS, but super fast)

    // Subscribe to highlighting
    const unsubscribeHighlight = HighlightingEngine.subscribe((state) => {
      if (state.word_id === word_id || state.word_id === null) {
        setHighlightState(state);
      }
    });

    // AppState listener for Background Audio Logic
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // Came back to foreground
      } else if (nextAppState.match(/inactive|background/)) {
        // Going to background
        const bgEnabled = TTSController.isBackgroundEnabled();
        const activeMode = TTSController.getActiveMode();
        if (!bgEnabled || (activeMode !== "m2" && activeMode !== "m5")) {
          // If not m2/m5 or background disabled, stop
          TTSController.onNavigationExit();
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      clearInterval(interval);
      unsubscribeHighlight();
      subscription.remove();
      if (gapTimeoutRef.current) {
        clearTimeout(gapTimeoutRef.current);
      }
    };
  }, [word_id, theme]);

  // --- Derived ---
  const isPlaying = ttsState === "PLAYING";
  const isPaused = ttsState === "PAUSED";

  const highlightedSegments = HighlightingEngine.getHighlightedSegments(
    fullText,
    highlightState
  );

  // --- m1 & m4 Logic: Card Press = Play/Stop ---
  const handleCardPress = useCallback(async () => {
    const currentMode = TTSController.getActiveMode();
    const currentState = TTSController.getState();

    // If same card is playing, stop it
    if (currentState === "PLAYING" && currentMode === mode) {
      const pos = TTSController.getResumePosition();
      if (pos && pos.word_id === word_id) {
        // Pause and save char position
        await TTSController.pause(word_id, currentCharIndex);
        HighlightingEngine.endHighlight();
        setTtsState("PAUSED");
      } else {
        await TTSController.stopImmediately("MANUAL_STOP");
        HighlightingEngine.endHighlight();
      }
      return;
    }

    // If paused on same word, resume
    if (
      currentState === "PAUSED" &&
      resumePosition &&
      resumePosition.word_id === word_id
    ) {
      await TTSController.resume(fullText, word_id);
      HighlightingEngine.startHighlight(
        word_id,
        resumePosition.char_index,
        resumePosition.char_index + 10,
        mode
      );
      return;
    }

    // Conflict: Auto (m2/m5) running, manual (m1/m4) interrupt
    if (
      currentState === "PLAYING" &&
      (currentMode === "m2" || currentMode === "m5")
    ) {
      await TTSController.handleManualInterruptDuringAuto();
    }

    // Start new playback
    TTSController.setActiveMode(mode);
    HighlightingEngine.startHighlight(
      word_id,
      currentCharIndex,
      currentCharIndex + 5,
      mode
    );
    await TTSController.play(fullText, word_id, mode);

    // MMKV Progress Tracking for view_id Logic (m1>0 etc)
    // This is handled outside, but we trigger onComplete callback on finish via polling
  }, [word_id, fullText, mode, currentCharIndex, resumePosition]);

  // --- m2 & m5 Logic: Empty Space Press = Pause/Resume ---
  const handleEmptySpacePress = useCallback(async () => {
    // Only for m2 & m5
    if (mode !== "m2" && mode !== "m5") {
      return;
    }

    const state = TTSController.getState();

    if (state === "PLAYING") {
      // Pause
      await TTSController.pause(word_id, currentCharIndex);
      HighlightingEngine.endHighlight();
      setTtsState("PAUSED");
    } else if (state === "PAUSED") {
      // Resume from same point
      await TTSController.resume(fullText, word_id);
      setTtsState("PLAYING");
    } else {
      // If stopped, start
      await handleCardPress();
    }
  }, [mode, word_id, currentCharIndex, fullText, handleCardPress]);

  const stop = useCallback(async () => {
    await TTSController.stopImmediately("MANUAL_STOP");
    HighlightingEngine.endHighlight();
    setTtsState("STOPPED");
  }, []);

  const pause = useCallback(async () => {
    await TTSController.pause(word_id, currentCharIndex);
    setTtsState("PAUSED");
  }, [word_id, currentCharIndex]);

  const resume = useCallback(async () => {
    await TTSController.resume(fullText, word_id);
    setTtsState("PLAYING");
  }, [word_id, fullText]);

  // --- Auto-Play Gap Logic for m2/m5 Sequence ---
  useEffect(() => {
    // When TTS finishes, if in m2/m5 auto mode, wait gap then trigger next
    if (
      ttsState === "STOPPED" &&
      highlightState.word_id === word_id &&
      highlightState.isHighlighted === false
    ) {
      const wasPlaying = resumePosition !== null || currentCharIndex > 0;
      if (wasPlaying && (mode === "m2" || mode === "m5")) {
        // Auto sequence: wait 300ms gap as per architecture
        gapTimeoutRef.current = setTimeout(() => {
          onComplete?.(word_id);
        }, autoPlayGapMs);
      }
    }
  }, [
    ttsState,
    word_id,
    mode,
    autoPlayGapMs,
    onComplete,
    highlightState,
    resumePosition,
    currentCharIndex,
  ]);

  // --- Style Getters (No Hardcode) ---
  const getCardStyle = useCallback(
    (isActive: boolean) => {
      return HighlightingEngine.getCardContainerStyle(
        isActive,
        highlightState.isHighlighted && highlightState.word_id === word_id
      );
    },
    [highlightState]
  );

  const getTextStyle = useCallback((isHighlighted: boolean) => {
    return HighlightingEngine.getHighlightedTextStyle(isHighlighted);
  }, []);

  return {
    ttsState,
    highlightState,
    isPlaying,
    isPaused,
    currentCharIndex,
    resumePosition,
    handleCardPress,
    handleEmptySpacePress,
    stop,
    pause,
    resume,
    getCardStyle,
    getTextStyle,
    highlightedSegments,
  };
};

export default useTTS;
