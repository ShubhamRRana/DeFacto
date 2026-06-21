import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, Animated,
  Dimensions,
} from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import { useTheme } from '../theme/ThemeContext';
import { useLocale } from '../theme/LocaleContext';
import { spacing, borderRadius } from '../theme/colors';
import InterestsToolbar from '../components/InterestsToolbar';
import { filterTopics } from '../utils/topics';
import { callGenerateFacts } from '../utils/generateFacts';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - spacing.lg * 2 - spacing.md) / 2;
const MIN_TOPICS = 3;

export default function EditInterestsScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const { locale } = useLocale();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [topics, setTopics] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const previousSelectedRef = useRef(new Set());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const filteredTopics = useMemo(
    () => filterTopics(topics, searchQuery),
    [topics, searchQuery]
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    const [{ data: allTopics }, { data: userTopics }] = await Promise.all([
      supabase.from('topics').select('*').order('name'),
      supabase.from('user_topics').select('topic_id').eq('user_id', user.id),
    ]);

    const initialSelected = new Set(userTopics?.map(t => t.topic_id) ?? []);
    setTopics(allTopics ?? []);
    setSelected(initialSelected);
    previousSelectedRef.current = initialSelected;
    setLoading(false);

    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const toggleTopic = (topicId) => {
    Haptics.selectionAsync();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(topicId) ? next.delete(topicId) : next.add(topicId);
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size < MIN_TOPICS) {
      Alert.alert(t('interests.tooFewTitle'), t('interests.tooFewMessage', { count: MIN_TOPICS }));
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('user_topics').delete().eq('user_id', user.id);

    const rows = Array.from(selected).map(topic_id => ({ user_id: user.id, topic_id }));
    const { error } = await supabase.from('user_topics').insert(rows);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common.error'), t('interests.saveError'));
      setSaving(false);
      return;
    }

    const newlyAdded = Array.from(selected).filter(
      (id) => !previousSelectedRef.current.has(id)
    );

    if (newlyAdded.length > 0) {
      callGenerateFacts(user.id, newlyAdded, locale).catch(() => {});
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    navigation.goBack();
  };

  const renderTopic = ({ item }) => {
    const isSelected = selected.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.topicCard, isSelected && styles.topicCardSelected]}
        onPress={() => toggleTopic(item.id)}
        activeOpacity={0.8}
      >
        {isSelected && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
          </View>
        )}
        <View style={[styles.iconCircle, { backgroundColor: item.color + '22' }]}>
          <Ionicons name={item.icon} size={28} color={item.color} />
        </View>
        <Text style={styles.topicName}>{item.name}</Text>
        <Text style={styles.topicDesc} numberOfLines={2}>{item.description}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <LoadingSpinner color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('interests.myTitle')}</Text>
          <Text style={styles.subtitle}>{t('interests.selectedCount', { count: selected.size })}</Text>
        </View>
      </View>

      <InterestsToolbar
        searchQuery={searchQuery}
        onChangeQuery={setSearchQuery}
      />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={filteredTopics}
          renderItem={renderTopic}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            searchQuery.trim() ? (
              <Text style={styles.emptySearch}>{t('onboarding.emptySearch')}</Text>
            ) : null
          }
        />
      </Animated.View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, selected.size < MIN_TOPICS && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || selected.size < MIN_TOPICS}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Text style={styles.saveText}>{t('interests.save')}</Text>
              <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  centered: { flex: 1, backgroundColor: colors.canvas, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  backButton: {
    width: 40, height: 40, borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    justifyContent: 'center', alignItems: 'center',
  },
  headerText: { flex: 1 },
  title: { ...typography.presets.titleMd, fontSize: typography.fontSizes.xl },
  subtitle: { ...typography.presets.caption, marginTop: 2 },
  emptySearch: {
    ...typography.presets.bodySm,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  grid: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 120 },
  row: { gap: spacing.md, marginBottom: spacing.md },
  topicCard: {
    width: CARD_SIZE, backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden', minHeight: 130,
  },
  topicCardSelected: {
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.canvasSoft,
  },
  checkmark: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', zIndex: 1,
  },
  iconCircle: {
    width: 52, height: 52, borderRadius: borderRadius.md,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  topicName: { ...typography.presets.titleSm, fontSize: typography.fontSizes.sm, marginBottom: 4 },
  topicDesc: { ...typography.presets.caption, lineHeight: 16 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.lg, paddingBottom: 40, paddingTop: spacing.md,
    backgroundColor: colors.canvas, borderTopWidth: 1, borderTopColor: colors.hairline,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    gap: 10,
    height: 48,
  },
  saveButtonDisabled: { backgroundColor: colors.mutedSoft },
  saveText: { ...typography.presets.button, color: colors.onPrimary, fontSize: typography.fontSizes.md },
  });
}
