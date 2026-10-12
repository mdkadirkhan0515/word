/**
 * src/services/EventEngine/WeaknessAnalyzer.ts
 * 4-Stage Weakness Analyzer - Most Neglected Words Detection
 * Stage 1: 1 Mode Left (4 done, easiest)
 * Stage 2: 2 Modes Left (3 done, medium)
 * Stage 3: 3 Modes Left (2 done, deep study)
 * Stage 4: 4 Modes Left (1 done, weakness remover)
 * Input: 20*5=100 MMKV Keys, Output: 4 Stages grouped by missing modes
 */

import WordProgressKey, {
  ModeNumber,
} from "../../storage/keys/WordProgressKey";
import { dailyBankMMKV } from "../../storage/MMKVInstance";

export type StageNumber = 1 | 2 | 3 | 4;

export interface WeaknessStage {
  stage: StageNumber;
  title: string;
  description: string;
  creditPercent: number; // 5% per stage
  groups: {
    m1: number[]; // word_ids where mode 1 is missing
    m2: number[];
    m3: number[];
    m4: number[];
    m5: number[];
  };
  totalUniqueWords: number;
  totalCards: number; // Sum of all missing slots
  isLocked: boolean;
  unlockRequirement: string;
}

export interface FullWeaknessAnalysis {
  stage1_1ModeLeft: WeaknessStage; // ACTIVE - Easiest
  stage2_2ModesLeft: WeaknessStage; // LOCKED initially
  stage3_3ModesLeft: WeaknessStage; // LOCKED
  stage4_4ModesLeft: WeaknessStage; // LOCKED - Weakest
  overallStats: {
    totalWords: number;
    completedWords: number;
    averageModesCompleted: number;
    mostNeglectedMode: ModeNumber;
  };
}

class WeaknessAnalyzerSingleton {
  /**
   * Core: Analyze wordIds (e.g., Chapter 5's 20 words) into 4 stages
   */
  analyze(
    wordIds: number[],
    completedStages: StageNumber[] = [1]
  ): FullWeaknessAnalysis {
    if (!wordIds || wordIds.length === 0) {
      return this.getEmptyAnalysis();
    }

    const stage1 = {
      m1: [] as number[],
      m2: [] as number[],
      m3: [] as number[],
      m4: [] as number[],
      m5: [] as number[],
    };
    const stage2 = {
      m1: [] as number[],
      m2: [] as number[],
      m3: [] as number[],
      m4: [] as number[],
      m5: [] as number[],
    };
    const stage3 = {
      m1: [] as number[],
      m2: [] as number[],
      m3: [] as number[],
      m4: [] as number[],
      m5: [] as number[],
    };
    const stage4 = {
      m1: [] as number[],
      m2: [] as number[],
      m3: [] as number[],
      m4: [] as number[],
      m5: [] as number[],
    };

    let totalCompleted = 0;
    const modeCompletionCount = { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0 };

    for (const wordId of wordIds) {
      const progress = WordProgressKey.getWordProgress(wordId);

      if (progress.isCompleted) {
        totalCompleted++;
        // Count for stats
        Object.keys(modeCompletionCount).forEach((key) => {
          const mode = key as keyof typeof modeCompletionCount;
          modeCompletionCount[mode]++;
        });
        continue;
      }

      const missing: ModeNumber[] = [];
      if (progress.m1 === 0) {
        missing.push(1);
      } else {
        modeCompletionCount.m1++;
      }
      if (progress.m2 === 0) {
        missing.push(2);
      } else {
        modeCompletionCount.m2++;
      }
      if (progress.m3 === 0) {
        missing.push(3);
      } else {
        modeCompletionCount.m3++;
      }
      if (progress.m4 === 0) {
        missing.push(4);
      } else {
        modeCompletionCount.m4++;
      }
      if (progress.m5 === 0) {
        missing.push(5);
      } else {
        modeCompletionCount.m5++;
      }

      const missingCount = missing.length;

      if (missingCount === 0) {
        totalCompleted++;
      } else if (missingCount === 1) {
        // Stage 1: 1 Mode Left - 4 modes done, easiest
        missing.forEach((m) =>
          stage1[`m${m}` as keyof typeof stage1].push(wordId)
        );
      } else if (missingCount === 2) {
        // Stage 2: 2 Modes Left - 3 done
        missing.forEach((m) =>
          stage2[`m${m}` as keyof typeof stage2].push(wordId)
        );
      } else if (missingCount === 3) {
        // Stage 3: 3 Modes Left - 2 done
        missing.forEach((m) =>
          stage3[`m${m}` as keyof typeof stage3].push(wordId)
        );
      } else if (missingCount === 4) {
        // Stage 4: 4 Modes Left - 1 done, most neglected
        missing.forEach((m) =>
          stage4[`m${m}` as keyof typeof stage4].push(wordId)
        );
      } else if (missingCount === 5) {
        // All 5 missing - also Stage 4 (never touched)
        missing.forEach((m) =>
          stage4[`m${m}` as keyof typeof stage4].push(wordId)
        );
      }
    }

    // Find most neglected mode
    let mostNeglected: ModeNumber = 1;
    let minCount = modeCompletionCount.m1;
    (
      Object.entries(modeCompletionCount) as Array<
        [keyof typeof modeCompletionCount, number]
      >
    ).forEach(([key, count]) => {
      if (count < minCount) {
        minCount = count;
        mostNeglected = Number(key.replace("m", "")) as ModeNumber;
      }
    });

    const totalWords = wordIds.length;
    const avgModesCompleted =
      totalWords > 0
        ? Object.values(modeCompletionCount).reduce((a, b) => a + b, 0) /
          totalWords
        : 0;

    const createStage = (
      stageNum: StageNumber,
      groups: typeof stage1,
      isLocked: boolean
    ): WeaknessStage => {
      const unique = new Set([
        ...groups.m1,
        ...groups.m2,
        ...groups.m3,
        ...groups.m4,
        ...groups.m5,
      ]);
      const totalCards =
        groups.m1.length +
        groups.m2.length +
        groups.m3.length +
        groups.m4.length +
        groups.m5.length;

      const titles = {
        1: "পর্যায় ১ (ACTIVE) — ৫%",
        2: "পর্যায় ২ (LOCKED) — ৫%",
        3: "পর্যায় ৩ (LOCKED) — ৫%",
        4: "পর্যায় ৪ (LOCKED) — ৫%",
      };

      const descs = {
        1: "সবচেয়ে সহজ - ১টি Mode বাকি",
        2: "মাঝারি - ২টি Mode বাকি (পর্যায় ১ শেষ করুন)",
        3: "গভীর পড়া - ৩টি Mode বাকি",
        4: "দুর্বলতা দূরীকরণ - ৪টি Mode বাকি",
      };

      return {
        stage: stageNum,
        title: titles[stageNum],
        description: descs[stageNum],
        creditPercent: 5,
        groups,
        totalUniqueWords: unique.size,
        totalCards,
        isLocked,
        unlockRequirement:
          stageNum === 1
            ? "Unlocked"
            : `পর্যায় ${stageNum - 1} এর সকল টাস্ক সম্পন্ন করুন`,
      };
    };

    const isStage2Locked =
      !completedStages.includes(1) ||
      stage1.m1.length +
        stage1.m2.length +
        stage1.m3.length +
        stage1.m4.length +
        stage1.m5.length >
        0;
    const isStage3Locked = !completedStages.includes(2);
    const isStage4Locked = !completedStages.includes(3);

    return {
      stage1_1ModeLeft: createStage(1, stage1, false),
      stage2_2ModesLeft: createStage(2, stage2, isStage2Locked),
      stage3_3ModesLeft: createStage(3, stage3, isStage3Locked),
      stage4_4ModesLeft: createStage(4, stage4, isStage4Locked),
      overallStats: {
        totalWords,
        completedWords: totalCompleted,
        averageModesCompleted: Math.round(avgModesCompleted * 10) / 10,
        mostNeglectedMode: mostNeglected,
      },
    };
  }

  private getEmptyAnalysis(): FullWeaknessAnalysis {
    const emptyGroups = { m1: [], m2: [], m3: [], m4: [], m5: [] };
    const createEmpty = (stage: StageNumber): WeaknessStage => ({
      stage,
      title: `পর্যায় ${stage}`,
      description: "",
      creditPercent: 5,
      groups: { ...emptyGroups },
      totalUniqueWords: 0,
      totalCards: 0,
      isLocked: stage !== 1,
      unlockRequirement:
        stage === 1 ? "Unlocked" : `পর্যায় ${stage - 1} শেষ করুন`,
    });

    return {
      stage1_1ModeLeft: createEmpty(1),
      stage2_2ModesLeft: createEmpty(2),
      stage3_3ModesLeft: createEmpty(3),
      stage4_4ModesLeft: createEmpty(4),
      overallStats: {
        totalWords: 0,
        completedWords: 0,
        averageModesCompleted: 0,
        mostNeglectedMode: 1,
      },
    };
  }

  /**
   * Get words for a specific mode in a stage (for Event Card rendering)
   * e.g., Stage 1, Mode 1: word_ids where only m1 is left
   */
  getWordsForStageMode(
    analysis: FullWeaknessAnalysis,
    stage: StageNumber,
    mode: ModeNumber
  ): number[] {
    const stageKey = {
      1: "stage1_1ModeLeft",
      2: "stage2_2ModesLeft",
      3: "stage3_3ModesLeft",
      4: "stage4_4ModesLeft",
    }[stage] as keyof FullWeaknessAnalysis;

    const stageData = analysis[stageKey] as WeaknessStage;
    return stageData.groups[`m${mode}` as keyof typeof stageData.groups] || [];
  }

  /**
   * Save completed stages to MMKV (for lock/unlock)
   */
  markStageCompleted(stage: StageNumber): void {
    const key = "completed_event_stages";
    const raw = dailyBankMMKV.getString(key);
    let completed: StageNumber[] = [];
    try {
      if (raw) {
        completed = JSON.parse(raw);
      }
    } catch {}

    if (!completed.includes(stage)) {
      completed.push(stage);
      dailyBankMMKV.set(key, JSON.stringify(completed));
      console.log(`[WeaknessAnalyzer] Stage ${stage} marked completed`);
    }
  }

  getCompletedStages(): StageNumber[] {
    const raw = dailyBankMMKV.getString("completed_event_stages");
    if (!raw) {
      return [1];
    } // Stage 1 always active initially
    try {
      return JSON.parse(raw) as StageNumber[];
    } catch {
      return [1];
    }
  }
}

export const WeaknessAnalyzer = new WeaknessAnalyzerSingleton();
export default WeaknessAnalyzer;
