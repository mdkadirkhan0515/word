/**
 * src/screens/DailyEventScreen.tsx
 * Daily Event Center - 🎯 Center UI with 4 Stages
 * Shows: 490% Bank Header + Stage 1 ACTIVE + Stage 2,3,4 LOCKED + Event Cards
 * Each Card: [Icon] [Chapter #ID] [+1%] - No Extra Text
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DailyEventCenter, { DailyEventState } from '../services/EventEngine/DailyEventCenter';
import EventCard from '../components/Cards/EventCard';
import BankManager from '../storage/DailyBank/BankManager';
import WordTable from '../database/WordTable';
import { dailyBankMMKV } from '../storage/MMKVInstance';
import SQLiteManager from '../database/SQLiteManager';

export const DailyEventScreen: React.FC = () => {
  const navigation = useNavigation() as any;
  const insets = useSafeAreaInsets();
  const [eventState, setEventState] = useState<DailyEventState | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [chapterWordIds, setChapterWordIds] = useState<number[]>([]);

  const loadEventData = useCallback(async () => {
    // For demo, get all words from first chapter or all
    // In real app, pass chapterWordIds from Home or combine all chapters
    try {
      const db = await SQLiteManager.getDB();
      const [result] = await db.executeSql('SELECT word_id FROM WordTable LIMIT 20;');
      const ids: number[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        ids.push(result.rows.item(i).word_id);
      }

      if (ids.length === 0) {
        // Fallback mock IDs for demo
        setChapterWordIds([101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120]);
      } else {
        setChapterWordIds(ids);
      }

      const state = await DailyEventCenter.initialize(ids.length > 0 ? ids : [101, 102, 103, 104, 105]);
      setEventState(state);
    } catch (error) {
      console.error('[DailyEventScreen] Load failed:', error);
      // Fallback with mock
      const mockIds = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
      setChapterWordIds(mockIds);
      const state = await DailyEventCenter.initialize(mockIds);
      setEventState(state);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      DailyEventCenter.resetIfNewDay();
      loadEventData();
    }, [loadEventData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEventData();
    setRefreshing(false);
  }, [loadEventData]);

  const handleCardPress = async (cardId: string) => {
    if (!eventState) return;

    // Find card
    const allCards = [
      ...eventState.stages.stage1.cards,
      ...eventState.stages.stage2.cards,
      ...eventState.stages.stage3.cards,
      ...eventState.stages.stage4.cards,
    ];
    const card = allCards.find(c => c.id === cardId);
    if (!card) return;

    // Navigate to WordDetail for first word in card
    const firstWordId = card.wordIds[0];
    const word = await WordTable.getWordById(firstWordId);

    if (word) {
      navigation.navigate('WordDetail', {
        word_id: word.word_id,
        display_word_id: word.display_word_id,
        chapter_name: word.chapter_name,
        chapter_id: word.chapter_id,
        fromEvent: true,
        eventCardId: cardId,
      });

      // Simulate completion after navigation (in real app, on return)
      // For now, mark as completed when pressed
      const result = await DailyEventCenter.onCardCompleted(card);
      await loadEventData();
    }
  };

  if (!eventState) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text>লোড হচ্ছে...</Text>
      </View>
    );
  }

  const renderStage = (stageNum: 1 | 2 | 3 | 4, stageData: DailyEventState['stages'][`stage${1 | 2 | 3 | 4}`], title: string) => {
    const isLocked = stageData.isLocked;
    const completedCount = stageData.completedCount;
    const totalCount = stageData.totalCount;

    return (
      <View key={stageNum} style={[styles.stageContainer, isLocked && styles.stageLocked]}>
        <View style={styles.stageHeader}>
          <View style={styles.stageTitleRow}>
            <View style={[styles.stageIconBox, isLocked ? styles.stageIconLocked : styles.stageIconActive]}>
              <Icon name={isLocked ? 'lock-outline' : 'play-circle-outline'} size={18} color={isLocked ? '#938F99' : '#FFFFFF'} />
            </View>
            <View>
              <Text style={[styles.stageTitle, isLocked && styles.stageTitleLocked]}>{title}</Text>
              <Text style={styles.stageSub}>
                {isLocked ? `পর্যায় ${stageNum - 1} এর সকল টাস্ক সম্পন্ন করুন` : `${completedCount}/${totalCount} সম্পন্ন • ${stageData.creditEarned}% অর্জিত`}
              </Text>
            </View>
          </View>
          <View style={[styles.creditBadge, isLocked && styles.creditBadgeLocked]}>
            <Text style={[styles.creditBadgeText, isLocked && styles.creditBadgeTextLocked]}>৫%</Text>
          </View>
        </View>

        {isLocked ? (
          <View style={styles.lockedOverlay}>
            <Icon name="lock-outline" size={32} color="#E7E0EC" />
            <Text style={styles.lockedText}>লকড - আগের পর্যায় শেষ করুন</Text>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {stageData.cards.length === 0 ? (
              <Text style={styles.noCardsText}>এই পর্যায়ে কোনো কার্ড নেই - দুর্দান্ত! সব সম্পন্ন</Text>
            ) : (
              stageData.cards.map(card => (
                <EventCard
                  key={card.id}
                  id={card.id}
                  iconName={card.modeIcon}
                  title={card.title}
                  creditPercent={card.creditPercent}
                  stage={card.stage}
                  mode={card.mode}
                  isLocked={false}
                  isCompleted={false}
                  onPress={handleCardPress}
                />
              ))
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={22} color="#1C1B1F" />
        </Pressable>
        <Text style={styles.headerTitle}>🎯 ডেইলি ইভেন্ট সেন্টার</Text>
        <Pressable onPress={onRefresh} style={styles.refreshButton}>
          <Icon name="refresh" size={20} color="#49454F" />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Bank Header - 490% Credit */}
        <View style={styles.bankHeader}>
          <View style={styles.bankRow}>
            <Icon name="calendar-check-outline" size={20} color="#6750A4" />
            <Text style={styles.bankTitle}>ডেইলি ব্যাংক টোটাল ব্যালেন্স:</Text>
          </View>
          <Text style={styles.bankBalance}>{eventState.bankBalance}% ক্রেডিট</Text>
          <Text style={styles.bankSub}>(আজকের অর্জন: +{eventState.todayEarned}% | মোট উপলব্ধ: {eventState.bankBalance}%)</Text>
          <View style={styles.bankProgress}>
            <View style={[styles.bankFill, { width: `${Math.min(100, eventState.bankBalance)}%` }]} />
          </View>
        </View>

        {/* 4 Stages */}
        {renderStage(1, eventState.stages.stage1, 'পর্যায় ১ (ACTIVE) — ৫%')}
        {renderStage(2, eventState.stages.stage2, 'পর্যায় ২ (LOCKED) — ৫%')}
        {renderStage(3, eventState.stages.stage3, 'পর্যায় ৩ (LOCKED) — ৫%')}
        {renderStage(4, eventState.stages.stage4, 'পর্যায় ৪ (LOCKED) — ৫%')}

        <View style={styles.footer}>
          <Text style={styles.footerText}>প্রতিদিন ২০% ক্রেডিট উপার্জন করুন (৪ পর্যায় × ৫%)</Text>
          <Text style={styles.footerSub}>দুর্বলতম শব্দগুলো স্বয়ংক্রিয়ভাবে সনাক্ত</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBFE' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3EDF7' },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3EDF7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1C1B1F' },
  refreshButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3EDF7', justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  bankHeader: { backgroundColor: '#FFFFFF', margin: 16, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E7E0EC', elevation: 2 },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  bankTitle: { fontSize: 13, fontWeight: '500', color: '#49454F' },
  bankBalance: { fontSize: 24, fontWeight: '700', color: '#6750A4' },
  bankSub: { fontSize: 11, color: '#79747E', marginTop: 4 },
  bankProgress: { height: 6, backgroundColor: '#F3EDF7', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  bankFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 3 },
  stageContainer: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#E7E0EC', overflow: 'hidden' },
  stageLocked: { opacity: 0.7, backgroundColor: '#FFFBFE' },
  stageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F3EDF7' },
  stageTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  stageIconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stageIconActive: { backgroundColor: '#6750A4' },
  stageIconLocked: { backgroundColor: '#E7E0EC' },
  stageTitle: { fontSize: 14, fontWeight: '600', color: '#1C1B1F' },
  stageTitleLocked: { color: '#938F99' },
  stageSub: { fontSize: 11, color: '#79747E', marginTop: 2 },
  creditBadge: { backgroundColor: '#E8DEF8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  creditBadgeLocked: { backgroundColor: '#F3EDF7' },
  creditBadgeText: { fontSize: 12, fontWeight: '700', color: '#6750A4' },
  creditBadgeTextLocked: { color: '#938F99' },
  lockedOverlay: { padding: 30, alignItems: 'center', justifyContent: 'center' },
  lockedText: { fontSize: 12, color: '#938F99', marginTop: 8 },
  cardsList: { paddingVertical: 8 },
  noCardsText: { fontSize: 12, color: '#4CAF50', textAlign: 'center', padding: 16, fontStyle: 'italic' },
  footer: { alignItems: 'center', padding: 20, marginTop: 10 },
  footerText: { fontSize: 12, fontWeight: '500', color: '#49454F' },
  footerSub: { fontSize: 11, color: '#938F99', marginTop: 4 },
});

export default DailyEventScreen;

