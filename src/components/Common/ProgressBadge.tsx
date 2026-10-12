/**
 * Src/components/Common/ProgressBadge.tsx & src/components/Common/ProgressBadge.tsx
 * Progress Badge - Chapter Card Small Badge with Percentage
 * Icon: chart-donut-variant + 75% Text
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export interface ProgressBadgeProps {
  percent: number;
  size?: "small" | "medium" | "large";
  showIcon?: boolean;
  color?: string;
  backgroundColor?: string;
}

export const ProgressBadge: React.FC<ProgressBadgeProps> = ({
  percent,
  size = "medium",
  showIcon = true,
  color = "#6750A4",
  backgroundColor = "#F3EDF7",
}) => {
  const iconSize = size === "small" ? 12 : size === "large" ? 18 : 14;
  const fontSize = size === "small" ? 10 : size === "large" ? 14 : 12;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor },
        size === "small" && styles.smallContainer,
        size === "large" && styles.largeContainer,
      ]}
    >
      {showIcon && (
        <Icon name="chart-donut-variant" size={iconSize} color={color} />
      )}
      <Text style={[styles.text, { color, fontSize }]}>{percent}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  smallContainer: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  largeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  text: { fontWeight: "600" },
});

export default ProgressBadge;
