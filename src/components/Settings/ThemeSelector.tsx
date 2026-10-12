/**
 * src/components/Settings/ThemeSelector.tsx
 * Theme / Appearance Selection + Language Selection
 * No Switch, Direct Click, 3 Options Visible Side-by-Side
 * Dark, Light, System Default + Bengali, English, System
 */

import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { ttsBrainMMKV } from "../../storage/MMKVInstance";

export type ThemeMode = "light" | "dark" | "system";
export type LanguageMode = "bengali" | "english" | "system";

export interface ThemeSelectorProps {
  onThemeChange?: (theme: ThemeMode) => void;
  onLanguageChange?: (lang: LanguageMode) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  onThemeChange,
  onLanguageChange,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>("system");
  const [selectedLang, setSelectedLang] = useState<LanguageMode>("system");

  useEffect(() => {
    const savedTheme = ttsBrainMMKV.getString("app_theme") as ThemeMode;
    const savedLang = ttsBrainMMKV.getString("app_language") as LanguageMode;
    if (savedTheme) {
      setSelectedTheme(savedTheme);
    }
    if (savedLang) {
      setSelectedLang(savedLang);
    }
  }, []);

  const handleThemeSelect = (theme: ThemeMode) => {
    setSelectedTheme(theme);
    ttsBrainMMKV.set("app_theme", theme);
    onThemeChange?.(theme);
  };

  const handleLangSelect = (lang: LanguageMode) => {
    setSelectedLang(lang);
    ttsBrainMMKV.set("app_language", lang);
    onLanguageChange?.(lang);
  };

  const ThemeOption: React.FC<{
    mode: ThemeMode;
    icon: string;
    label: string;
    selected: boolean;
    onPress: () => void;
  }> = ({ icon, label, selected, onPress }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionCard,
        selected && styles.optionSelected,
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        <Icon
          name={icon as any}
          size={22}
          color={selected ? "#FFFFFF" : "#49454F"}
        />
      </View>
      <Text
        style={[styles.optionLabel, selected && styles.optionLabelSelected]}
      >
        {label}
      </Text>
      {selected && (
        <View style={styles.checkMark}>
          <Icon name="check-circle" size={18} color="#6750A4" />
        </View>
      )}
    </Pressable>
  );

  const LangOption: React.FC<{
    mode: LanguageMode;
    icon: string;
    label: string;
    subLabel: string;
    selected: boolean;
    onPress: () => void;
  }> = ({ icon, label, subLabel, selected, onPress }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionCard,
        selected && styles.optionSelected,
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        <Icon
          name={icon as any}
          size={20}
          color={selected ? "#FFFFFF" : "#49454F"}
        />
      </View>
      <Text
        style={[styles.optionLabel, selected && styles.optionLabelSelected]}
      >
        {label}
      </Text>
      <Text style={styles.optionSubLabel}>{subLabel}</Text>
      {selected && (
        <View style={styles.checkMark}>
          <Icon name="check-circle" size={18} color="#6750A4" />
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Theme Selection - 3 options side by side, no switch, direct click */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="theme-light-dark" size={20} color="#6750A4" />
          <Text style={styles.sectionTitle}>থিম বা অ্যাপিয়ারেন্স</Text>
        </View>
        <Text style={styles.sectionDesc}>
          কার্ডের ভেতরে সরাসরি ক্লিক - কোনো সুইচ ছাড়া
        </Text>

        <View style={styles.optionsRow}>
          <ThemeOption
            mode="light"
            icon="weather-sunny"
            label="Light"
            selected={selectedTheme === "light"}
            onPress={() => handleThemeSelect("light")}
          />
          <ThemeOption
            mode="dark"
            icon="weather-night"
            label="Dark"
            selected={selectedTheme === "dark"}
            onPress={() => handleThemeSelect("dark")}
          />
          <ThemeOption
            mode="system"
            icon="cellphone-cog"
            label="System"
            selected={selectedTheme === "system"}
            onPress={() => handleThemeSelect("system")}
          />
        </View>
      </View>

      <View style={styles.divider} />

      {/* Language Selection - 3 options */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="translate" size={20} color="#6750A4" />
          <Text style={styles.sectionTitle}>ভাষা পরিবর্তন</Text>
        </View>
        <Text style={styles.sectionDesc}>
          বাংলা / ইংরেজি সিলেক্ট - পাশে সিলেক্টেড মার্ক
        </Text>

        <View style={styles.optionsRow}>
          <LangOption
            mode="bengali"
            icon="alpha-b-box"
            label="Bengali"
            subLabel="বাংলা"
            selected={selectedLang === "bengali"}
            onPress={() => handleLangSelect("bengali")}
          />
          <LangOption
            mode="english"
            icon="earth"
            label="English"
            subLabel="English"
            selected={selectedLang === "english"}
            onPress={() => handleLangSelect("english")}
          />
          <LangOption
            mode="system"
            icon="cellphone-cog"
            label="System"
            subLabel="Default"
            selected={selectedLang === "system"}
            onPress={() => handleLangSelect("system")}
          />
        </View>
      </View>

      {/* App Version Info - Bottom */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>অ্যাপ ভার্সন: 1.0.0 (Build 100)</Text>
        <Text style={styles.versionSubText}>
          Production Ready • Offline-First
        </Text>
      </View>
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
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1B1F",
    marginLeft: 8,
  },
  sectionDesc: {
    fontSize: 11,
    color: "#79747E",
    marginLeft: 28,
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 10,
    marginLeft: 4,
  },
  optionCard: {
    flex: 1,
    backgroundColor: "#FFFBFE",
    borderWidth: 1,
    borderColor: "#E7E0EC",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    minHeight: 90,
    position: "relative",
  },
  optionSelected: {
    borderColor: "#6750A4",
    borderWidth: 1.5,
    backgroundColor: "#E8DEF8",
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3EDF7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  optionIconSelected: {
    backgroundColor: "#6750A4",
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#49454F",
    textAlign: "center",
  },
  optionLabelSelected: {
    color: "#1C1B1F",
    fontWeight: "600",
  },
  optionSubLabel: {
    fontSize: 10,
    color: "#79747E",
    marginTop: 2,
  },
  checkMark: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3EDF7",
    marginVertical: 12,
  },
  versionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3EDF7",
    alignItems: "center",
  },
  versionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#49454F",
  },
  versionSubText: {
    fontSize: 10,
    color: "#938F99",
    marginTop: 2,
  },
});

export default ThemeSelector;
