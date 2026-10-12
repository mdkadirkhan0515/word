/**
 * src/types/settings.types.ts
 * Settings Types - TTS Control, Manifesto, Theme, Language, Control Panels
 */

export type ThemeMode = "light" | "dark" | "system";
export type LanguageMode = "bengali" | "english" | "system";

export interface TTSSettings {
  speechRate: number; // 0.1 - 1.0
  timeGap: number; // ms, e.g., 300
  backgroundEnabled: boolean;
}

export interface ManifestoSettings {
  downloadedChapters: number[]; // chapter_ids
  totalManifestItems: number;
}

export interface ControlPanel1Filter {
  chapterName: string;
  start: number | null;
  end: number | null;
}

export interface ControlPanel1Filters {
  mode_1: ControlPanel1Filter;
  mode_3: ControlPanel1Filter;
  mode_4: ControlPanel1Filter;
}

export interface PlayModeFilters {
  parallel: boolean; // ক্রমিক স্বাভাবিক
  random: boolean; // রেন্ডম
  singleRepeat: boolean;
  singleRepeatChapter: string;
  singleRepeatNumber: number | null;
  cardToCardRepeat: boolean;
  cardToCardChapter: string;
  cardToCardStart: number | null;
  cardToCardEnd: number | null;
  backgroundAudio: boolean; // Separate below repeats
}

export interface ControlPanel2Filters {
  play_mode_2: PlayModeFilters; // m2 independent
  play_mode_5: PlayModeFilters; // m5 independent
}

export interface AppearanceSettings {
  theme: ThemeMode;
  language: LanguageMode;
  customPrimaryColor?: string;
  fontSize: number; // 12-24, default 16
}

export interface AllSettings {
  tts: TTSSettings;
  manifesto: ManifestoSettings;
  controlPanel1: ControlPanel1Filters;
  controlPanel2: ControlPanel2Filters;
  appearance: AppearanceSettings;
}

export interface SettingsRowProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
}

export interface ThemeOption {
  mode: ThemeMode;
  icon: string;
  label: string;
}

export interface LanguageOption {
  mode: LanguageMode;
  icon: string;
  label: string;
  subLabel: string;
}

// MMKV Keys for Settings
export const SETTINGS_MMKV_KEYS = {
  APP_THEME: "app_theme",
  APP_LANGUAGE: "app_language",
  FONT_SIZE: "app_font_size",
  PRIMARY_COLOR: "app_primary_color",
  TTS_RATE: "tts_speech_rate",
  TTS_GAP: "tts_time_gap",
  TTS_BACKGROUND: "tts_background_enabled",
  FILTER_MODE_1: "filter_mode_1",
  FILTER_MODE_3: "filter_mode_3",
  FILTER_MODE_4: "filter_mode_4",
  PLAY_FILTER_MODE_2: "play_filter_mode_2",
  PLAY_FILTER_MODE_5: "play_filter_mode_5",
  MANIFESTO_DOWNLOADED: "manifesto_downloaded_chapters",
} as const;

export type SettingsMMKVKey =
  (typeof SETTINGS_MMKV_KEYS)[keyof typeof SETTINGS_MMKV_KEYS];
