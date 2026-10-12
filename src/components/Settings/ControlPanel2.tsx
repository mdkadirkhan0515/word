/**
 * src/components/Settings/ControlPanel2.tsx
 * Second Control Panel: Play Icon 1 & Play Icon 2 (m2 & m5)
 * Features:
 * - Parallel & Random Switch (Mutual Exclusive, can be both off)
 * - Single Card Repeat & Card-to-Card Repeat Switch (Mutual Exclusive)
 * - Single Card Repeat: Box + Chapter Name
 * - Card-to-Card Repeat: 3 Boxes (Chapter + 2 sequential)
 * - Audio Background Switch (Independent)
 * - Two independent panels for m2 & m5
 */

import React, { useState, useCallback } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export interface PlayModeFilters {
  parallel: boolean;
  random: boolean;
  singleRepeat: boolean;
  singleRepeatChapter: string;
  singleRepeatNumber: number | null;
  cardToCardRepeat: boolean;
  cardToCardChapter: string;
  cardToCardStart: number | null;
  cardToCardEnd: number | null;
  backgroundAudio: boolean;
}

export interface ControlPanel2Props {
  mode: 2 | 5;
  title: string;
  onFilterChange?: (mode: 2 | 5, filters: PlayModeFilters) => void;
}

const SwitchRow: React.FC<{
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  icon: string;
}> = ({ label, description, value, onValueChange, disabled = false, icon }) => {
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      style={({ pressed }) => [
        styles.switchRow,
        disabled && styles.switchDisabled,
        pressed && !disabled && { opacity: 0.7 },
      ]}
      disabled={disabled}
    >
      <View style={styles.switchIcon}>
        <Icon
          name={icon as any}
          size={18}
          color={value ? "#6750A4" : "#938F99"}
        />
      </View>
      <View style={styles.switchText}>
        <Text style={[styles.switchLabel, value && styles.switchLabelActive]}>
          {label}
        </Text>
        <Text style={styles.switchDesc}>{description}</Text>
      </View>
      <View style={[styles.switchTrack, value && styles.switchTrackActive]}>
        <View style={[styles.switchThumb, value && styles.switchThumbActive]} />
      </View>
    </Pressable>
  );
};

const PlayModePanel: React.FC<{
  mode: 2 | 5;
  onFilterChange?: (filters: PlayModeFilters) => void;
}> = ({ mode, onFilterChange }) => {
  const [filters, setFilters] = useState<PlayModeFilters>({
    parallel: false,
    random: false,
    singleRepeat: false,
    singleRepeatChapter: "",
    singleRepeatNumber: null,
    cardToCardRepeat: false,
    cardToCardChapter: "",
    cardToCardStart: null,
    cardToCardEnd: null,
    backgroundAudio: false,
  });

  const updateFilters = useCallback(
    (updates: Partial<PlayModeFilters>) => {
      const newFilters = { ...filters, ...updates };

      // Mutual Exclusive: Parallel & Random cannot be both ON
      if (updates.parallel === true) {
        newFilters.random = false;
      }
      if (updates.random === true) {
        newFilters.parallel = false;
      }

      // Mutual Exclusive: Single Repeat & Card-to-Card Repeat cannot be both ON
      if (updates.singleRepeat === true) {
        newFilters.cardToCardRepeat = false;
      }
      if (updates.cardToCardRepeat === true) {
        newFilters.singleRepeat = false;
      }

      setFilters(newFilters);
      onFilterChange?.(newFilters);
    },
    [filters, onFilterChange]
  );

  return (
    <View style={styles.panel}>
      {/* Parallel & Random Switches */}
      <View style={styles.switchGroup}>
        <Text style={styles.groupTitle}>ক্রমিক নিয়ন্ত্রণ</Text>
        <SwitchRow
          label="সমান্তরাল"
          description="ক্রমিক স্বাভাবিক নিয়মে আসবে"
          value={filters.parallel}
          onValueChange={(v) => updateFilters({ parallel: v })}
          icon="sort-numeric-ascending"
        />
        <SwitchRow
          label="অসমান্তরাল"
          description="ক্রমিক সংখ্যা রেন্ডম হিসেবে আসবে"
          value={filters.random}
          onValueChange={(v) => updateFilters({ random: v })}
          icon="shuffle-variant"
        />
        <Text style={styles.mutualNote}>
          * দুটি সুইচ একসাথে অন করা যাবে না, তবে একসাথে বন্ধ রাখা যাবে
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Single Card Repeat & Card-to-Card Repeat Switches */}
      <View style={styles.switchGroup}>
        <Text style={styles.groupTitle}>রিপিট নিয়ন্ত্রণ</Text>
        <SwitchRow
          label="একক কার্ড রিপিট"
          description="একটি নির্দিষ্ট কার্ড বারবার"
          value={filters.singleRepeat}
          onValueChange={(v) => updateFilters({ singleRepeat: v })}
          icon="repeat-once"
        />

        {filters.singleRepeat && (
          <View style={styles.repeatInputs}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>চ্যাপ্টার নাম</Text>
              <TextInput
                value={filters.singleRepeatChapter}
                onChangeText={(text) =>
                  updateFilters({ singleRepeatChapter: text })
                }
                placeholder="অপরিচিতা"
                style={styles.input}
                placeholderTextColor="#938F99"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>কার্ড নম্বর (যেমন ১৬)</Text>
              <TextInput
                value={filters.singleRepeatNumber?.toString() || ""}
                onChangeText={(text) => {
                  const num = text ? parseInt(text, 10) : null;
                  updateFilters({
                    singleRepeatNumber: isNaN(num as number) ? null : num,
                  });
                }}
                placeholder="১৬"
                keyboardType="number-pad"
                style={styles.input}
                placeholderTextColor="#938F99"
              />
            </View>
          </View>
        )}

        <SwitchRow
          label="কার্ড টু কার্ড রিপিট"
          description="একটি রেঞ্জের কার্ডগুলো রিপিট"
          value={filters.cardToCardRepeat}
          onValueChange={(v) => updateFilters({ cardToCardRepeat: v })}
          icon="repeat-variant"
        />

        {filters.cardToCardRepeat && (
          <View style={styles.repeatInputs}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>চ্যাপ্টার নাম</Text>
              <TextInput
                value={filters.cardToCardChapter}
                onChangeText={(text) =>
                  updateFilters({ cardToCardChapter: text })
                }
                placeholder="অপরিচিতা"
                style={styles.input}
                placeholderTextColor="#938F99"
              />
            </View>
            <View style={styles.rangeRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>শুরু</Text>
                <TextInput
                  value={filters.cardToCardStart?.toString() || ""}
                  onChangeText={(text) => {
                    const num = text ? parseInt(text, 10) : null;
                    updateFilters({
                      cardToCardStart: isNaN(num as number) ? null : num,
                    });
                  }}
                  placeholder="১"
                  keyboardType="number-pad"
                  style={styles.input}
                  placeholderTextColor="#938F99"
                />
              </View>
              <Text style={styles.rangeSep}>-</Text>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>শেষ</Text>
                <TextInput
                  value={filters.cardToCardEnd?.toString() || ""}
                  onChangeText={(text) => {
                    const num = text ? parseInt(text, 10) : null;
                    updateFilters({
                      cardToCardEnd: isNaN(num as number) ? null : num,
                    });
                  }}
                  placeholder="২০"
                  keyboardType="number-pad"
                  style={styles.input}
                  placeholderTextColor="#938F99"
                />
              </View>
            </View>
            <Text style={styles.autoNote}>
              ছোট থেকে বড় বা বড় থেকে ছোট সিস্টেম স্বয়ংক্রিয়ভাবে বুঝে ফিল্টার
              করবে
            </Text>
          </View>
        )}

        <Text style={styles.mutualNote}>
          * দুটি সুইচ একসাথে চালু করা যাবে না, তবে একসাথে বন্ধ রাখা যাবে
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Audio Background Switch - Separate Below Repeats */}
      <View style={styles.switchGroup}>
        <Text style={styles.groupTitle}>ব্যাকগ্রাউন্ড অডিও</Text>
        <SwitchRow
          label="অডিও ব্যাকগ্রাউন্ড"
          description="অ্যাপের বাইরে বা হোম স্ক্রিনেও অটো-প্লে চলবে"
          value={filters.backgroundAudio}
          onValueChange={(v) => updateFilters({ backgroundAudio: v })}
          icon="music-box-outline"
        />
      </View>
    </View>
  );
};

export const ControlPanel2: React.FC<ControlPanel2Props> = ({
  mode,
  title,
  onFilterChange,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon
            name={mode === 2 ? "play-circle-outline" : "play-speed"}
            size={22}
            color="#6750A4"
          />
        </View>
        <View>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>
            প্লে আইকন - {mode} সম্পূর্ণ স্বাধীন প্যানেল
          </Text>
        </View>
      </View>

      <PlayModePanel
        mode={mode}
        onFilterChange={(filters) => onFilterChange?.(mode, filters)}
      />
    </View>
  );
};

// Wrapper for both m2 & m5 independent panels
export const ControlPanel2Both: React.FC<{
  onFilterChange?: (mode: 2 | 5, filters: PlayModeFilters) => void;
}> = ({ onFilterChange }) => {
  return (
    <View>
      <ControlPanel2
        mode={2}
        title="প্লে আইকন - ১ (m2)"
        onFilterChange={onFilterChange}
      />
      <ControlPanel2
        mode={5}
        title="প্লে আইকন - ২ (m5)"
        onFilterChange={onFilterChange}
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
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E8DEF8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1B1F",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#79747E",
    marginTop: 2,
  },
  panel: {},
  switchGroup: {
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#49454F",
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  switchDisabled: {
    opacity: 0.5,
  },
  switchIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F3EDF7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  switchText: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1C1B1F",
  },
  switchLabelActive: {
    color: "#6750A4",
  },
  switchDesc: {
    fontSize: 11,
    color: "#79747E",
    marginTop: 1,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E7E0EC",
    justifyContent: "center",
    padding: 2,
  },
  switchTrackActive: {
    backgroundColor: "#6750A4",
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: 18 }],
  },
  mutualNote: {
    fontSize: 10,
    color: "#938F99",
    fontStyle: "italic",
    marginTop: 4,
    marginLeft: 38,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3EDF7",
    marginVertical: 12,
  },
  repeatInputs: {
    marginLeft: 38,
    marginTop: 8,
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#FFFBFE",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3EDF7",
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
    backgroundColor: "#FFFFFF",
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  rangeSep: {
    fontSize: 16,
    color: "#49454F",
    marginBottom: 10,
  },
  autoNote: {
    fontSize: 10,
    color: "#79747E",
    marginTop: 4,
    fontStyle: "italic",
  },
});

export default ControlPanel2;
