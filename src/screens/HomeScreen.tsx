/**
 * src/screens/HomeScreen.tsx
 * Home - Chapter List with Chapter Box Progress (Instant MMKV Read)
 * Shows: Chapter Name + Green Bar + Percentage + Lock/Unlock + Bank Credit Button
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import ChapterTable from "../database/ChapterTable";
import ChapterBoxKey from "../storage/keys/ChapterBoxKey";
import ChapterEncapsulation from "../services/ProgressEngine/ChapterEncapsulation";
import ChapterExecutive from "../services/ProgressEngine/Guards/ChapterExecutive";
import BankManager from "../storage/DailyBank/BankManager";
import DynamicTarget from "../storage/DailyBank/DynamicTarget";
import { Radius, Spacing } from "../theme/radius";

export interface ChapterCardData {
  chapter_id: number;
  chapter_name: string;
  total_words: number;
  completed_words: number;
  progressPercent: number;
  isUnlocked: boolean;
  targetPercent: number;
  canUseBank: boolean;
  needsBankCredit: number;
  executiveMessage: string;
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation() as any;
  const [chapters, setChapters] = useState<ChapterCardData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [bankBalance, setBankBalance] = useState(0);

  const loadChapters = useCallback(async () => {
    try {
      const allChapters = await ChapterTable.getAllChaptersWithProgress();
      const bank = BankManager.getBalance().totalBalance;
      setBankBalance(bank);

      const cards: ChapterCardData[] = [];

      for (const status of allChapters) {
        const box = ChapterEncapsulation.getChapterBox(status.chapter_id);
        const exec = await ChapterExecutive.check(status.chapter_id);

        cards.push({
          chapter_id: status.chapter_id,
          chapter_name: status.chapter_name,
          total_words: status.total,
          completed_words: status.completed,
          progressPercent: box.totalProgressPercent || status.completedPercent,
          isUnlocked: exec.isUnlocked,
          targetPercent: exec.targetPercent,
          canUseBank: exec.canUseBank,
          needsBankCredit: exec.needsBankCredit,
          executiveMessage: exec.message,
        });
      }

      // Sort by chapter_id
      cards.sort((a, b) => a.chapter_id - b.chapter_id);
      setChapters(cards);
    } catch (error) {
      console.error("[HomeScreen] Load failed:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadChapters();
    }, [loadChapters])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChapters();
    setRefreshing(false);
  }, [loadChapters]);

  const handleChapterPress = (chapter: ChapterCardData) => {
    if (!chapter.isUnlocked) {
      return;
    }
    navigation.navigate("Chapter", {
      chapter_id: chapter.chapter_id,
      chapter_name: chapter.chapter_name,
    });
  };

  const handleBankUnlock = async (chapter: ChapterCardData) => {
    const result = await ChapterExecutive.unlockViaBank(chapter.chapter_id);
    if (result.success) {
      await loadChapters();
    }
  };

  const renderChapterCard = ({ item }: { item: ChapterCardData }) => {
    return (
      <Pressable
        onPress={() => handleChapterPress(item)}
        style={({ pressed }) => [
          styles.card,
          item.isUnlocked ? styles.cardUnlocked : styles.cardLocked,
          pressed && item.isUnlocked && { transform: [{ scale: 0.98 }] },
        ]}
        disabled={!item.isUnlocked}
      >
        {/* Header: Icon + Name + Lock State */}
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: item.isUnlocked ? "#E8DEF8" : "#F3EDF7" },
            ]}
          >
            <Icon
              name={item.isUnlocked ? "book-open-page-variant" : "lock-outline"}
              size={20}
              color={item.isUnlocked ? "#6750A4" : "#938F99"}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.chapterName} numberOfLines={1}>
              {item.chapter_name}
            </Text>
            <Text style={styles.chapterMeta}>
              {item.completed_words}/{item.total_words} শব্দ •{" "}
              {item.targetPercent}% প্রয়োজন
            </Text>
          </View>
          <View style={styles.percentBadge}>
            <Icon
              name="chart-donut-variant"
              size={14}
              color={item.isUnlocked ? "#6750A4" : "#938F99"}
            />
            <Text
              style={[
                styles.percentText,
                !item.isUnlocked && { color: "#938F99" },
              ]}
            >
              {item.progressPercent}%
            </Text>
          </View>
        </View>

        {/* Progress Bar - Green Fill */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${item.progressPercent}%`,
                backgroundColor: item.isUnlocked ? "#4CAF50" : "#E7E0EC",
              },
            ]}
          />
        </View>

        {/* Bank Credit Button - Invisible UI Magic */}
        {!item.isUnlocked && item.progressPercent >= 50 && item.canUseBank && (
          <Pressable
            onPress={() => handleBankUnlock(item)}
            style={styles.bankButton}
          >
            <Icon name="lightning-bolt-outline" size={16} color="#FFFFFF" />
            <Text style={styles.bankButtonText}>
              -{item.needsBankCredit}% ব্যাংক ক্রেডিট কেটে আনলক করুন
            </Text>
          </Pressable>
        )}

        {!item.isUnlocked && item.progressPercent < 50 && (
          <Text style={styles.lockHint}>
            আরও {50 - item.progressPercent}% প্রয়োজন ব্যাংক ব্যবহারের জন্য
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Bank Header */}
      <View style={styles.bankHeader}>
        <Icon name="calendar-check-outline" size={20} color="#6750A4" />
        <Text style={styles.bankText}>
          ডেইলি ব্যাংক: {bankBalance}% ক্রেডিট
        </Text>
        <Pressable
          onPress={() => navigation.navigate("DailyEvent")}
          style={styles.eventButton}
        >
          <Text style={styles.eventButtonText}>ইভেন্ট সেন্টার</Text>
        </Pressable>
      </View>

      <FlatList
        data={chapters}
        renderItem={renderChapterCard}
        keyExtractor={(item) => `chapter-${item.chapter_id}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6750A4"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="book-outline" size={48} color="#E7E0EC" />
            <Text style={styles.emptyText}>কোনো চ্যাপ্টার নেই</Text>
            <Text style={styles.emptySubText}>
              সেটিংস থেকে ম্যানিফেস্টো ডাউনলোড করুন
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBFE" },
  bankHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7E0EC",
    gap: 8,
  },
  bankText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#1C1B1F" },
  eventButton: {
    backgroundColor: "#6750A4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  eventButtonText: { fontSize: 12, color: "#FFFFFF", fontWeight: "600" },
  listContent: { paddingBottom: 20 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardUnlocked: { borderColor: "#E7E0EC", elevation: 2 },
  cardLocked: { borderColor: "#F3EDF7", backgroundColor: "#FFFBFE" },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerText: { flex: 1 },
  chapterName: { fontSize: 15, fontWeight: "600", color: "#1C1B1F" },
  chapterMeta: { fontSize: 11, color: "#49454F", marginTop: 2 },
  percentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3EDF7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentText: { fontSize: 12, fontWeight: "600", color: "#6750A4" },
  progressTrack: {
    height: 6,
    backgroundColor: "#F3EDF7",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  bankButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6750A4",
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
    gap: 6,
    justifyContent: "center",
  },
  bankButtonText: { fontSize: 12, color: "#FFFFFF", fontWeight: "600" },
  lockHint: {
    fontSize: 11,
    color: "#938F99",
    marginTop: 8,
    fontStyle: "italic",
  },
  empty: { alignItems: "center", padding: 40, marginTop: 40 },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#49454F",
    marginTop: 12,
  },
  emptySubText: { fontSize: 12, color: "#938F99", marginTop: 4 },
});

export default HomeScreen;
