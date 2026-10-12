/**
 * Src/services/TTSEngine/AutoPlayEngine.ts & src/services/TTSEngine/AutoPlayEngine.ts
 * Auto-Play Engine - m2 & m5 Sequential Play with Gap + Repeat + Random/Parallel
 * Features: Single Card Repeat, Card-to-Card Repeat, Random, Parallel, Background
 */

import TTSController, { TTSMode } from "./TTSController";
import TTSStateKey from "../../storage/keys/TTSStateKey";
import { ttsBrainMMKV } from "../../storage/MMKVInstance";
import { PlayModeFilters } from "../../types/progress.types";
import WordProgressKey from "../../storage/keys/WordProgressKey";

export interface AutoPlayQueueItem {
  word_id: number;
  display_word_id: number;
  chapter_name: string;
  content: string;
}

export interface AutoPlayConfig {
  mode: TTSMode; // m2 or m5
  queue: AutoPlayQueueItem[];
  filters: PlayModeFilters;
  gapMs: number;
  speechRate: number;
}

class AutoPlayEngineSingleton {
  private isAutoPlaying = false;
  private currentIndex = 0;
  private queue: AutoPlayQueueItem[] = [];
  private config: AutoPlayConfig | null = null;
  private shouldStop = false;

  /**
   * Start Auto-Play Sequentially
   * Implements: Play Icon 1 & Play Icon 2 with all filter logics
   */
  async start(config: AutoPlayConfig): Promise<void> {
    if (this.isAutoPlaying) {
      await this.stop();
    }

    this.config = config;
    this.queue = this.buildQueue(config);
    this.currentIndex = 0;
    this.isAutoPlaying = true;
    this.shouldStop = false;

    console.log(
      `[AutoPlayEngine] Starting ${config.mode} with ${this.queue.length} items, gap ${config.gapMs}ms`
    );

    await this.playNext();
  }

  private buildQueue(config: AutoPlayConfig): AutoPlayQueueItem[] {
    let queue = [...config.queue];
    const filters = config.filters;

    // Filter: Single Card Repeat
    if (filters.singleRepeat && filters.singleRepeatNumber !== null) {
      const targetId = filters.singleRepeatNumber;
      const filtered = queue.filter(
        (item) => item.display_word_id === targetId
      );
      if (filtered.length > 0 && filters.singleRepeatChapter) {
        // Also filter by chapter name if provided
        const byChapter = filtered.filter((item) =>
          item.chapter_name.includes(filters.singleRepeatChapter)
        );
        queue = byChapter.length > 0 ? byChapter : filtered;
      } else {
        queue = filtered.length > 0 ? filtered : queue;
      }
      // Repeat single card
      if (queue.length === 1) {
        // Keep single, will loop
        console.log(
          `[AutoPlayEngine] Single Repeat Mode: ${queue[0].chapter_name} #${queue[0].display_word_id}`
        );
      }
    }
    // Filter: Card-to-Card Repeat
    else if (
      filters.cardToCardRepeat &&
      filters.cardToCardStart !== null &&
      filters.cardToCardEnd !== null
    ) {
      const min = Math.min(filters.cardToCardStart, filters.cardToCardEnd);
      const max = Math.max(filters.cardToCardStart, filters.cardToCardEnd);
      queue = queue.filter(
        (item) => item.display_word_id >= min && item.display_word_id <= max
      );
      if (filters.cardToCardChapter) {
        queue = queue.filter((item) =>
          item.chapter_name.includes(filters.cardToCardChapter)
        );
      }
      console.log(
        `[AutoPlayEngine] Card-to-Card Repeat: ${min}-${max}, ${queue.length} cards`
      );
    }

    // Parallel vs Random
    if (filters.random) {
      // Shuffle
      queue = this.shuffleArray(queue);
      console.log(
        `[AutoPlayEngine] Random Mode: Shuffled ${queue.length} cards`
      );
    } else if (filters.parallel) {
      // Keep sequential (normal)
      console.log(
        `[AutoPlayEngine] Parallel Mode: Sequential ${queue.length} cards`
      );
    }

    return queue;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private async playNext(): Promise<void> {
    if (this.shouldStop || !this.config || this.queue.length === 0) {
      this.isAutoPlaying = false;
      return;
    }

    if (this.currentIndex >= this.queue.length) {
      // Check if repeat modes - loop
      if (
        this.config.filters.singleRepeat ||
        this.config.filters.cardToCardRepeat
      ) {
        this.currentIndex = 0;
        console.log("[AutoPlayEngine] Looping queue...");
      } else {
        console.log("[AutoPlayEngine] Auto-play completed");
        this.isAutoPlaying = false;
        return;
      }
    }

    const currentItem = this.queue[this.currentIndex];
    const gapMs = this.config.gapMs;

    console.log(
      `[AutoPlayEngine] Playing ${this.currentIndex + 1}/${
        this.queue.length
      }: #${currentItem.display_word_id}`
    );

    try {
      // Set TTS Mode
      TTSStateKey.setActiveMode(this.config.mode);

      // Play with TTSController - sequential
      await TTSController.playSequentialWord(
        currentItem.word_id,
        currentItem.content,
        this.config.mode
      );

      // Wait for TTS to complete + gap
      await this.waitForCompletion(currentItem.word_id);

      // Gap delay
      if (gapMs > 0) {
        await this.delay(gapMs);
      }

      // Mark progress
      const modeNum = this.config.mode === "m2" ? 2 : 5;
      await WordProgressKey.incrementMode(
        currentItem.word_id,
        modeNum as any,
        1
      );

      this.currentIndex++;

      if (!this.shouldStop) {
        await this.playNext();
      }
    } catch (error) {
      console.error("[AutoPlayEngine] PlayNext failed:", error);
      this.isAutoPlaying = false;
    }
  }

  private async waitForCompletion(wordId: number): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const currentState = TTSStateKey.getCurrentState();
        if (currentState === "STOPPED" || this.shouldStop) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 30000);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async stop(): Promise<void> {
    this.shouldStop = true;
    this.isAutoPlaying = false;
    await TTSController.stopImmediately("USER_STOP");
    console.log("[AutoPlayEngine] Stopped");
  }

  async pause(): Promise<void> {
    await TTSController.pause(
      (TTSController as any).getResumePosition ? 0 : 0,
      0
    );
    console.log("[AutoPlayEngine] Paused");
  }

  async resume(): Promise<void> {
    if (this.config && this.currentIndex < this.queue.length) {
      await TTSController.resume("", 0);
      console.log("[AutoPlayEngine] Resumed");
    }
  }

  isPlaying(): boolean {
    return this.isAutoPlaying;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getQueue(): AutoPlayQueueItem[] {
    return this.queue;
  }
}

export const AutoPlayEngine = new AutoPlayEngineSingleton();
export default AutoPlayEngine;
