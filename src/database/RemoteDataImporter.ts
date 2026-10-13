/**
 * src/database/RemoteDataImporter.ts
 * Imports both the Manifesto JSON format and the legacy data_00.json format.
 * WordTable.content is always stored as a JSON string.
 */

import SQLiteManager from './SQLiteManager';

interface ManifestWord {
  word_id?: string | number;
  display_word_id?: string | number;
  word?: string;
  meaning?: string;
  pronunciation?: string;
  bn_meaning?: string;
  en_meaning?: string;
  example_bn?: string;
  example_en?: string;
  synonyms?: string[];
  antonyms?: string[];
  modes?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ManifestChapter {
  chapter_id: string | number;
  chapter_name: string;
  target_percentage?: number;
  words: ManifestWord[];
}

interface ManifestData {
  manifest_version?: string;
  created_at?: string;
  chapters: ManifestChapter[];
}

interface LegacyData {
  subjects?: Array<{subject_id: string | number; subject_text: string}>;
  chapters: Array<{
    chapter_id: string | number;
    subject_id?: string | number;
    displaych_id?: string | number;
    chapter_text: string;
  }>;
  words: Array<{
    word_id: string | number;
    chapter_id: string | number;
    displaywd_id: string | number;
    word_text: string;
    tts_text?: string[];
    emoji?: string;
  }>;
}

interface NormalizedChapter {
  chapterId: number;
  chapterName: string;
  targetPercentage: number;
  words: Array<{
    wordId: number;
    displayWordId: number;
    content: Record<string, unknown>;
  }>;
  raw: unknown;
}

const REQUEST_TIMEOUT_MS = 10000;

function positiveInteger(value: unknown, label: string): number {
  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return numberValue;
}

function boundedTarget(value: unknown): number {
  const numberValue = Number(value ?? 50);
  if (!Number.isFinite(numberValue)) return 50;
  return Math.max(50, Math.min(100, Math.round(numberValue)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeManifest(data: ManifestData): NormalizedChapter[] {
  if (!Array.isArray(data.chapters) || data.chapters.length === 0) {
    throw new Error('Manifest JSON must contain a non-empty chapters array');
  }

  const chapterIds = new Set<number>();
  const wordIds = new Set<number>();

  return data.chapters.map((chapter, chapterIndex) => {
    const chapterId = positiveInteger(chapter.chapter_id, 'chapter_id');
    const chapterName = String(chapter.chapter_name ?? '').trim();
    if (!chapterName) throw new Error(`Chapter ${chapterId} has no chapter_name`);
    if (chapterIds.has(chapterId)) throw new Error(`Duplicate chapter_id ${chapterId}`);
    chapterIds.add(chapterId);
    if (!Array.isArray(chapter.words)) {
      throw new Error(`Chapter ${chapterId} must contain a words array`);
    }

    const words = chapter.words.map((word, index) => {
      if (!isRecord(word)) throw new Error(`Invalid word in chapter ${chapterId}`);
      const wordId = positiveInteger(word.word_id, 'word_id');
      const displayWordId = positiveInteger(word.display_word_id ?? index + 1, 'display_word_id');
      const wordText = String(word.word ?? '').trim();
      if (!wordText) throw new Error(`Word ${wordId} has no word text`);
      if (wordIds.has(wordId)) throw new Error(`Duplicate word_id ${wordId}`);
      wordIds.add(wordId);
      return {
        wordId,
        displayWordId,
        content: {...word, word: wordText},
      };
    });

    if (words.length === 0) throw new Error(`Chapter ${chapterId} has no words`);
    return {
      chapterId,
      chapterName,
      targetPercentage: boundedTarget(chapter.target_percentage),
      words,
      raw: chapter,
    };
  }).sort((a, b) => a.chapterId - b.chapterId);
}

function normalizeLegacy(data: LegacyData): NormalizedChapter[] {
  if (!Array.isArray(data.chapters) || !Array.isArray(data.words) || data.chapters.length === 0) {
    throw new Error('Legacy JSON must contain chapters and words arrays');
  }

  const chapters = new Map<number, NormalizedChapter>();
  data.chapters.forEach(chapter => {
    const chapterId = positiveInteger(chapter.chapter_id, 'chapter_id');
    const chapterName = String(chapter.chapter_text ?? '').trim();
    if (!chapterName) throw new Error(`Chapter ${chapterId} has no chapter_text`);
    if (chapters.has(chapterId)) throw new Error(`Duplicate chapter_id ${chapterId}`);
    chapters.set(chapterId, {
      chapterId,
      chapterName,
      targetPercentage: 50,
      words: [],
      raw: chapter,
    });
  });

  const seenWordIds = new Set<number>();
  for (const word of data.words) {
    const wordId = positiveInteger(word.word_id, 'word_id');
    const chapterId = positiveInteger(word.chapter_id, 'word chapter_id');
    const displayWordId = positiveInteger(word.displaywd_id, 'displaywd_id');
    const wordText = String(word.word_text ?? '').trim();
    if (!wordText) throw new Error(`Word ${wordId} has no word_text`);
    if (seenWordIds.has(wordId)) throw new Error(`Duplicate word_id ${wordId}`);
    seenWordIds.add(wordId);
    const chapter = chapters.get(chapterId);
    if (!chapter) throw new Error(`Word ${wordId} references missing chapter ${chapterId}`);
    chapter.words.push({
      wordId,
      displayWordId,
      content: {
        word: wordText,
        meaning: '',
        pronunciation: '',
        bn_meaning: '',
        en_meaning: '',
        example_bn: '',
        example_en: '',
        synonyms: [],
        antonyms: [],
        tts_text: Array.isArray(word.tts_text) ? word.tts_text : [],
        emoji: word.emoji ?? '',
      },
    });
  }

  const result = [...chapters.values()].sort((a, b) => a.chapterId - b.chapterId);
  if (result.some(chapter => chapter.words.length === 0)) {
    throw new Error('Every chapter in legacy JSON must contain at least one word');
  }
  return result;
}

function isManifestData(data: unknown): data is ManifestData {
  return isRecord(data) && Array.isArray(data.chapters) && data.chapters.length > 0 &&
    data.chapters.every(item => isRecord(item) && 'chapter_name' in item && 'words' in item);
}

function isLegacyData(data: unknown): data is LegacyData {
  return isRecord(data) && Array.isArray(data.chapters) && Array.isArray(data.words) &&
    data.chapters.every(item => isRecord(item) && 'chapter_text' in item);
}

class RemoteDataImporterManager {
  private isSyncing = false;

  async syncFromUrl(url: string): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      const response = await Promise.race([
        fetch(url),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Remote data request timed out')), REQUEST_TIMEOUT_MS);
        }),
      ]);
      if (timeout) clearTimeout(timeout);
      if (!response.ok) throw new Error(`Remote server returned HTTP ${response.status}`);

      const rawData: unknown = await response.json();
      let chapters: NormalizedChapter[];
      if (isManifestData(rawData)) {
        chapters = normalizeManifest(rawData);
      } else if (isLegacyData(rawData)) {
        chapters = normalizeLegacy(rawData);
      } else {
        throw new Error('Unsupported JSON format: expected Manifesto or legacy chapters/words format');
      }

      await SQLiteManager.init();

      // Save each chapter and its words. Existing progress fields are deliberately preserved.
      for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
        const chapter = chapters[chapterIndex];
        const [existingChapter] = await SQLiteManager.executeSql(
          'SELECT chapter_id, completed_words, unlocked_id, target_percentage FROM ChapterTable WHERE chapter_id = ?;',
          [chapter.chapterId],
        );
        const exists = existingChapter.rows.length > 0;
        const oldChapter = exists ? existingChapter.rows.item(0) : null;
        const unlocked = exists ? Number(oldChapter.unlocked_id) : (chapterIndex === 0 ? 1 : 0);
        const oldTarget = exists ? Number(oldChapter.target_percentage) : 0;
        const target = exists && oldTarget !== 50 ? boundedTarget(oldTarget) : chapter.targetPercentage;

        await SQLiteManager.executeSql(
          `INSERT INTO ChapterTable (chapter_id, chapter_name, total_words, completed_words, unlocked_id, target_percentage)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(chapter_id) DO UPDATE SET
             chapter_name = excluded.chapter_name,
             total_words = excluded.total_words,
             target_percentage = CASE WHEN ChapterTable.target_percentage IS NULL THEN excluded.target_percentage ELSE ChapterTable.target_percentage END;`,
          [chapter.chapterId, chapter.chapterName, chapter.words.length, exists ? Number(oldChapter.completed_words) || 0 : 0, unlocked, target],
        );

        // Remove only the known demo seed records; do not delete arbitrary user words.
        if (isManifestData(rawData)) {
          const [seedRows] = await SQLiteManager.executeSql(
            'SELECT word_id, content FROM WordTable WHERE chapter_id = ? AND word_id BETWEEN 101 AND 120;',
            [chapter.chapterId],
          );
          for (let i = 0; i < seedRows.rows.length; i++) {
            const row = seedRows.rows.item(i);
            try {
              const parsed = JSON.parse(String(row.content ?? '')) as Record<string, unknown>;
              if (typeof parsed.meaning === 'string' && /^অর্থ \d+$/.test(parsed.meaning)) {
                await SQLiteManager.executeSql('DELETE FROM WordTable WHERE word_id = ?;', [row.word_id]);
              }
            } catch {
              // Keep any record whose origin cannot be confidently identified.
            }
          }
        }

        for (const word of chapter.words) {
          const serializedContent = JSON.stringify(word.content);
          const [existingWord] = await SQLiteManager.executeSql(
            'SELECT view_id FROM WordTable WHERE word_id = ?;',
            [word.wordId],
          );
          const viewId = existingWord.rows.length > 0 ? Number(existingWord.rows.item(0).view_id) || 0 : 0;
          await SQLiteManager.executeSql(
            `INSERT INTO WordTable (word_id, display_word_id, chapter_id, chapter_name, content, view_id, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(word_id) DO UPDATE SET
               display_word_id = excluded.display_word_id,
               chapter_id = excluded.chapter_id,
               chapter_name = excluded.chapter_name,
               content = excluded.content,
               updated_at = CURRENT_TIMESTAMP;`,
            [word.wordId, word.displayWordId, chapter.chapterId, chapter.chapterName, serializedContent, viewId],
          );
        }

        // Record the imported chapter manifest for offline/reference use.
        await SQLiteManager.executeSql(
          `INSERT INTO ManifestoTable (manifesto_id, chapter_id, chapter_name, is_downloaded, json_data, downloaded_at)
           VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(manifesto_id) DO UPDATE SET
             chapter_id = excluded.chapter_id,
             chapter_name = excluded.chapter_name,
             is_downloaded = 1,
             json_data = excluded.json_data,
             downloaded_at = CURRENT_TIMESTAMP;`,
          [chapter.chapterId, chapter.chapterId, chapter.chapterName, JSON.stringify(chapter.raw)],
        );

        const [totals] = await SQLiteManager.executeSql(
          `SELECT COUNT(*) AS total, SUM(CASE WHEN view_id = 1 THEN 1 ELSE 0 END) AS completed
           FROM WordTable WHERE chapter_id = ?;`,
          [chapter.chapterId],
        );
        const total = Number(totals.rows.item(0).total) || chapter.words.length;
        const completed = Number(totals.rows.item(0).completed) || 0;
        await SQLiteManager.executeSql(
          'UPDATE ChapterTable SET total_words = ?, completed_words = ? WHERE chapter_id = ?;',
          [total, completed, chapter.chapterId],
        );
      }

      console.log(`[RemoteDataImporter] Imported ${chapters.reduce((sum, ch) => sum + ch.words.length, 0)} words across ${chapters.length} chapters`);
    } catch (error) {
      console.warn('[RemoteDataImporter] Import skipped:', error);
      throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
      this.isSyncing = false;
    }
  }
}

const RemoteDataImporter = new RemoteDataImporterManager();
export default RemoteDataImporter;
