/**
 * src/database/queries/BatchFetch.ts
 * High-Performance Batch Query for Mapping Pipeline
 * MMKV Primary Keys (word_id) -> SQLite Display Data (display_word_id, chapter_name)
 * Uses IN clause optimization, No Loop Query
 */

import SQLiteManager from "../SQLiteManager";
import { WordRow } from "../WordTable";

export interface EnrichedDisplayData {
  wordId: number; // Internal Primary Key (67, 896)
  displayWordId: number; // User Visible (15, 42, #৩৫)
  chapterId: number;
  chapterName: string; // অপরিচিতা
  viewId: number;
  content?: string | null;
}

export interface BatchFetchResult {
  enriched: EnrichedDisplayData[];
  notFound: number[]; // word_ids that were not found in DB
  chapterGrouped: Record<string, EnrichedDisplayData[]>; // Grouped by chapter_name for Event Card
}

/**
 * Core Mapping Pipeline Function
 * @param primaryKeyArray - MMKV Raw Material e.g., [67, 896, 765, 985, 096]
 * @returns Enriched data for Event Card rendering
 */
export async function fetchDisplayDataFromPrimaryKeys(
  primaryKeyArray: number[]
): Promise<BatchFetchResult> {
  if (!primaryKeyArray || primaryKeyArray.length === 0) {
    return { enriched: [], notFound: [], chapterGrouped: {} };
  }

  // Deduplicate and sanitize
  const uniqueIds = Array.from(
    new Set(primaryKeyArray.filter((id) => Number.isFinite(id) && id > 0))
  );

  if (uniqueIds.length === 0) {
    return { enriched: [], notFound: [], chapterGrouped: {} };
  }

  // Chunking for SQLite IN clause limit (SQLite max ~999 variables, we use 500 for safety)
  const CHUNK_SIZE = 500;
  const chunks: number[][] = [];
  for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
    chunks.push(uniqueIds.slice(i, i + CHUNK_SIZE));
  }

  const allEnriched: EnrichedDisplayData[] = [];

  for (const chunk of chunks) {
    // Build placeholders: ?,?,?
    const placeholders = chunk.map(() => "?").join(",");
    const query = `
      SELECT word_id, display_word_id, chapter_id, chapter_name, view_id, content
      FROM WordTable
      WHERE word_id IN (${placeholders})
      ORDER BY chapter_name ASC, display_word_id ASC;
    `;

    try {
      const [result] = await SQLiteManager.executeSql(query, chunk);
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i) as WordRow;
        allEnriched.push({
          wordId: row.word_id,
          displayWordId: row.display_word_id,
          chapterId: row.chapter_id,
          chapterName: row.chapter_name,
          viewId: row.view_id,
          content: row.content,
        });
      }
    } catch (error) {
      console.error(
        `[BatchFetch] Chunk failed for IDs ${chunk.slice(0, 3)}...:`,
        error
      );
      // Continue with other chunks
    }
  }

  // Find not found IDs
  const foundIds = new Set(allEnriched.map((e) => e.wordId));
  const notFound = uniqueIds.filter((id) => !foundIds.has(id));

  // Group by chapter_name for Event Card (e.g., অপরিচিতা #৩৫, #৭৮)
  const chapterGrouped: Record<string, EnrichedDisplayData[]> = {};
  for (const item of allEnriched) {
    if (!chapterGrouped[item.chapterName]) {
      chapterGrouped[item.chapterName] = [];
    }
    chapterGrouped[item.chapterName].push(item);
  }

  console.log(
    `[BatchFetch] Mapped ${uniqueIds.length} PKs -> ${allEnriched.length} enriched, ${notFound.length} not found`
  );

  return {
    enriched: allEnriched,
    notFound,
    chapterGrouped,
  };
}

/**
 * Helper: Convert Enriched to Event Card Display String
 * e.g., "অপরিচিতা #৩৫, #৭৮, #৮৮"
 */
export function toEventCardDisplay(enriched: EnrichedDisplayData[]): string {
  if (enriched.length === 0) {
    return "";
  }

  // Group by chapter (usually same chapter)
  const grouped = enriched.reduce((acc, cur) => {
    if (!acc[cur.chapterName]) {
      acc[cur.chapterName] = [];
    }
    acc[cur.chapterName].push(cur.displayWordId);
    return acc;
  }, {} as Record<string, number[]>);

  // Format: "অপরিচিতা #৩৫, #৭৮, #৮৮, #৮৯"
  return Object.entries(grouped)
    .map(([chapterName, ids]) => {
      const idStr = ids.map((id) => `#${id}`).join(", ");
      return `${chapterName} ${idStr}`;
    })
    .join(" | ");
}

/**
 * Specialized Fetch for 4-Stage Weakness Engine
 * Input: { m1: [67,896], m2: [65,86] ... }
 * Output: { m1: EnrichedDisplayData[], ... }
 */
export async function fetchWeaknessStages(
  stagesRaw: Record<string, number[]> // e.g., { m1: [67,896], m2: [65,86] }
): Promise<Record<string, EnrichedDisplayData[]>> {
  const result: Record<string, EnrichedDisplayData[]> = {};

  // Process in parallel for speed
  const entries = Object.entries(stagesRaw);
  const promises = entries.map(async ([mode, ids]) => {
    const { enriched } = await fetchDisplayDataFromPrimaryKeys(ids);
    return { mode, enriched };
  });

  const resolved = await Promise.all(promises);
  for (const { mode, enriched } of resolved) {
    result[mode] = enriched;
  }

  return result;
}

export default fetchDisplayDataFromPrimaryKeys;
