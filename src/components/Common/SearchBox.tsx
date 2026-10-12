/**
 * Src/components/Common/SearchBox.tsx & src/components/Common/SearchBox.tsx
 * Search Box - Magnify + Close Circle Outline, No Hardcode
 */

import React, { useState } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export interface SearchBoxProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChangeText,
  placeholder = "সার্চ করুন...",
  onClear,
}) => {
  const handleClear = () => {
    onChangeText("");
    onClear?.();
  };

  return (
    <View style={styles.container}>
      <Icon name="magnify" size={20} color="#938F99" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#938F99"
        style={styles.input}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable onPress={handleClear} style={styles.clearButton}>
          <Icon name="close-circle-outline" size={20} color="#938F99" />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3EDF7",
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12, // Inner = Outer - Padding
    gap: 8,
    borderWidth: 1,
    borderColor: "#E7E0EC",
  },
  input: { flex: 1, fontSize: 14, color: "#1C1B1F" },
  clearButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default SearchBox;
