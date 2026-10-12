/**
 * Src/hooks/useProgress.ts & src/hooks/useProgress.ts
 * Progress Hook - Single Loop 20*5=100 Calculator + Chapter Box + Guards
 * Provides instant MMKV read + auto recalculation
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import WordProgressKey from "../storage/keys/WordProgressKey";
import ChapterEncapsulation from "../services/ProgressEngine/ChapterEncapsulation";
import PerModeCalculator, {
  PerModeResult,
} from "../services/ProgressEngine/PerModeCalculator";
import ChapterTable from "../database/ChapterTable";
import ChapterExecutive, {
  ExecutiveResult,
} from "../services/ProgressEngine/Guards/ChapterExecutive";
import { WordModeProgress } from "../types/progress.types";

export interface UseProgressOptions {
  chapterId: number;
  wordIds: number[];
  autoRefresh?: boolean;
}

export interface UseProgressReturn {
  perModeResult: PerModeResult;
  chapterBox: ReturnType<typeof ChapterEncapsulation.getChapterBox>;
  executiveResult: ExecutiveResult | null;
  wordProgresses: WordModeProgress[];
  totalProgress: number;
  refresh: () => Promise<void>;
  isLoading: boolean;
}

export const useProgress = ({
  chapterId,
  wordIds,
  autoRefresh = true,
}: UseProgressOptions): UseProgressReturn => {
  const [perModeResult, setPerModeResult] = useState<PerModeResult>({
    mode1: 0,
    mode2: 0,
    mode3: 0,
    mode4: 0,
    mode5: 0,
    totalCompletedWords: 0,
    totalWords: wordIds.length,
    totalProgressPercent: 0,
    perModeCompleted: { m1Done: 0, m2Done: 0, m3Done: 0, m4Done: 0, m5Done: 0 },
  });
  const [chapterBox, setChapterBox] = useState(() =>
    ChapterEncapsulation.getChapterBox(chapterId)
  );
  const [executiveResult, setExecutiveResult] =
    useState<ExecutiveResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const wordProgresses = useMemo(() => {
    return WordProgressKey.getBulkProgress(wordIds);
  }, [wordIds, perModeResult]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // Single Loop Calculation
      const result = PerModeCalculator.calculateAllModesProgress(wordIds);
      setPerModeResult(result);

      // Save to Chapter Box (Encapsulation)
      const box = ChapterEncapsulation.saveChapterProgress(chapterId, wordIds);
      setChapterBox(box);

      // Check Executive (80% Manager)
      const exec = await ChapterExecutive.check(chapterId);
      setExecutiveResult(exec);
    } catch (error) {
      console.error("[useProgress] Refresh failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [chapterId, wordIds]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto refresh on focus if enabled
  useEffect(() => {
    if (!autoRefresh) {
      return;
    }
    const interval = setInterval(() => {
      refresh();
    }, 2000); // Poll every 2s for live tracking
    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  return {
    perModeResult,
    chapterBox,
    executiveResult,
    wordProgresses,
    totalProgress: perModeResult.totalProgressPercent,
    refresh,
    isLoading,
  };
};

// Hook for single word progress
export const useWordProgress = (wordId: number) => {
  const [progress, setProgress] = useState(() =>
    WordProgressKey.getWordProgress(wordId)
  );

  const refresh = useCallback(() => {
    setProgress(WordProgressKey.getWordProgress(wordId));
  }, [wordId]);

  const increment = useCallback(
    async (mode: 1 | 2 | 3 | 4 | 5, by: number = 1) => {
      const newProgress = await WordProgressKey.incrementMode(wordId, mode, by);
      setProgress(newProgress);
      return newProgress;
    },
    [wordId]
  );

  return { progress, refresh, increment };
};

export default useProgress;
