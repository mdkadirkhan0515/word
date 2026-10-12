/**
 * src/components/Cards/ModeCard.tsx
 * Core Word Detail Card - m1-m5 Modes
 * Layout: 40% Top Header, 20% Core Content (Fixed Width, Unlimited Height), 20% Bottom Padding
 * Features: TTS Play/Stop, Yellow+Primary Highlight, Border Glow, MMKV Progress
 */

import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTTS } from "../../hooks/useTTS";
import IconMap, { getModeIcon } from "../../assets/icons/iconMap";
import { useTheme } from "@react-native-material/core";
import {
  Radius,
  Spacing,
  getCardContainerStyle,
  getInnerRadius,
} from "../../theme/radius";
import { Typography, FontSizeControl } from "../../theme/typography";

export interface ModeCardProps {
  word_id: number;
  display_word_id: number;
  chapter_name: string;
  content: string;
  mode: 1 | 2 | 3 | 4 | 5;
  isActive?: boolean;
  fontSize?: number;
  onProgressUpdate?: (word_id: number, mode: number) => void;
  onComplete?: (word_id: number) => void;
}

export const ModeCard: React.FC<ModeCardProps> = ({
  word_id,
  display_word_id,
  chapter_name,
  content,
  mode,
  isActive = false,
  fontSize = 16,
  onProgressUpdate,
  onComplete,
}) => {
  const theme = useTheme() as any;
  const colors = theme?.colors || {
    surface: "#FFFFFF",
    border: "#E7E0EC",
    primary: "#6750A4",
    text: "#1C1B1F",
    highlightYellow: "#FFEB3B",
    highlightPrimaryGlow: "rgba(103, 80, 164, 0.15)",
  };

  const modeKey = `m${mode}` as keyof typeof IconMap.modes;
  const iconInfo = IconMap.modes[modeKey];
  const modeLabel = `m${mode}`;

  // TTS Hook - Implements m1/m4 Card Tap = Play/Stop, m2/m5 Empty Space = Pause/Resume
  const {
    isPlaying,
    isPaused,
    ttsState,
    handleCardPress,
    handleEmptySpacePress,
    highlightedSegments,
    getCardStyle,
    getTextStyle,
  } = useTTS({
    word_id,
    fullText: content,
    mode: modeLabel as any,
    theme: colors,
    autoPlayGapMs: 300,
    onComplete: (id) => {
      onProgressUpdate?.(id, mode);
      onComplete?.(id);
    },
  });

  // For m1 & m4: Card tap = Play/Stop
  // For m2 & m5: Card tap also triggers but Empty Space is primary controller
  const onCardPress = useCallback(async () => {
    await handleCardPress();
  }, [handleCardPress]);

  const onEmptySpacePress = useCallback(async () => {
    // Only for m2 & m5
    if (mode === 2 || mode === 5) {
      await handleEmptySpacePress();
    }
  }, [mode, handleEmptySpacePress]);

  const cardStyle = getCardStyle(isActive);
  const isHighlighted = isPlaying;

  return (
    <View style={styles.container}>
      {/* Top 20% Empty Area - For m2/m5 Controller (Pause/Resume) */}
      {(mode === 2 || mode === 5) && (
        <Pressable
          onPress={onEmptySpacePress}
          style={styles.emptyControlArea}
          testID="empty-top-control"
        >
          <View style={styles.emptyHint} />
        </Pressable>
      )}

      {/* Middle 20% Core Content Area - Fixed Width, Unlimited Height */}
      <Pressable
        onPress={onCardPress}
        style={[
          getCardContainerStyle(isHighlighted, colors),
          cardStyle,
          isActive && styles.activeCard,
          isHighlighted && { borderColor: colors.primary, borderWidth: 1.5 },
        ]}
        testID={`mode-card-${word_id}-${mode}`}
      >
        {/* Header: Icon + Chapter + Display ID */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <Icon
              name={iconInfo.name as any}
              size={IconMap.modes[modeKey].size}
              color={isPlaying ? colors.primary : "#888888"}
            />
          </View>
          <View style={styles.headerText}>
            <Text
              style={[
                styles.chapterName,
                { color: colors.text, fontSize: fontSize - 2 },
              ]}
              numberOfLines={1}
            >
              {chapter_name} #{display_word_id}
            </Text>
            <Text
              style={[
                styles.modeLabel,
                { color: "#888888", fontSize: fontSize - 4 },
              ]}
            >
              {iconInfo.label} - {modeLabel}
            </Text>
          </View>
          <View style={styles.statusIcon}>
            {isPlaying ? (
              <Icon name="volume-high" size={18} color={colors.primary} />
            ) : isPaused ? (
              <Icon name="pause" size={18} color="#888888" />
            ) : null}
          </View>
        </View>

        {/* Content: Highlighted Text */}
        <View style={styles.contentArea}>
          <Text
            style={[
              styles.contentText,
              { fontSize, lineHeight: fontSize * 1.5 },
            ]}
          >
            {highlightedSegments.map((seg, idx) => (
              <Text key={idx} style={getTextStyle(seg.highlighted) as any}>
                {seg.text}
              </Text>
            ))}
          </Text>
        </View>

        {/* Progress Bar for Active TTS */}
        {isPlaying && (
          <View
            style={[styles.progressBar, { backgroundColor: colors.primary }]}
          />
        )}
      </Pressable>

      {/* Bottom 20% Empty Area - For m2/m5 Controller */}
      {(mode === 2 || mode === 5) && (
        <Pressable
          onPress={onEmptySpacePress}
          style={styles.emptyControlArea}
          testID="empty-bottom-control"
        >
          <View style={styles.emptyHint} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  emptyControlArea: {
    height: 60, // 20% empty area for m2/m5 control
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyHint: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    opacity: 0.5,
  },
  activeCard: {
    borderWidth: 1.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12, // Inner = Outer - Padding
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  chapterName: {
    fontWeight: "600",
    fontSize: 14,
  },
  modeLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statusIcon: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  contentArea: {
    minHeight: 40,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#1C1B1F",
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 12,
    width: "100%",
  },
});

export default ModeCard;
