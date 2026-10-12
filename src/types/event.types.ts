/**
 * src/types/event.types.ts
 * Event Engine Types - 4-Stage Weakness Analyzer, Mapping Pipeline, Daily Bank
 */

export type StageNumber = 1 | 2 | 3 | 4;
export type ModeNumber = 1 | 2 | 3 | 4 | 5;

export interface WeaknessStageGroups {
  m1: number[]; // word_ids where mode 1 missing
  m2: number[];
  m3: number[];
  m4: number[];
  m5: number[];
}

export interface WeaknessStage {
  stage: StageNumber;
  title: string;
  description: string;
  creditPercent: number; // 5% per stage
  groups: WeaknessStageGroups;
  totalUniqueWords: number;
  totalCards: number;
  isLocked: boolean;
  unlockRequirement: string;
}

export interface FullWeaknessAnalysis {
  stage1_1ModeLeft: WeaknessStage; // ACTIVE
  stage2_2ModesLeft: WeaknessStage; // LOCKED initially
  stage3_3ModesLeft: WeaknessStage;
  stage4_4ModesLeft: WeaknessStage;
  overallStats: {
    totalWords: number;
    completedWords: number;
    averageModesCompleted: number;
    mostNeglectedMode: ModeNumber;
  };
}

export interface EnrichedDisplayData {
  wordId: number;
  displayWordId: number;
  chapterId: number;
  chapterName: string;
  viewId: number;
  content?: string | null;
}

export interface EventCard {
  id: string; // stage1_m1_chapter
  stage: StageNumber;
  mode: ModeNumber;
  modeIcon: string; // volume-high, play-circle-outline etc (No Emoji)
  title: string; // "অপরিচিতা #৩৫, #৭৮, #৮৮, #৮৯"
  displayIds: number[];
  wordIds: number[];
  enriched: EnrichedDisplayData[];
  creditPercent: number; // +1%
  isCompleted: boolean;
  chapterName: string;
}

export interface DailyEventPipelineResult {
  stage1Cards: EventCard[];
  stage2Cards: EventCard[];
  stage3Cards: EventCard[];
  stage4Cards: EventCard[];
  allCards: EventCard[];
  totalCreditAvailable: number; // 20%
  totalUniqueWords: number;
}

export interface DailyEventState {
  bankBalance: number; // e.g., 490%
  todayEarned: number; // e.g., 20%
  stages: {
    stage1: {
      isLocked: boolean;
      cards: EventCard[];
      completedCount: number;
      totalCount: number;
      creditEarned: number;
    };
    stage2: {
      isLocked: boolean;
      cards: EventCard[];
      completedCount: number;
      totalCount: number;
      creditEarned: number;
    };
    stage3: {
      isLocked: boolean;
      cards: EventCard[];
      completedCount: number;
      totalCount: number;
      creditEarned: number;
    };
    stage4: {
      isLocked: boolean;
      cards: EventCard[];
      completedCount: number;
      totalCount: number;
      creditEarned: number;
    };
  };
  totalCreditAvailable: number;
  totalCreditEarnedToday: number;
  isAllCompleted: boolean;
}

export interface BankBalance {
  totalBalance: number; // 490%
  todayEarned: number; // +20%
  lifetimeEarned: number;
  lifetimeSpent: number;
  lastUpdated: string; // YYYY-MM-DD
}

export interface ThirtyDaysMetrics {
  totalActiveDays: number;
  consistencyRate: number; // 0-1
  last7ActiveRate: number;
  prev23ActiveRate: number;
  momentum: number;
  maxGap: number;
  penaltyFactor: number;
  avgVolumePerDay: number;
  volumeScore: number;
  rawScore: number;
  finalTarget: number; // 50-100
}

export interface DynamicTargetResult {
  chapterId: number;
  targetPercentage: number;
  metrics: ThirtyDaysMetrics;
  calculatedAt: number;
  isFromCache: boolean;
}

export interface AndroidLoginData {
  thirtyDaysActivity: number[]; // [1,0,1,1...]
  dailyCompletedCounts: number[]; // [5,12,0,8...]
  lastLoginTimestamp: number;
  streakDays: number;
}
