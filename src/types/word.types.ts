/**
 * src/types/word.types.ts
 * Core Word & Chapter Types - Offline-First, MMKV 100 Key, view_id Logic
 */

export interface Word {
  word_id: number; // Internal Primary Key (e.g., 67, 896, 156) - MMKV raw material
  display_word_id: number; // User Visible # (e.g., #৩৫, #৭৮) - SQLite enriched
  chapter_id: number;
  chapter_name: string; // e.g., "অপরিচিতা"
  content: string | null; // Full text for TTS
  view_id: number; // 0=Locked/Incomplete, 1=Unlocked/Complete (5 Modes >0)
  created_at?: string;
  updated_at?: string;
}

export type WordRow = Word;

export interface Chapter {
  chapter_id: number;
  chapter_name: string;
  total_words: number;
  completed_words: number;
  unlocked_id: number; // 0=Locked, 1=Unlocked (80% Manager)
  target_percentage: number; // 50-100 Dynamic from 30-Day Algo
  created_at?: string;
}

export type ChapterRow = Chapter;

export interface ManifestoItem {
  manifesto_id: number;
  chapter_id: number;
  chapter_name: string;
  is_downloaded: 0 | 1;
  json_data?: string | null;
  downloaded_at?: string;
}

export interface EnrichedDisplayData {
  wordId: number; // Internal
  displayWordId: number; // User Visible
  chapterId: number;
  chapterName: string;
  viewId: number;
  content?: string | null;
}

export interface BatchFetchResult {
  enriched: EnrichedDisplayData[];
  notFound: number[];
  chapterGrouped: Record<string, EnrichedDisplayData[]>; // For Event Card grouping
}

// Word Completion Check
export interface WordCompletionCheck {
  word_id: number;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  m5: number;
  isCompleted: boolean;
}

export interface CompletionResult {
  word_id: number;
  isCompleted: boolean;
  wasNewlyCompleted: boolean;
  progress: import("./progress.types").WordModeProgress;
}
