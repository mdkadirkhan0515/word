/**
 * src/screens/WordDetailScreen.tsx
 * Word Detail - 5 Modes Card Layout
 * Implements: 40% Top Header, 20% Core Content, 20% Bottom Padding, 20% Empty for m2/m5
 * TTS Control: m1/m4 Card Tap = Play/Stop, m2/m5 Empty Space = Pause/Resume
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ModeCard from "../components/Cards/ModeCard";
import WordProgressKey from "../storage/keys/WordProgressKey";
import ChapterEncapsulation from "../services/ProgressEngine/ChapterEncapsulation";
import WordTable from "../database/WordTable";
import TTSController from "../services/TTSEngine/TTSController";

export const WordDetailScreen: React.FC = () => {
  const route = useRoute() as any;
  const navigation = useNavigation() as any;
  const insets = useSafeAreaInsets();
  const { word_id, display_word_id, chapter_name, chapter_id } = route.params;

  const [content, setContent] = useState<string>("");
  const [progress, setProgress] = useState(
    WordProgressKey.getWordProgress(word_id)
  );

  const loadContent = useCallback(async () => {
    const word = await WordTable.getWordById(word_id);
    if (word) {
      setContent(
        word.content || `Content for ${chapter_name} #${display_word_id}`
      );
    }
  }, [word_id, chapter_name, display_word_id]);

  useEffect(() => {
    loadContent();
    // Navigation Exit = Global Stop if not background
    return () => {
      TTSController.onNavigationExit();
    };
  }, [loadContent]);

  const handleProgressUpdate = useCallback(
    async (wId: number, mode: number) => {
      const newProgress = await WordProgressKey.incrementMode(
        wId,
        mode as any,
        1
      );
      setProgress(newProgress);

      // Update Chapter Box
      const chapterWords = await WordTable.getWordsByChapter(chapter_id);
      const wordIds = chapterWords.map((w) => w.word_id);
      ChapterEncapsulation.saveChapterProgress(chapter_id, wordIds);
    },
    [chapter_id]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 40% Top Header & SubHeader */}
      <View style={styles.topHeader}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={22} color="#1C1B1F" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {chapter_name} #{display_word_id}
          </Text>
          <Text style={styles.headerSub}>
            5 Modes • {progress.completedModesCount}/5 Completed
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Icon
            name={progress.isCompleted ? "check-circle" : "progress-clock"}
            size={22}
            color={progress.isCompleted ? "#4CAF50" : "#938F99"}
          />
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode Cards - Each has 40/20/20 internal layout */}
        <View style={styles.cardsContainer}>
          {/* m1 - Sound */}
          <ModeCard
            word_id={word_id}
            display_word_id={display_word_id}
            chapter_name={chapter_name}
            content={content}
            mode={1}
            fontSize={16}
            onProgressUpdate={handleProgressUpdate}
          />

          {/* m2 - Play 1 (with empty space control) */}
          <ModeCard
            word_id={word_id}
            display_word_id={display_word_id}
            chapter_name={chapter_name}
            content={content}
            mode={2}
            fontSize={16}
            onProgressUpdate={handleProgressUpdate}
          />

          {/* m3 - Default */}
          <ModeCard
            word_id={word_id}
            display_word_id={display_word_id}
            chapter_name={chapter_name}
            content={content}
            mode={3}
            fontSize={16}
            onProgressUpdate={handleProgressUpdate}
          />

          {/* m4 - Practice */}
          <ModeCard
            word_id={word_id}
            display_word_id={display_word_id}
            chapter_name={chapter_name}
            content={content}
            mode={4}
            fontSize={16}
            onProgressUpdate={handleProgressUpdate}
          />

          {/* m5 - Play 2 (with empty space control) */}
          <ModeCard
            word_id={word_id}
            display_word_id={display_word_id}
            chapter_name={chapter_name}
            content={content}
            mode={5}
            fontSize={16}
            onProgressUpdate={handleProgressUpdate}
          />
        </View>

        {/* 20% Bottom Padding - Security Space */}
        <View style={styles.bottomPadding}>
          <Text style={styles.bottomText}>
            5 Modes Complete = view_id=1 Unlock
          </Text>
          <View style={styles.progressDots}>
            {[1, 2, 3, 4, 5].map((m) => {
              const done = (progress as any)[`m${m}`] > 0;
              return (
                <View key={m} style={[styles.dot, done && styles.dotDone]} />
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBFE" },
  topHeader: {
    height: "12%", // 40% of conceptual top but actual header compact
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3EDF7",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3EDF7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#1C1B1F" },
  headerSub: { fontSize: 11, color: "#49454F", marginTop: 2 },
  headerRight: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  cardsContainer: { paddingTop: 8 },
  bottomPadding: {
    height: 120, // 20% bottom padding security
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 20,
  },
  bottomText: { fontSize: 12, color: "#938F99", marginBottom: 12 },
  progressDots: { flexDirection: "row", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#E7E0EC" },
  dotDone: { backgroundColor: "#6750A4" },
});

export default WordDetailScreen;
