import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import { useQuiz } from '../hooks/useQuiz';
import LeaderboardRow from '../components/LeaderboardRow';

function getWeekResetLabel() {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const reset = new Date(now);
  reset.setDate(now.getDate() + daysUntilMonday);
  reset.setHours(0, 0, 0, 0);
  return reset.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function LeaderboardScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const { leaderboard, userTopics, loadLeaderboard, loading } = useQuiz();
  const [tab, setTab] = useState('global');
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setCurrentUserId(user?.id ?? null);
      });
      if (tab === 'topic' && !selectedTopicId && userTopics.length > 0) {
        setSelectedTopicId(userTopics[0].id);
        return;
      }
      const topicId = tab === 'topic' ? selectedTopicId : null;
      if (tab === 'topic' && !topicId) return;
      loadLeaderboard(topicId);
    }, [tab, selectedTopicId, userTopics, loadLeaderboard])
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.resetLabel}>Resets {getWeekResetLabel()} (UTC week)</Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'global' && styles.tabActive]}
          onPress={() => setTab('global')}
        >
          <Text style={[styles.tabText, tab === 'global' && styles.tabTextActive]}>Global</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'topic' && styles.tabActive]}
          onPress={() => setTab('topic')}
        >
          <Text style={[styles.tabText, tab === 'topic' && styles.tabTextActive]}>By Topic</Text>
        </TouchableOpacity>
      </View>

      {tab === 'topic' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topicPicker}>
          {userTopics.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              style={[
                styles.topicChip,
                selectedTopicId === topic.id && styles.topicChipActive,
              ]}
              onPress={() => setSelectedTopicId(topic.id)}
            >
              <Text
                style={[
                  styles.topicChipText,
                  selectedTopicId === topic.id && styles.topicChipTextActive,
                ]}
              >
                {topic.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : leaderboard.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="trophy-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyText}>No scores yet this week.</Text>
          <Text style={styles.emptyHint}>Complete a quiz to appear on the board!</Text>
        </View>
      ) : (
        <ScrollView style={styles.list}>
          {leaderboard.map((row) => (
            <LeaderboardRow
              key={`${row.user_id}-${row.rank}`}
              rank={row.rank}
              name={row.full_name}
              score={row.composite_score}
              accuracy={row.accuracy}
              isCurrentUser={row.user_id === currentUserId}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.canvas,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    headerTitle: {
      ...typography.presets.titleMd,
    },
    resetLabel: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    tabs: {
      flexDirection: 'row',
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      backgroundColor: colors.surfaceStrong,
      borderRadius: borderRadius.md,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderRadius: borderRadius.sm,
    },
    tabActive: {
      backgroundColor: colors.surfaceCard,
    },
    tabText: {
      fontSize: 14,
      color: colors.muted,
    },
    tabTextActive: {
      color: colors.ink,
      fontWeight: '600',
    },
    topicPicker: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      maxHeight: 44,
    },
    topicChip: {
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.pill,
      borderWidth: 1,
      borderColor: colors.hairline,
      marginRight: spacing.sm,
      backgroundColor: colors.surfaceCard,
    },
    topicChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.canvasSoft,
    },
    topicChipText: {
      fontSize: 13,
      color: colors.ink,
    },
    topicChipTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    list: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    loader: {
      marginTop: spacing.xxl,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    emptyText: {
      fontSize: 16,
      color: colors.ink,
      marginTop: spacing.base,
    },
    emptyHint: {
      fontSize: 14,
      color: colors.muted,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
  });
}
