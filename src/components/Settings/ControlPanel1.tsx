/**
 * src/components/Settings/ControlPanel1.tsx
 * First Control Panel: Sound, Emoji, Default Icon Modes (m1, m3, m4)
 * Each has separate single row panel with Chapter Name + Two Sequential Boxes (Range)
 * Auto filter small->big or big->small
 */

import React, { useState, useCallback } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import IconMap from "../../assets/icons/iconMap";

export interface RangeFilter {
  chapterName: string;
  start: number | null;
  end: number | null;
}

export interface ControlPanel1Props {
  onFilterChange?: (mode: 1 | 3 | 4, filter: RangeFilter) => void;
}

const ModeRow: React.FC<{
  mode: 1 | 3 | 4;
  title: string;
  iconName: string;
  onFilterChange?: (filter: RangeFilter) => void;
}> = ({ mode, title, iconName, onFilterChange }) => {
  const [chapterName, setChapterName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const handleChange = useCallback(
    (newChapter: string, newStart: string, newEnd: string) => {
      setChapterName(newChapter);
      setStart(newStart);
      setEnd(newEnd);

      // Auto filter small->big or big->small
      let startNum = newStart ? parseInt(newStart, 10) : null;
      let endNum = newEnd ? parseInt(newEnd, 10) : null;

      if (
        startNum !== null &&
        endNum !== null &&
        !isNaN(startNum) &&
        !isNaN(endNum)
      ) {
        // System auto understands filter
        const min = Math.min(startNum, endNum);
        const max = Math.max(startNum, endNum);
        startNum = min;
        endNum = max;
      }

      onFilterChange?.({
        chapterName: newChapter,
        start: startNum !== null && !isNaN(startNum) ? startNum : null,
        end: endNum !== null && !isNaN(endNum) ? endNum : null,
      });
    },
    [onFilterChange]
  );

  return (
    <View style={styles.modeRow}>
      <View style={styles.modeHeader}>
        <View style={[styles.iconBox, { backgroundColor: "#E8DEF8" }]}>
          <Icon name={iconName as any} size={18} color="#6750A4" />
        </View>
        <Text style={styles.modeTitle}>{title}</Text>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>চ্যাপ্টার নাম</Text>
          <TextInput
            value={chapterName}
            onChangeText={(text) => handleChange(text, start, end)}
            placeholder="যেমন: অপরিচিতা"
            placeholderTextColor="#938F99"
            style={styles.input}
          />
        </View>

        <View style={styles.rangeGroup}>
          <View style={styles.rangeInputGroup}>
            <Text style={styles.inputLabel}>শুরু</Text>
            <TextInput
              value={start}
              onChangeText={(text) => handleChange(chapterName, text, end)}
              placeholder="১"
              placeholderTextColor="#938F99"
              keyboardType="number-pad"
              style={[styles.input, styles.rangeInput]}
            />
          </View>

          <Text style={styles.rangeSeparator}>-</Text>

          <View style={styles.rangeInputGroup}>
            <Text style={styles.inputLabel}>শেষ</Text>
            <TextInput
              value={end}
              onChangeText={(text) => handleChange(chapterName, start, text)}
              placeholder="২০"
              placeholderTextColor="#938F99"
              keyboardType="number-pad"
              style={[styles.input, styles.rangeInput]}
            />
          </View>
        </View>
      </View>

      {(chapterName || start || end) && (
        <View style={styles.filterHint}>
          <Icon name="filter-outline" size={14} color="#49454F" />
          <Text style={styles.filterHintText}>
            ফিল্টার: {chapterName || "সব"}{" "}
            {start && end
              ? `(${Math.min(
                  parseInt(start) || 0,
                  parseInt(end) || 0
                )} - ${Math.max(parseInt(start) || 0, parseInt(end) || 0)})`
              : ""}
          </Text>
        </View>
      )}
    </View>
  );
};

export const ControlPanel1: React.FC<ControlPanel1Props> = ({
  onFilterChange,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>
        প্রথম কন্ট্রোল প্যানেল (সাউন্ড, ইমোজি ও ডিফল্ট)
      </Text>
      <Text style={styles.sectionDesc}>
        প্রতিটি মোডের জন্য আলাদা রো প্যানেল, রেঞ্জ অটো ফিল্টার
      </Text>

      <ModeRow
        mode={1}
        title="সাউন্ড আইকন (m1)"
        iconName="volume-high"
        onFilterChange={(filter) => onFilterChange?.(1, filter)}
      />

      <View style={styles.separator} />

      <ModeRow
        mode={3}
        title="ডিফল্ট আইকন (m3)"
        iconName="book-open-page-variant"
        onFilterChange={(filter) => onFilterChange?.(3, filter)}
      />

      <View style={styles.separator} />

      <ModeRow
        mode={4}
        title="ইমোজি আইকন (m4)"
        iconName="lightbulb-on-outline"
        onFilterChange={(filter) => onFilterChange?.(4, filter)}
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1B1F",
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 11,
    color: "#79747E",
    marginBottom: 16,
  },
  modeRow: {
    paddingVertical: 8,
  },
  modeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1C1B1F",
  },
  filterRow: {
    marginLeft: 42,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    color: "#49454F",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E7E0EC",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    color: "#1C1B1F",
    backgroundColor: "#FFFBFE",
  },
  rangeGroup: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  rangeInputGroup: {
    flex: 1,
  },
  rangeInput: {
    textAlign: "center",
  },
  rangeSeparator: {
    fontSize: 16,
    color: "#49454F",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  filterHint: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 42,
    marginTop: 8,
    padding: 8,
    backgroundColor: "#F3EDF7",
    borderRadius: 8,
    gap: 6,
  },
  filterHintText: {
    fontSize: 11,
    color: "#49454F",
  },
  separator: {
    height: 1,
    backgroundColor: "#F3EDF7",
    marginVertical: 8,
    marginLeft: 42,
  },
});

export default ControlPanel1;
