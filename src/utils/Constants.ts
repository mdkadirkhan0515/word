/**
 * Src/utils/Constants.ts & src/utils/Constants.ts
 * Global Constants - No Hardcode, All Centralized
 */

export const APP_CONSTANTS = {
  APP_NAME: "Word Learning",
  VERSION: "1.0.0",
  BUILD_NUMBER: "100",

  // MMKV IDs
  MMKV_IDS: {
    WORD_PROGRESS: "word-progress-mmkv",
    CHAPTER_BOX: "chapter-box-mmkv",
    TTS_BRAIN: "tts-central-brain",
    DAILY_BANK: "daily-bank-mmkv",
    DYNAMIC_TARGET: "dynamic-target-mmkv",
    EVENTS: "chapter-events-mmkv",
  },

  // Database
  DB: {
    NAME: "word_learning.db",
    VERSION: 1,
    TABLES: {
      WORD_TABLE: "WordTable",
      CHAPTER_TABLE: "ChapterTable",
      DAILY_BANK: "DailyBank",
      MANIFESTO_TABLE: "ManifestoTable",
    },
  },

  // Progress
  PROGRESS: {
    MODES_COUNT: 5,
    WORDS_PER_CHAPTER: 20,
    TOTAL_KEYS_PER_CHAPTER: 100, // 20*5
    DEFAULT_GUARD: 50,
    EXECUTIVE_GUARD: 80,
    MIN_TARGET: 50,
    MAX_TARGET: 100,
  },

  // TTS
  TTS: {
    DEFAULT_RATE: 0.5,
    MIN_RATE: 0.1,
    MAX_RATE: 1.0,
    DEFAULT_GAP: 300,
    MIN_GAP: 0,
    MAX_GAP: 5000,
    CHAR_HIGHLIGHT_SPEED: 150, // ms per char
  },

  // Bank
  BANK: {
    CREDIT_PER_CARD: 1, // +1% per event card
    CREDIT_PER_STAGE: 5, // 5 cards * 1% = 5%
    TOTAL_DAILY_CREDIT: 20, // 4 stages * 5%
    UNLOCK_COST: 30, // -30% for chapter unlock
    DEFAULT_BALANCE: 0,
  },

  // Event Engine
  EVENT: {
    STAGES_COUNT: 4,
    STAGE_1_ACTIVE: 1,
    MAX_CARDS_PER_STAGE: 5,
  },

  // Dynamic Target
  DYNAMIC: {
    DAYS_WINDOW: 30,
    CACHE_EXPIRY_HOURS: 6,
    WEIGHTS: {
      CONSISTENCY: 0.4,
      VOLUME: 0.3,
      MOMENTUM: 0.2,
      PENALTY: 0.1,
    },
    IDEAL_VOLUME_PER_DAY: 15,
    PENALTY_PER_GAP_DAY: 0.08,
  },

  // UI
  UI: {
    CARD_OUTER_RADIUS: 16, // 12-16px perfect
    CARD_INNER_RADIUS: 12, // Outer - Padding
    CARD_PADDING: 16,
    CARD_GAP: 12, // Between cards 12-16px
    ICON_SIZE_STANDARD: 22,
    ICON_SIZE_DRAWER: 20,
    ICON_SIZE_HEADER: 24,
    PROGRESS_BADGE_SIZE: 16,
    SCREEN_MARGIN: 16,
  },

  // Theme
  THEME: {
    LIGHT: "light" as const,
    DARK: "dark" as const,
    SYSTEM: "system" as const,
  },

  // Language
  LANGUAGE: {
    BENGALI: "bengali" as const,
    ENGLISH: "english" as const,
    SYSTEM: "system" as const,
  },
} as const;

export const STORAGE_KEYS = {
  // TTS
  TTS_RESUME_POSITION: "tts_resume_position",
  TTS_CURRENT_STATE: "tts_current_state",
  ACTIVE_TTS_MODE: "active_tts_mode",
  TTS_BACKGROUND_ENABLED: "tts_background_enabled",
  TTS_RATE: "tts_speech_rate",
  TTS_GAP: "tts_time_gap",

  // Progress
  COMPLETED_EVENT_CARDS: "completed_event_cards",
  COMPLETED_EVENT_STAGES: "completed_event_stages",
  LAST_EVENT_RESET_DATE: "last_event_reset_date",

  // Bank
  DAILY_BANK_TOTAL: "daily_bank_total_balance",
  DAILY_BANK_TODAY: "daily_bank_today_earned",
  DAILY_BANK_LIFETIME_EARNED: "daily_bank_lifetime_earned",
  DAILY_BANK_LIFETIME_SPENT: "daily_bank_lifetime_spent",

  // Theme & Settings
  APP_THEME: "app_theme",
  APP_LANGUAGE: "app_language",
  APP_FONT_SIZE: "app_font_size",
} as const;

export default APP_CONSTANTS;
