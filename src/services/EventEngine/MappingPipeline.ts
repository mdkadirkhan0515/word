/**
 * src/services/EventEngine/MappingPipeline.ts
 * Mapping Pipeline: MMKV Primary Keys (word_id) -> SQLite Display Data (display_word_id, chapter_name)
 * Converts raw weakness word_ids to enriched event card data: "অপরিচিতা #৩৫, #৭৮"
 * Uses Batch IN Query for performance
 */

import {
  fetchDisplayDataFromPrimaryKeys,
  toEventCardDisplay,
  EnrichedDisplayData,
} from "../../database/queries/BatchFetch";
import WeaknessAnalyzer, {
  FullWeaknessAnalysis,
  StageNumber,
  WeaknessStage,
} from "./WeaknessAnalyzer";
import { ModeNumber } from "../../storage/keys/WordProgressKey";

export interface EventCard {
  id: string; // e.g., "stage1_m1"
  stage: StageNumber;
  mode: ModeNumber;
  modeIcon: string; // volume-high, play-circle-outline etc (No Emoji)
  title: string; // e.g., "অপরিচিতা #৩৫, #৭৮, #৮৮, #৮৯"
  displayIds: number[]; // [35,78,88,89]
  wordIds: number[]; // Internal [67,896...]
  enriched: EnrichedDisplayData[];
  creditPercent: number; // +1%
  isCompleted: boolean;
  chapterName: string;
}

export interface DailyEventPipelineResult {
  stage1Cards: EventCard[]; // 5 cards max (m1-m5)
  stage2Cards: EventCard[];
  stage3Cards: EventCard[];
  stage4Cards: EventCard[];
  allCards: EventCard[];
  totalCreditAvailable: number; // 20% (4 stages * 5%)
  totalUniqueWords: number;
}

class MappingPipelineSingleton {
  private readonly MODE_ICONS: Record<
    ModeNumber,
    { icon: string; label: string }
  > = {
    1: { icon: "volume-high", label: "Sound" }, // m1 🔊 -> volume-high
    2: { icon: "play-circle-outline", label: "Play1" }, // m2 ▶️ -> play-circle-outline
    3: { icon: "book-open-page-variant", label: "Default" }, // m3 📖 -> book
    4: { icon: "lightbulb-on-outline", label: "Practice" }, // m4 😊 -> lightbulb
    5: { icon: "play-speed", label: "Play2" }, // m5 🎯 -> play-speed
  };

  /**
   * Core: Convert Weakness Analysis to Event Cards with Display Data
   * Input: wordIds of a chapter (e.g., 20 words)
   * Output: Enriched Event Cards ready for UI
   */
  async buildDailyEventCards(
    wordIds: number[]
  ): Promise<DailyEventPipelineResult> {
    // 1. Analyze weakness into 4 stages
    const completedStages = WeaknessAnalyzer.getCompletedStages();
    const analysis: FullWeaknessAnalysis = WeaknessAnalyzer.analyze(
      wordIds,
      completedStages
    );

    // 2. Collect all word_ids from all stages for batch fetch (optimize)
    const allWordIdsToFetch = new Set<number>();
    [
      analysis.stage1_1ModeLeft,
      analysis.stage2_2ModesLeft,
      analysis.stage3_3ModesLeft,
      analysis.stage4_4ModesLeft,
    ].forEach((stage) => {
      Object.values(stage.groups).forEach((group) => {
        group.forEach((id) => allWordIdsToFetch.add(id));
      });
    });

    // 3. Batch fetch all display data at once (single IN query)
    const { enriched: allEnriched, chapterGrouped } =
      await fetchDisplayDataFromPrimaryKeys(Array.from(allWordIdsToFetch));

    // Create lookup map for fast access
    const enrichedMap = new Map<number, EnrichedDisplayData>();
    allEnriched.forEach((e) => enrichedMap.set(e.wordId, e));

    // 4. Build cards per stage
    const stage1Cards = this.buildStageCards(
      analysis.stage1_1ModeLeft,
      enrichedMap
    );
    const stage2Cards = this.buildStageCards(
      analysis.stage2_2ModesLeft,
      enrichedMap
    );
    const stage3Cards = this.buildStageCards(
      analysis.stage3_3ModesLeft,
      enrichedMap
    );
    const stage4Cards = this.buildStageCards(
      analysis.stage4_4ModesLeft,
      enrichedMap
    );

    const allCards = [
      ...stage1Cards,
      ...stage2Cards,
      ...stage3Cards,
      ...stage4Cards,
    ];
    const totalCredit = allCards.reduce(
      (sum, card) => sum + card.creditPercent,
      0
    );
    const uniqueWords = new Set(allCards.flatMap((c) => c.wordIds)).size;

    console.log(
      `[MappingPipeline] Built ${allCards.length} cards, ${totalCredit}% total credit, ${uniqueWords} unique words`
    );

    return {
      stage1Cards,
      stage2Cards,
      stage3Cards,
      stage4Cards,
      allCards,
      totalCreditAvailable: totalCredit,
      totalUniqueWords: uniqueWords,
    };
  }

  private buildStageCards(
    stage: WeaknessStage,
    enrichedMap: Map<number, EnrichedDisplayData>
  ): EventCard[] {
    const cards: EventCard[] = [];

    // Each mode (m1-m5) that has words becomes a card
    (Object.entries(stage.groups) as Array<[string, number[]]>).forEach(
      ([modeKey, wordIds]) => {
        if (wordIds.length === 0) {
          return;
        }

        const mode = Number(modeKey.replace("m", "")) as ModeNumber;
        const enriched = wordIds
          .map((id) => enrichedMap.get(id))
          .filter(Boolean) as EnrichedDisplayData[];

        if (enriched.length === 0) {
          return;
        }

        // Group by chapter for display (usually same chapter, but handle multi)
        const byChapter = enriched.reduce((acc, cur) => {
          if (!acc[cur.chapterName]) {
            acc[cur.chapterName] = [];
          }
          acc[cur.chapterName].push(cur);
          return acc;
        }, {} as Record<string, EnrichedDisplayData[]>);

        // Create one card per chapter group (or combine if same chapter)
        Object.entries(byChapter).forEach(([chapterName, chapterEnriched]) => {
          const displayIds = chapterEnriched.map((e) => e.displayWordId);
          const title = `${chapterName} ${displayIds
            .map((id) => `#${id}`)
            .join(", ")}`;
          const iconInfo = this.MODE_ICONS[mode];

          cards.push({
            id: `stage${stage.stage}_m${mode}_${chapterName}`,
            stage: stage.stage,
            mode,
            modeIcon: iconInfo.icon,
            title,
            displayIds,
            wordIds: chapterEnriched.map((e) => e.wordId),
            enriched: chapterEnriched,
            creditPercent: 1, // Each card +1%
            isCompleted: false,
            chapterName,
          });
        });
      }
    );

    return cards;
  }

  /**
   * Helper: Get cards for a specific stage (for lazy loading)
   */
  async getStageCards(
    wordIds: number[],
    stage: StageNumber
  ): Promise<EventCard[]> {
    const completedStages = WeaknessAnalyzer.getCompletedStages();
    const analysis = WeaknessAnalyzer.analyze(wordIds, completedStages);

    const stageData = {
      1: analysis.stage1_1ModeLeft,
      2: analysis.stage2_2ModesLeft,
      3: analysis.stage3_3ModesLeft,
      4: analysis.stage4_4ModesLeft,
    }[stage];

    const allIds = Object.values(stageData.groups).flat();
    const { enriched } = await fetchDisplayDataFromPrimaryKeys(allIds);

    const enrichedMap = new Map<number, EnrichedDisplayData>();
    enriched.forEach((e) => enrichedMap.set(e.wordId, e));

    return this.buildStageCards(stageData, enrichedMap);
  }

  /**
   * Convert event cards to UI display format (No Emoji, Vector Icons Only)
   * For DailyEventScreen: [Icon] [Title] [+1%]
   */
  toUIDisplay(
    cards: EventCard[]
  ): Array<{ icon: string; text: string; credit: string; cardId: string }> {
    return cards.map((card) => ({
      icon: card.modeIcon, // volume-high, play-circle-outline etc
      text: card.title, // "অপরিচিতা #৩৫, #৭৮"
      credit: `+${card.creditPercent}%`,
      cardId: card.id,
    }));
  }
}

export const MappingPipeline = new MappingPipelineSingleton();
export default MappingPipeline;
