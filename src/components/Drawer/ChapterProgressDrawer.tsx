/**
 * Src/components/Drawer/ChapterProgressDrawer.tsx & src/components/Drawer/ChapterProgressDrawer.tsx
 * Chapter Progress Drawer - Left & Right Drawer with 80% Green Bar, Lock/Unlock, Search
 * Features: Fixed Width, Green Bar Animation, Bank Credit Button Invisible Magic
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import ChapterEncapsulation from "../../services/ProgressEngine/ChapterEncapsulation";
import ChapterExecutive from "../../services/ProgressEngine/Guards/ChapterExecutive";
import ChapterTable from "../../database/ChapterTable";
import BankManager from "../../storage/DailyBank/BankManager";

export interface DrawerChapterItem {
  chapter_id: number;
  chapter_name: string;
  progressPercent: number;
  mode1: number;
  mode2: number;
  mode3: number;
  mode4: number;
  mode5: number;
  isUnlocked: boolean;
  canUseBank: boolean;
  needsBankCredit: number;
}

export interface ChapterProgressDrawerProps {
  visible: boolean;
  onClose: () => void;
  onChapterPress: (chapter_id: number) => void;
  position?: "left" | "right"; // left = Filter, right = Event/Bank
  filterMode?: "all" | "unlocked" | "locked";
}

export const ChapterProgressDrawer: React.FC<ChapterProgressDrawerProps> = ({
  visible,
  onClose,
  onChapterPress,
  position = "left",
  filterMode = "all",
}) => {
  const [chapters, setChapters] = useState<DrawerChapterItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [bankBalance, setBankBalance] = useState(0);

  const loadDrawerData = useCallback(async () => {
    try {
      const allChapters = await ChapterTable.getAllChaptersWithProgress();
      const bank = BankManager.getBalance().totalBalance;
      setBankBalance(bank);

      const items: DrawerChapterItem[] = [];
      for (const ch of allChapters) {
        const box = ChapterEncapsulation.getChapterBox(ch.chapter_id);
        const exec = await ChapterExecutive.check(ch.chapter_id);

        items.push({
          chapter_id: ch.chapter_id,
          chapter_name: ch.chapter_name,
          progressPercent: box.totalProgressPercent || ch.completedPercent,
          mode1: box.mode1,
          mode2: box.mode2,
          mode3: box.mode3,
          mode4: box.mode4,
          mode5: box.mode5,
          isUnlocked: exec.isUnlocked,
          canUseBank: exec.canUseBank,
          needsBankCredit: exec.needsBankCredit,
        });
      }

      items.sort((a, b) => a.chapter_id - b.chapter_id);
      setChapters(items);
    } catch (error) {
      console.error("[ChapterProgressDrawer] Load failed:", error);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadDrawerData();
    }
  }, [visible, loadDrawerData]);

  const filteredChapters = useMemo(() => {
    let filtered = chapters;

    // Filter by lock state
    if (filterMode === "unlocked") {
      filtered = filtered.filter((c) => c.isUnlocked);
    } else if (filterMode === "locked") {
      filtered = filtered.filter((c) => !c.isUnlocked);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.chapter_name.toLowerCase().includes(q) ||
          c.chapter_id.toString().includes(q)
      );
    }

    return filtered;
  }, [chapters, searchQuery, filterMode]);

  const renderItem = ({ item }: { item: DrawerChapterItem }) => {
    return (
      <Pressable
        onPress={() => {
          if (item.isUnlocked) {
            onChapterPress(item.chapter_id);
            onClose();
          }
        }}
        style={[styles.chapterRow, !item.isUnlocked && styles.chapterRowLocked]}
      >
        <View style={styles.chapterRowHeader}>
          <View
            style={[
              styles.iconBox,
              item.isUnlocked ? styles.iconUnlocked : styles.iconLocked,
            ]}
          >
            <Icon
              name={item.isUnlocked ? "book-open-page-variant" : "lock-outline"}
              size={16}
              color={item.isUnlocked ? "#6750A4" : "#938F99"}
            />
          </View>
          <View style={styles.chapterText}>
            <Text style={styles.chapterName} numberOfLines={1}>
              {item.chapter_name}
            </Text>
            <Text style={styles.chapterId}>#{item.chapter_id}</Text>
          </View>
          <View style={styles.percentBadge}>
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

        {/* Green Progress Bar - 80% Bar */}
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

        {/* Per Mode Mini Progress */}
        <View style={styles.modesMini}>
          {[
            { m: 1, p: item.mode1 },
            { m: 2, p: item.mode2 },
            { m: 3, p: item.mode3 },
            { m: 4, p: item.mode4 },
            { m: 5, p: item.mode5 },
          ].map((mode) => (
            <View key={mode.m} style={styles.miniMode}>
              <Text style={styles.miniModeLabel}>m{mode.m}</Text>
              <View style={styles.miniTrack}>
                <View style={[styles.miniFill, { width: `${mode.p}%` }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Bank Button Invisible Magic */}
        {!item.isUnlocked && item.progressPercent >= 50 && item.canUseBank && (
          <View style={styles.bankButton}>
            <Icon name="lightning-bolt-outline" size={12} color="#FFFFFF" />
            <Text style={styles.bankButtonText}>
              -{item.needsBankCredit}% ব্যাংক
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        position === "left" ? styles.leftDrawer : styles.rightDrawer,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon
            name={
              position === "left" ? "tune-vertical" : "calendar-check-outline"
            }
            size={20}
            color="#6750A4"
          />
          <Text style={styles.headerTitle}>
            {position === "left" ? "চ্যাপ্টার ফিল্টার" : "ডেইলি ব্যাংক"}
          </Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={20} color="#49454F" />
        </Pressable>
      </View>

      {/* Bank Balance for Right Drawer */}
      {position === "right" && (
        <View style={styles.bankHeader}>
          <Text style={styles.bankBalance}>{bankBalance}% ক্রেডিট</Text>
          <Text style={styles.bankSub}>মোট উপলব্ধ</Text>
        </View>
      )}

      {/* Search Box */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={18} color="#938F99" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="সার্চ করুন..."
          placeholderTextColor="#938F99"
          style={styles.searchInput}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <Icon name="close-circle-outline" size={18} color="#938F99" />
          </Pressable>
        )}
      </View>

      {/* Chapter List */}
      <FlatList
        data={filteredChapters}
        renderItem={renderItem}
        keyExtractor={(item) => `drawer-chapter-${item.chapter_id}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "80%",
    backgroundColor: "#FFFFFF",
    elevation: 8,
    zIndex: 100,
    borderWidth: 1,
    borderColor: "#E7E0EC",
  },
  leftDrawer: {
    left: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  rightDrawer: {
    right: 0,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3EDF7",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 15, fontWeight: "600", color: "#1C1B1F" },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3EDF7",
    justifyContent: "center",
    alignItems: "center",
  },
  bankHeader: {
    backgroundColor: "#E8DEF8",
    padding: 12,
    margin: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  bankBalance: { fontSize: 20, fontWeight: "700", color: "#6750A4" },
  bankSub: { fontSize: 11, color: "#49454F", marginTop: 2 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3EDF7",
    margin: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1C1B1F" },
  listContent: { paddingBottom: 20 },
  chapterRow: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7E0EC",
  },
  chapterRowLocked: { backgroundColor: "#FFFBFE", opacity: 0.8 },
  chapterRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  iconUnlocked: { backgroundColor: "#E8DEF8" },
  iconLocked: { backgroundColor: "#F3EDF7" },
  chapterText: { flex: 1 },
  chapterName: { fontSize: 13, fontWeight: "500", color: "#1C1B1F" },
  chapterId: { fontSize: 10, color: "#79747E" },
  percentBadge: {
    backgroundColor: "#F3EDF7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  percentText: { fontSize: 11, fontWeight: "600", color: "#6750A4" },
  progressTrack: {
    height: 4,
    backgroundColor: "#F3EDF7",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", borderRadius: 2 },
  modesMini: { flexDirection: "row", gap: 6 },
  miniMode: { flex: 1, alignItems: "center" },
  miniModeLabel: { fontSize: 8, color: "#938F99", marginBottom: 2 },
  miniTrack: {
    width: "100%",
    height: 3,
    backgroundColor: "#F3EDF7",
    borderRadius: 1.5,
    overflow: "hidden",
  },
  miniFill: { height: "100%", backgroundColor: "#6750A4", borderRadius: 1.5 },
  bankButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6750A4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    gap: 4,
    alignSelf: "flex-start",
  },
  bankButtonText: { fontSize: 10, color: "#FFFFFF", fontWeight: "600" },
});

export default ChapterProgressDrawer;
