/**
 * src/assets/icons/iconMap.ts
 * Zero Emoji Policy - Vector Icons Only
 * Uses react-native-vector-icons MaterialCommunityIcons
 * All 5 Modes + Drawer + Lock + Search + Percentage + Theme/Language Icons
 */

export const IconMap = {
  // 5 Modes - Core (No Emoji, Vector Only)
  modes: {
    m1: {
      name: "volume-high" as const, // Sound / Audio Mode 🔊 -> volume-high
      alternative: "headphones" as const,
      label: "Sound",
      description: "একক কার্ডের জন্য TTS ভয়েস আউটপুট",
      size: 22,
    },
    m2: {
      name: "play-circle-outline" as const, // Play / Auto Mode 1 ▶️ -> play-circle-outline
      alternative: "play" as const,
      label: "Play1",
      description: "অটো-প্লে সিকোয়েন্স স্বয়ংক্রিয় অ্যালগরিদম",
      size: 22,
    },
    m3: {
      name: "book-open-page-variant" as const, // Default / Text Mode 📖 -> book-open
      alternative: "text-box-outline" as const,
      label: "Default",
      description: "শান্ত রিডিং মোড, কোনো TTS নেই",
      size: 22,
    },
    m4: {
      name: "lightbulb-on-outline" as const, // Practice / Meaning Mode 😊 -> lightbulb
      alternative: "format-quote-close" as const,
      label: "Practice",
      description: "কন্টেন্টের বিশেষ নোট, অনুভূতি বা অর্থ",
      size: 22,
    },
    m5: {
      name: "play-speed" as const, // Loop / Auto Mode 2 🎯 -> play-speed
      alternative: "motion-play-outline" as const,
      label: "Play2",
      description: "দ্বিতীয় অটো-প্লে অ্যালগরিদম ধারাবাহিক রিডিং",
      size: 22,
    },
  },

  // Drawer Header Icons
  drawer: {
    leftFilter: {
      name: "tune-vertical" as const, // 5 modes version/activity
      alternative: "layers-triple-outline" as const,
      label: "Filter",
      size: 20,
    },
    rightEvent: {
      name: "calendar-check-outline" as const, // Daily Bank / Event Drawer
      alternative: "lightning-bolt-outline" as const,
      label: "Event",
      size: 20,
    },
  },

  // Lock & Unlock States (No Arrow, Lock Icon Only)
  lock: {
    locked: {
      name: "lock-outline" as const, // Locked Chapter/Stage
      size: 20,
      style: "outline" as const,
    },
    unlocked: {
      name: "lock-open-variant-outline" as const, // Unlocked - Primary Glow
      size: 20,
      style: "outline" as const,
    },
  },

  // Font Size Control
  fontSize: {
    decrease: {
      name: "format-font-size-decrease" as const,
      size: 24,
    },
    increase: {
      name: "format-font-size-increase" as const,
      size: 24,
    },
  },

  // Search Box
  search: {
    search: {
      name: "magnify" as const,
      size: 20,
    },
    clear: {
      name: "close-circle-outline" as const,
      size: 20,
    },
  },

  // Percentage / Progress
  progress: {
    percent: {
      name: "chart-donut-variant" as const, // Chapter progress badge
      alternative: "percent-outline" as const,
      size: 16,
    },
  },

  // Language & Theme Selection (Settings)
  settings: {
    language: {
      bengali: {
        name: "translate" as const, // বাংলা ভাষা নির্বাচন
        alternative: "alpha-b-box" as const,
        label: "Bengali (বাংলা)",
        size: 20,
      },
      english: {
        name: "earth" as const, // ইংরেজি ভাষা নির্বাচন
        alternative: "alpha-e-box" as const,
        label: "English",
        size: 20,
      },
      systemDefault: {
        name: "cellphone-cog" as const, // System Default
        alternative: "cog-sync-outline" as const,
        label: "System Default",
        size: 20,
      },
    },
    theme: {
      dark: {
        name: "weather-night" as const,
        label: "Dark Mode",
        size: 20,
      },
      light: {
        name: "weather-sunny" as const,
        label: "Light Mode",
        size: 20,
      },
      system: {
        name: "theme-light-dark" as const,
        label: "System Default",
        size: 20,
      },
    },
    // Manifesto Download List
    manifesto: {
      download: {
        name: "download-circle-outline" as const,
        size: 20,
      },
      delete: {
        name: "delete-circle-outline" as const,
        size: 20,
      },
      check: {
        name: "check-circle-outline" as const,
        size: 20,
      },
    },
    // TTS Controls
    tts: {
      play: {
        name: "play" as const,
        size: 20,
      },
      pause: {
        name: "pause" as const,
        size: 20,
      },
      stop: {
        name: "stop" as const,
        size: 20,
      },
    },
  },

  // Common Actions
  common: {
    close: {
      name: "close" as const,
      size: 22,
    },
    check: {
      name: "check" as const,
      size: 20,
    },
    chevronDown: {
      name: "chevron-down" as const,
      size: 20,
    },
    chevronUp: {
      name: "chevron-up" as const,
      size: 20,
    },
    dotsVertical: {
      name: "dots-vertical" as const,
      size: 20,
    },
  },
} as const;

// Type helpers
export type IconName = typeof IconMap.modes.m1.name;
export type ModeIconKey = keyof typeof IconMap.modes;
export type AllIcons = typeof IconMap;

// Utility: Get icon by mode number
export const getModeIcon = (mode: 1 | 2 | 3 | 4 | 5) => {
  const key = `m${mode}` as ModeIconKey;
  return IconMap.modes[key];
};

// Utility: Get icon name string for react-native-vector-icons
export const getModeIconName = (mode: 1 | 2 | 3 | 4 | 5): string => {
  return getModeIcon(mode).name;
};

// Golden Rules for Icon Usage (From Architecture)
export const IconUsageRules = {
  size: {
    standard: 22, // Card header layout perfect
    drawer: 20,
    header: 24,
    progressBadge: 16,
  },
  style: "outline" as const, // All icons Outline/Thin category for dark/light balance
  rule1:
    "Arrow বর্জন: Action বোঝাতে Arrow এর বদলে নির্দিষ্ট ক্রিয়ার Icon (Play, Filter, Setting, Tune) ব্যবহার",
  rule2:
    "Outline Style: সকল Icon Outline বা Thin Category (e.g., lock-outline) - Dark & Light উভয় Mode এ Balance",
  rule3:
    "Sizing: সাধারণ Drawer & Card Icon 20-22px, Font/Header Icon 24px Standard",
} as const;

export default IconMap;
