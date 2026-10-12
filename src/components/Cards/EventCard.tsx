/**
 * src/components/Cards/EventCard.tsx
 * Daily Event Center Card - No Extra Text, Only [Icon] [Chapter #ID] [+1%]
 * Vector Icons Only, No Emoji
 * Example: [lightbulb-on-outline] অপরিচিতা #৩৫ [+1%]
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import {
  Radius,
  Spacing,
  getCardContainerStyle,
  getInnerRadius,
} from "../../theme/radius";
import { Typography } from "../../theme/typography";

export interface EventCardProps {
  id: string;
  iconName: string; // volume-high, play-circle-outline etc
  title: string; // "অপরিচিতা #৩৫, #৭৮, #৮৮"
  creditPercent: number; // +1%
  isCompleted?: boolean;
  isLocked?: boolean;
  stage: 1 | 2 | 3 | 4;
  mode: 1 | 2 | 3 | 4 | 5;
  onPress?: (id: string) => void;
  onCompleted?: (id: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  id,
  iconName,
  title,
  creditPercent,
  isCompleted = false,
  isLocked = false,
  stage,
  mode,
  onPress,
}) => {
  const handlePress = () => {
    if (isLocked || isCompleted) {
      return;
    }
    onPress?.(id);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        getCardContainerStyle(false, {
          surface: "#FFFFFF",
          border: "#E7E0EC",
          primary: "#6750A4",
        }),
        isCompleted && styles.completedContainer,
        isLocked && styles.lockedContainer,
        pressed && !isLocked && !isCompleted && styles.pressedContainer,
      ]}
      disabled={isLocked || isCompleted}
      testID={`event-card-${id}`}
    >
      {/* Left: Vector Icon (No Emoji) */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isCompleted
              ? "#E8F5E9"
              : isLocked
              ? "#F3EDF7"
              : "#E8DEF8",
          },
        ]}
      >
        <Icon
          name={iconName as any}
          size={20}
          color={isCompleted ? "#2E7D32" : isLocked ? "#938F99" : "#6750A4"}
        />
      </View>

      {/* Middle: Chapter + Display IDs (No extra text) */}
      <View style={styles.middle}>
        <Text
          style={[
            styles.title,
            isLocked && styles.lockedText,
            isCompleted && styles.completedText,
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text style={styles.stageLabel}>
          পর্যায় {stage} • Mode {mode}
        </Text>
      </View>

      {/* Right: [+1%] Badge */}
      <View
        style={[
          styles.creditBadge,
          isCompleted && styles.creditCompleted,
          isLocked && styles.creditLocked,
        ]}
      >
        {isLocked ? (
          <Icon name="lock-outline" size={14} color="#938F99" />
        ) : isCompleted ? (
          <Icon name="check" size={14} color="#2E7D32" />
        ) : (
          <Text
            style={[
              styles.creditText,
              isCompleted && styles.creditTextCompleted,
            ]}
          >
            +{creditPercent}%
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E0EC",
    marginVertical: 6,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  completedContainer: {
    backgroundColor: "#E8F5E9",
    borderColor: "#81C784",
    opacity: 0.8,
  },
  lockedContainer: {
    backgroundColor: "#F3EDF7",
    borderColor: "#E7E0EC",
    opacity: 0.6,
  },
  pressedContainer: {
    transform: [{ scale: 0.98 }],
    backgroundColor: "#E8DEF8",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12, // Inner = Outer - Padding
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  middle: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1B1F",
    lineHeight: 20,
  },
  stageLabel: {
    fontSize: 11,
    color: "#49454F",
    marginTop: 2,
  },
  lockedText: {
    color: "#938F99",
  },
  completedText: {
    color: "#2E7D32",
    textDecorationLine: "line-through",
  },
  creditBadge: {
    minWidth: 44,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E8DEF8",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  creditCompleted: {
    backgroundColor: "#C8E6C9",
  },
  creditLocked: {
    backgroundColor: "#E7E0EC",
  },
  creditText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6750A4",
  },
  creditTextCompleted: {
    color: "#2E7D32",
  },
});

export default EventCard;
