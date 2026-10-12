/**
 * src/types/tts.types.ts
 * TTS Engine Types - Global Stop, Character-Level Resume, Background Audio
 */

export type TTSMode = "m1" | "m2" | "m3" | "m4" | "m5";
export type TTSState = "PLAYING" | "PAUSED" | "STOPPED";
export type TTSStopReason =
  | "NAVIGATION_EXIT"
  | "MODE_SWITCH"
  | "USER_STOP"
  | "COMPLETION"
  | "ERROR"
  | "APP_BACKGROUND";

export interface TTSResumePosition {
  word_id: number;
  char_index: number;
}

export interface TTSControllerState {
  resumePosition: TTSResumePosition | null;
  currentState: TTSState;
  activeMode: TTSMode | null;
  backgroundEnabled: boolean;
  currentWordId: number | null;
  speechRate: number;
  timeGap: number;
}

export interface TTSSegment {
  text: string;
  highlighted: boolean;
}

export interface HighlightedSegments {
  segments: TTSSegment[];
}

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  highlightYellow: string;
  highlightPrimaryGlow: string;
}

export interface HighlightingResult {
  segments: { text: string; highlighted: boolean }[];
  isHighlighted: boolean;
  start: number;
  end: number;
}

export interface TTSControlCallbacks {
  onProgress?: (word_id: number, char_index: number) => void;
  onComplete?: (word_id: number) => void;
  onError?: (error: any) => void;
}

export interface UseTTSOptions {
  word_id: number;
  fullText: string;
  mode: TTSMode;
  theme?: Partial<ThemeColors>;
  autoPlayGapMs?: number;
  onProgress?: (word_id: number, char_index: number) => void;
  onComplete?: (word_id: number) => void;
}

export interface UseTTSReturn {
  isPlaying: boolean;
  isPaused: boolean;
  ttsState: TTSState;
  currentWordId: number | null;
  highlightedSegments: { text: string; highlighted: boolean }[];
  handleCardPress: () => Promise<void>;
  handleEmptySpacePress: () => Promise<void>;
  playFromPosition: (word_id: number, char_index: number) => Promise<void>;
  getCardStyle: (isActive?: boolean) => any;
  getTextStyle: (isHighlighted?: boolean) => any;
  getCardContainerStyle: (isHighlighted?: boolean) => any;
}

export const TTS_MMKV_KEYS = {
  RESUME_POSITION: "tts_resume_position",
  CURRENT_STATE: "tts_current_state",
  ACTIVE_MODE: "active_tts_mode",
  BACKGROUND_ENABLED: "tts_background_enabled",
  CURRENT_WORD_ID: "tts_current_word_id",
  LAST_CHAR_INDEX: "tts_last_char_index",
  TTS_RATE: "tts_speech_rate",
  TTS_GAP: "tts_time_gap",
} as const;
