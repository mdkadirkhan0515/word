/**
 * src/screens/SettingsScreen.tsx
 * Settings Screen - Combines all Settings Panels
 * Manifesto Downloader + TTS Slider + Control Panel 1 & 2 + Theme Selector
 * Final Assembly as per Architecture
 */

import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Pressable } from "react-native";

import ManifestoDownloader, {
  ManifestoItem,
} from "../components/Settings/ManifestoDownloader";
import TTSControlSlider from "../components/Settings/TTSControlSlider";
import ControlPanel1 from "../components/Settings/ControlPanel1";
import {
  ControlPanel2Both,
  PlayModeFilters,
} from "../components/Settings/ControlPanel2";
import ThemeSelector, {
  ThemeMode,
  LanguageMode,
} from "../components/Settings/ThemeSelector";
import { ttsBrainMMKV } from "../storage/MMKVInstance";

// Fixed Manifesto JSON (Example - In real app, fetch from server or bundle)
const FIXED_MANIFESTO: ManifestoItem[] = [
  {
    manifesto_id: 1,
    chapter_id: 1,
    chapter_name: "অপরিচিতা",
    is_downloaded: 0,
  },
  { manifesto_id: 2, chapter_id: 2, chapter_name: "বিলাসী", is_downloaded: 0 },
  { manifesto_id: 3, chapter_id: 3, chapter_name: "হৈমন্তী", is_downloaded: 0 },
  { manifesto_id: 4, chapter_id: 4, chapter_name: "নববর্ষ", is_downloaded: 0 },
  {
    manifesto_id: 5,
    chapter_id: 5,
    chapter_name: "সহযাত্রী",
    is_downloaded: 0,
  },
];

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation() as any;
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  const handleFilterChange = useCallback((mode: number, filter: any) => {
    setActiveFilters((prev) => ({ ...prev, [`mode_${mode}`]: filter }));
    // Save to MMKV for use in Chapter/Word screens
    ttsBrainMMKV.set(`filter_mode_${mode}`, JSON.stringify(filter));
    console.log(`[Settings] Mode ${mode} filter:`, filter);
  }, []);

  const handlePlayFilterChange = useCallback(
    (mode: 2 | 5, filters: PlayModeFilters) => {
      setActiveFilters((prev) => ({ ...prev, [`play_mode_${mode}`]: filters }));
      ttsBrainMMKV.set(`play_filter_mode_${mode}`, JSON.stringify(filters));
      console.log(`[Settings] Play Mode ${mode} filters:`, filters);
    },
    []
  );

  const handleThemeChange = (theme: ThemeMode) => {
    console.log(`[Settings] Theme changed to: ${theme}`);
    // In real app, update ThemeContext
  };

  const handleLanguageChange = (lang: LanguageMode) => {
    console.log(`[Settings] Language changed to: ${lang}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={22} color="#1C1B1F" />
        </Pressable>
        <Text style={styles.headerTitle}>সেটিংস</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Manifesto Download List */}
        <ManifestoDownloader
          manifestData={FIXED_MANIFESTO}
          onDownloadComplete={(chapter_id) => {
            Alert.alert(
              "ডাউনলোড সম্পন্ন",
              `চ্যাপ্টার ${chapter_id} ডাউনলোড হয়েছে`
            );
          }}
          onDeleteComplete={(chapter_id) => {
            Alert.alert(
              "ডিলিট সম্পন্ন",
              `চ্যাপ্টার ${chapter_id} ডিলিট হয়েছে`
            );
          }}
        />

        {/* 2. TTS Control Slider + Time Gap */}
        <TTSControlSlider />

        {/* 3. First Control Panel (m1, m3, m4) */}
        <ControlPanel1 onFilterChange={handleFilterChange} />

        {/* 4. Second Control Panel (m2 & m5 Independent) */}
        <ControlPanel2Both onFilterChange={handlePlayFilterChange} />

        {/* 5. Theme & Language Selector */}
        <ThemeSelector
          onThemeChange={handleThemeChange}
          onLanguageChange={handleLanguageChange}
        />

        {/* Debug Info */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>ডিবাগ তথ্য</Text>
          <Text style={styles.debugText}>
            Active Filters: {Object.keys(activeFilters).length}
          </Text>
          <Text style={styles.debugText}>
            MMKV Keys: {ttsBrainMMKV.getAllKeys().length}
          </Text>
          <Pressable
            onPress={() => {
              Alert.alert("ক্যাশ ক্লিয়ার", "সব ফিল্টার রিসেট করবেন?", [
                { text: "বাতিল", style: "cancel" },
                {
                  text: "রিসেট",
                  style: "destructive",
                  onPress: () => {
                    ttsBrainMMKV.clearAll();
                    setActiveFilters({});
                    Alert.alert("রিসেট সম্পন্ন");
                  },
                },
              ]);
            }}
            style={styles.resetButton}
          >
            <Icon name="delete-sweep-outline" size={18} color="#BA1A1A" />
            <Text style={styles.resetText}>সব ফিল্টার রিসেট</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBFE" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3EDF7",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3EDF7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "600", color: "#1C1B1F" },
  headerRight: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20, paddingTop: 8 },
  debugContainer: {
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: "#FFE082",
  },
  debugTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F57F17",
    marginBottom: 8,
  },
  debugText: { fontSize: 11, color: "#795548", marginBottom: 4 },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFDAD6",
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
    justifyContent: "center",
  },
  resetText: { fontSize: 12, fontWeight: "600", color: "#BA1A1A" },
});

export default SettingsScreen;
