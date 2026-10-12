/**
 * src/screens/ChapterScreen.tsx
 * Chapter Detail - Word List with Mode Progress
 * Shows: Display IDs with view_id status, Mode progress per word
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useRoute, useNavigation } from "@react-navigation/native";
import WordTable, { WordRow } from "../database/WordTable";
import WordProgressKey from "../storage/keys/WordProgressKey";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const ChapterScreen: React.FC = () => {
  const route = useRoute() as any;
  const navigation = useNavigation() as any;
  const { chapter_id, chapter_name } = route.params;
  const insets = useSafeAreaInsets();

  const [words, setWords] = useState<
    (WordRow & {
      progress: ReturnType<typeof WordProgressKey.getWordProgress>;
    })[]
  >([]);
  const [totalProgress, setTotalProgress] = useState(0);

  const loadWords = useCallback(async () => {
    const wordList = await WordTable.getWordsByChapter(chapter_id);
    const enriched = wordList.map((w) => ({
      ...w,
      progress: WordProgressKey.getWordProgress(w.word_id),
    }));
    setWords(enriched);

    const completed = enriched.filter((w) => w.progress.isCompleted).length;
    setTotalProgress(
      enriched.length > 0 ? Math.round((completed / enriched.length) * 100) : 0
    );
  }, [chapter_id]);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  const handleWordPress = (word: WordRow) => {
    navigation.navigate("WordDetail", {
      word_id: word.word_id,
      display_word_id: word.display_word_id,
      chapter_name,
      chapter_id,
    });
  };

  const renderWordItem = ({
    item,
    index,
  }: {
    item: (typeof words)[0];
    index: number;
  }) => {
    const { m1, m2, m3, m4, m5, isCompleted, completedModesCount } =
      item.progress;
    const modes = [
      { key: "m1", done: m1 > 0, icon: "volume-high" },
      { key: "m2", done: m2 > 0, icon: "play-circle-outline" },
      { key: "m3", done: m3 > 0, icon: "book-open-page-variant" },
      { key: "m4", done: m4 > 0, icon: "lightbulb-on-outline" },
      { key: "m5", done: m5 > 0, icon: "play-speed" },
    ];

    return (
      <Pressable
        onPress={() => handleWordPress(item)}
        style={[styles.wordCard, isCompleted && styles.wordCompleted]}
      >
        <View style={styles.wordHeader}>
          <View style={styles.wordIdBox}>
            <Text style={styles.wordIdText}>#{item.display_word_id}</Text>
          </View>
          <Text style={styles.wordContent} numberOfLines={1}>
            {item.content?.substring(0, 50) || `Word ${item.display_word_id}`}
          </Text>
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>{completedModesCount}/5</Text>
          </View>
        </View>

        <View style={styles.modesRow}>
          {modes.map((mode) => (
            <View
              key={mode.key}
              style={[styles.modeDot, mode.done && styles.modeDotDone]}
            >
              <Icon
                name={mode.icon as any}
                size={12}
                color={mode.done ? "#FFFFFF" : "#938F99"}
              />
            </View>
          ))}
          {isCompleted && (
            <Icon
              name="check-circle"
              size={18}
              color="#4CAF50"
              style={{ marginLeft: 8 }}
            />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={22} color="#1C1B1F" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chapter_name}
          </Text>
          <Text style={styles.headerSub}>
            {words.length} শব্দ • {totalProgress}% সম্পন্ন
          </Text>
        </View>
        <View style={styles.progressCircle}>
          <Text style={styles.progressText}>{totalProgress}%</Text>
        </View>
      </View>

      <FlatList
        data={words}
        renderItem={renderWordItem}
        keyExtractor={(item) => `word-${item.word_id}`}
        contentContainerStyle={styles.listContent}
        numColumns={1}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBFE" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
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
  progressCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8DEF8",
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: { fontSize: 12, fontWeight: "700", color: "#6750A4" },
  listContent: { padding: 16, paddingBottom: 40 },
  wordCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E7E0EC",
    overflow: "hidden",
  },
  wordCompleted: { borderColor: "#81C784", backgroundColor: "#E8F5E9" },
  wordHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  wordIdBox: {
    backgroundColor: "#F3EDF7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  wordIdText: { fontSize: 11, fontWeight: "700", color: "#49454F" },
  wordContent: { flex: 1, fontSize: 13, color: "#1C1B1F" },
  completedBadge: {
    backgroundColor: "#E7E0EC",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  completedText: { fontSize: 10, fontWeight: "600", color: "#49454F" },
  modesRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  modeDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3EDF7",
    justifyContent: "center",
    alignItems: "center",
  },
  modeDotDone: { backgroundColor: "#6750A4" },
});

export default ChapterScreen;
