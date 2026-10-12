/**
 * src/components/Settings/ManifestoDownloader.tsx
 * Manifesto JSON Download List
 * Row: Left Serial No | Middle Chapter Name | Right Download/Delete Icon Toggle
 * Vector Icons Only
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import SQLiteManager from "../../database/SQLiteManager";
import WordTable from "../../database/WordTable";
import ChapterTable from "../../database/ChapterTable";

export interface ManifestoItem {
  manifesto_id: number;
  chapter_id: number;
  chapter_name: string;
  is_downloaded: 0 | 1;
  json_data?: string | null;
}

export interface ManifestoDownloaderProps {
  manifestData: ManifestoItem[]; // Fixed manifest JSON list
  onDownloadComplete?: (chapter_id: number) => void;
  onDeleteComplete?: (chapter_id: number) => void;
}

export const ManifestoDownloader: React.FC<ManifestoDownloaderProps> = ({
  manifestData,
  onDownloadComplete,
  onDeleteComplete,
}) => {
  const [items, setItems] = useState<ManifestoItem[]>(manifestData);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  useEffect(() => {
    loadDownloadStatus();
  }, []);

  const loadDownloadStatus = async () => {
    try {
      const [result] = await SQLiteManager.executeSql(
        "SELECT manifesto_id, is_downloaded FROM ManifestoTable;"
      );
      const statusMap = new Map<number, number>();
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        statusMap.set(row.manifesto_id, row.is_downloaded);
      }

      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          is_downloaded: (statusMap.get(item.manifesto_id) as 0 | 1) || 0,
        }))
      );
    } catch (error) {
      console.error("[ManifestoDownloader] Load status failed:", error);
    }
  };

  const handleDownload = useCallback(async (item: ManifestoItem) => {
    setLoadingId(item.manifesto_id);
    try {
      // Simulate JSON data parsing - in real app, item.json_data is the chapter words JSON
      // For demo, we create mock words
      const mockWords = Array.from({ length: 20 }, (_, i) => ({
        word_id: item.chapter_id * 1000 + i,
        display_word_id: i + 1,
        chapter_id: item.chapter_id,
        chapter_name: item.chapter_name,
        content: `Content for ${item.chapter_name} word ${i + 1}`,
        view_id: 0,
      }));

      // Bulk upsert to WordTable
      await WordTable.bulkUpsert(mockWords);

      // Upsert to ChapterTable
      await ChapterTable.upsertChapter({
        chapter_id: item.chapter_id,
        chapter_name: item.chapter_name,
        total_words: mockWords.length,
        completed_words: 0,
        unlocked_id: 0,
        target_percentage: 50,
      });

      // Save to ManifestoTable as downloaded
      await SQLiteManager.executeSql(
        `INSERT OR REPLACE INTO ManifestoTable (manifesto_id, chapter_id, chapter_name, is_downloaded, downloaded_at)
         VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP);`,
        [item.manifesto_id, item.chapter_id, item.chapter_name]
      );

      setItems((prev) =>
        prev.map((p) =>
          p.manifesto_id === item.manifesto_id ? { ...p, is_downloaded: 1 } : p
        )
      );
      onDownloadComplete?.(item.chapter_id);
      console.log(
        `[ManifestoDownloader] Downloaded chapter ${item.chapter_id}`
      );
    } catch (error) {
      console.error(
        `[ManifestoDownloader] Download failed for ${item.chapter_id}:`,
        error
      );
      Alert.alert("ডাউনলোড ব্যর্থ", "আবার চেষ্টা করুন");
    } finally {
      setLoadingId(null);
    }
  }, []);

  const handleDelete = useCallback(async (item: ManifestoItem) => {
    Alert.alert(
      "ডিলিট করুন?",
      `${item.chapter_name} ডিলিট করলে সব প্রোগ্রেস মুছে যাবে`,
      [
        { text: "বাতিল", style: "cancel" },
        {
          text: "ডিলিট",
          style: "destructive",
          onPress: async () => {
            setLoadingId(item.manifesto_id);
            try {
              await WordTable.deleteByChapter(item.chapter_id);
              await SQLiteManager.executeSql(
                "DELETE FROM ManifestoTable WHERE manifesto_id = ?;",
                [item.manifesto_id]
              );
              await SQLiteManager.executeSql(
                "DELETE FROM ChapterTable WHERE chapter_id = ?;",
                [item.chapter_id]
              );

              setItems((prev) =>
                prev.map((p) =>
                  p.manifesto_id === item.manifesto_id
                    ? { ...p, is_downloaded: 0 }
                    : p
                )
              );
              onDeleteComplete?.(item.chapter_id);
              console.log(
                `[ManifestoDownloader] Deleted chapter ${item.chapter_id}`
              );
            } catch (error) {
              console.error("[ManifestoDownloader] Delete failed:", error);
            } finally {
              setLoadingId(null);
            }
          },
        },
      ]
    );
  }, []);

  const renderItem = ({
    item,
    index,
  }: {
    item: ManifestoItem;
    index: number;
  }) => {
    const isDownloaded = item.is_downloaded === 1;
    const isLoading = loadingId === item.manifesto_id;

    return (
      <View style={styles.row}>
        {/* Left: Serial No */}
        <View style={styles.left}>
          <Text style={styles.serial}>{index + 1}</Text>
        </View>

        {/* Middle: Chapter Name */}
        <View style={styles.middle}>
          <Text style={styles.chapterName} numberOfLines={1}>
            {item.chapter_name}
          </Text>
          <Text style={styles.chapterId}>Chapter #{item.chapter_id}</Text>
        </View>

        {/* Right: Download/Delete Icon Toggle */}
        <View style={styles.right}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#6750A4" />
          ) : (
            <Pressable
              onPress={() =>
                isDownloaded ? handleDelete(item) : handleDownload(item)
              }
              style={({ pressed }) => [
                styles.iconButton,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Icon
                name={
                  isDownloaded
                    ? "delete-circle-outline"
                    : "download-circle-outline"
                }
                size={24}
                color={isDownloaded ? "#BA1A1A" : "#6750A4"}
              />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ম্যানিফেস্টো ডেটা ম্যানেজমেন্ট</Text>
        <Text style={styles.headerSubtitle}>
          ফিক্সড ম্যানিফেস্টো JSON থেকে ডাউনলোড
        </Text>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => `manifesto-${item.manifesto_id}`}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#E7E0EC",
  },
  header: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1B1F",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#49454F",
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  left: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E7E0EC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  serial: {
    fontSize: 12,
    fontWeight: "600",
    color: "#49454F",
  },
  middle: {
    flex: 1,
  },
  chapterName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1C1B1F",
  },
  chapterId: {
    fontSize: 11,
    color: "#79747E",
    marginTop: 2,
  },
  right: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  separator: {
    height: 1,
    backgroundColor: "#F3EDF7",
  },
});

export default ManifestoDownloader;
