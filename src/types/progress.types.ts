/**
 * src/types/progress.types.ts
 * Progress Engine Types - Single Loop 20*5=100, Chapter Box Encapsulation, Two Guards
 */

import { ModeNumber } from "../storage/keys/WordProgressKey";

export type Mode = 1 | 2 | 3 | 4 | 5;
export type ModeNumberType = Mode;

export interface WordModeProgress {
  word_id: number;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  m5: number;
  isCompleted: boolean;
  completedModesCount: number; // 0-5
}

export interface PerModeResult {
  mode1: number; // 0-100%
  mode2: number;
  mode3: number;
  mode4: number;
  mode5: number;
  totalCompletedWords: number;
  totalWords: number;
  totalProgressPercent: number; // view_id=1 percentage
  perModeCompleted: {
    m1Done: number;
    m2Done: number;
    m3Done: number;
    m4Done: number;
    m5Done: number;
  };
}

export interface ChapterBox {
  chapter_id: number;
  mode1: number;
  mode2: number;
  mode3: number;
  mode4: number;
  mode5: number;
  totalCompletedWords: number;
  totalWords: number;
  totalProgressPercent: number; // For Drawer Green Bar
  lastUpdated: number;
}

export type ChapterBoxProgress = ChapterBox;

// Guard Types

export interface GuardResult {
  passed: boolean;
  completedPercent: number;
  requiredPercent: number; // 50
  message: string;
  canUseBank: boolean;
  needsBankCredit: number;
  bankBalance: number;
}

export interface ChapterUnlockStatus {
  chapter_id: number;
  chapter_name: string;
  total: number;
  completed: number;
  completedPercent: number;
  targetPercent: number; // 80 or dynamic
  is50GuardPassed: boolean;
  is80ManagerPassed: boolean;
  isUnlocked: boolean;
  needsBankCredit: number;
  canUseBank: boolean;
}

export interface ExecutiveResult {
  isUnlocked: boolean;
  unlockType: "natural" | "bank" | "locked";
  completedPercent: number;
  targetPercent: number;
  needsBankCredit: number;
  canUseBank: boolean;
  bankBalance: number;
  message: string;
  celebrationMessage?: string; // "চমৎকার! ৮০% পূরণ হয়েছে"
}

export interface RangeFilter {
  chapterName: string;
  start: number | null;
  end: number | null;
}

export interface PlayModeFilters {
  parallel: boolean;
  random: boolean;
  singleRepeat: boolean;
  singleRepeatChapter: string;
  singleRepeatNumber: number | null;
  cardToCardRepeat: boolean;
  cardToCardChapter: string;
  cardToCardStart: number | null;
  cardToCardEnd: number | null;
  backgroundAudio: boolean;
}
