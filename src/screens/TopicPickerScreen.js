import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, Animated,
  Dimensions,
} from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../config/supabase';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import AddCustomTopicModal from '../components/AddCustomTopicModal';
import InterestsToolbar from '../components/InterestsToolbar';
import { filterTopics, createCustomTopic, upsertTopicInList } from '../utils/topics';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - spacing.lg * 2 - spacing.md) / 2;
const MIN_TOPICS = 3;

export default function TopicPickerScreen({ onComplete }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [topics, setTopics] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingTopic, setAddingTopic] = useState(false);

  const filteredTopics = useMemo(
    () => filterTopics(topics, searchQuery),
    [topics, searchQuery]
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    const { data, error } = await supabase.from('topics').select('*').order('name');
    if (error) {
      Alert.alert('Error', 'Could not load topics. Please restart the app.');
    } else {
      setTopics(data);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      ]).start();
    }
    setLoading(false);
  };

  const toggleTopic = (topicId) => {
    Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  const handleAddCustomTopic = async (name) => {
    setAddingTopic(true);
    try {
      const topic = await createCustomTopic(name);
      setTopics((prev) => upsertTopicInList(prev, topic));
      setSelected((prev) => new Set(prev).add(topic.id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddModal(false);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err.message ?? 'Could not add your interest. Please try again.');
    } finally {
      setAddingTopic(false);
    }
  };

  const handleContinue = async () => {
    if (selected.size < MIN_TOPICS) {
      Alert.alert(
        'Pick more topics',
        `Please select at least ${MIN_TOPICS} topics to personalize your feed.`
      );
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data: { user } } = await supabase.auth.getUser();

    const rows = Array.from(selected).map((topic_id) => ({
      user_id: user.id,
      topic_id,
    }));

    const { error } = await supabase.from('user_topics').upsert(rows, { onConflict: 'user_id,topic_id' });

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', `Could not save your topics.\n\n${error.message}`);
      setSaving(false);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    onComplete();
  };

  const renderTopic = ({ item }) => {
    const isSelected = selected.has(item.id);
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
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
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={styles.emoji}>🎯</Text>
        <Text style={styles.title}>What interests you?</Text>
        <Text style={styles.subtitle}>
          Pick at least {MIN_TOPICS} topics to personalize your De'Facto feed
        </Text>

        <View style={styles.counterRow}>
          <View style={[
            styles.counter,
            selected.size >= MIN_TOPICS && styles.counterReady,
          ]}>
            <Text style={[
              styles.counterText,
              selected.size >= MIN_TOPICS && styles.counterTextReady,
            ]}>
              {selected.size} selected
            </Text>
          </View>
          {selected.size >= MIN_TOPICS && (
            <Text style={styles.counterHint}>Looking good!</Text>
          )}
        </View>
      </Animated.View>

      <InterestsToolbar
        searchQuery={searchQuery}
        onChangeQuery={setSearchQuery}
        onAddPress={() => setShowAddModal(true)}
      />

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
            <Text style={styles.emptySearch}>No interests match your search</Text>
          ) : null
        }
      />

      <AddCustomTopicModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddCustomTopic}
        saving={addingTopic}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            selected.size < MIN_TOPICS && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={saving || selected.size < MIN_TOPICS}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Text style={styles.continueText}>
                {selected.size < MIN_TOPICS
                  ? `Pick ${MIN_TOPICS - selected.size} more`
                  : 'Start Exploring'}
              </Text>
              {selected.size >= MIN_TOPICS && (
                <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.canvas,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.presets.displayMd,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.presets.bodyMd,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    width: '100%',
  },
  emptySearch: {
    ...typography.presets.bodySm,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  counter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  counterReady: {
    backgroundColor: colors.canvasSoft,
    borderColor: colors.primary,
  },
  counterText: {
    ...typography.presets.bodySm,
    fontFamily: typography.fontFamily.sansMedium,
    color: colors.muted,
  },
  counterTextReady: {
    color: colors.primary,
  },
  counterHint: {
    ...typography.presets.bodySm,
    fontFamily: typography.fontFamily.sansMedium,
    color: colors.success,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  row: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  topicCard: {
    width: CARD_SIZE,
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
    minHeight: 130,
  },
  topicCardSelected: {
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.canvasSoft,
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  topicName: {
    ...typography.presets.titleSm,
    fontSize: typography.fontSizes.sm,
    marginBottom: 4,
  },
  topicDesc: {
    ...typography.presets.caption,
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    paddingTop: spacing.md,
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    gap: 10,
    height: 48,
  },
  continueButtonDisabled: {
    backgroundColor: colors.mutedSoft,
  },
  continueText: {
    ...typography.presets.button,
    color: colors.onPrimary,
    fontSize: typography.fontSizes.md,
  },
  });
}
