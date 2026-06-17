import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../config/supabase';
import { colors, typography, spacing, borderRadius } from '../theme/colors';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - spacing.lg * 2 - spacing.md) / 2;
const MIN_TOPICS = 3;

export default function TopicPickerScreen({ onComplete }) {
  const [topics, setTopics] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const renderTopic = ({ item, index }) => {
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
          {/* Selected checkmark */}
          {isSelected && (
            <View style={styles.checkmark}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          )}

          {/* Icon circle */}
          <View style={[styles.iconCircle, { backgroundColor: item.color + '22' }]}>
            <Ionicons name={item.icon} size={28} color={item.color} />
          </View>

          <Text style={styles.topicName}>{item.name}</Text>
          <Text style={styles.topicDesc} numberOfLines={2}>{item.description}</Text>

          {/* Selected border overlay */}
          {isSelected && (
            <LinearGradient
              colors={[item.color + '33', item.color + '11']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={styles.emoji}>🎯</Text>
        <Text style={styles.title}>What interests you?</Text>
        <Text style={styles.subtitle}>
          Pick at least {MIN_TOPICS} topics to personalize your De'Facto feed
        </Text>

        {/* Selection counter */}
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

      {/* Topic grid */}
      <FlatList
        data={topics}
        renderItem={renderTopic}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />

      {/* Continue button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, selected.size < MIN_TOPICS && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={saving || selected.size < MIN_TOPICS}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={selected.size >= MIN_TOPICS ? colors.gradientPrimary : ['#333', '#444']}
            style={styles.continueGradient}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.continueText}>
                  {selected.size < MIN_TOPICS
                    ? `Pick ${MIN_TOPICS - selected.size} more`
                    : 'Start Exploring'}
                </Text>
                {selected.size >= MIN_TOPICS && (
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                )}
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
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
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  counter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  counterReady: {
    backgroundColor: colors.primary + '22',
    borderColor: colors.primary,
  },
  counterText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  counterTextReady: {
    color: colors.primary,
  },
  counterHint: {
    fontSize: typography.fontSizes.sm,
    color: colors.success,
    fontWeight: typography.fontWeights.medium,
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    minHeight: 130,
  },
  topicCardSelected: {
    borderColor: colors.primary,
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
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  topicDesc: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
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
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  continueButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  continueButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  continueText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: '#fff',
  },
});
