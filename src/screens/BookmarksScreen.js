import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../config/supabase';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';

function groupByTopic(bookmarks, defaultInk) {
  const map = {};
  for (const b of bookmarks) {
    const topic = b.facts?.topics;
    const key = topic?.name ?? 'Other';
    if (!map[key]) {
      map[key] = {
        title: key,
        icon: topic?.icon ?? 'flash',
        color: topic?.color ?? defaultInk,
        data: [],
      };
    }
    map[key].data.push(b);
  }
  return Object.values(map).sort((a, b) => a.title.localeCompare(b.title));
}

export default function BookmarksScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [sections, setSections] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchBookmarks();
    }, [])
  );

  const fetchBookmarks = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('bookmarks')
      .select('id, created_at, facts(id, content, source_name, source_url, topics(name, icon, color))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) {
      const grouped = groupByTopic(data ?? [], colors.ink);
      setSections(grouped);
      setTotalCount(data?.length ?? 0);
    }
    setLoading(false);
  };

  const removeBookmark = (bookmarkId, factId) => {
    Alert.alert(
      'Remove bookmark?',
      'This fact will be removed from your saved list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSections(prev =>
              prev
                .map(section => ({
                  ...section,
                  data: section.data.filter(b => b.id !== bookmarkId),
                }))
                .filter(section => section.data.length > 0)
            );
            setTotalCount(c => c - 1);
            const { data: { user } } = await supabase.auth.getUser();
            await supabase
              .from('bookmarks')
              .delete()
              .eq('user_id', user.id)
              .eq('fact_id', factId);
          },
        },
      ]
    );
  };

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconCircle, { backgroundColor: section.color + '22' }]}>
        <Ionicons name={section.icon} size={16} color={section.color} />
      </View>
      <Text style={[styles.sectionTitle, { color: section.color }]}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const fact = item.facts;

    return (
      <View style={styles.card}>
        <Text style={styles.factText} numberOfLines={4}>{fact?.content}</Text>
        <View style={styles.cardFooter}>
          {fact?.source_name && (
            <View style={styles.sourceRow}>
              <Ionicons name="link-outline" size={12} color={colors.muted} />
              <Text style={styles.sourceText}>{fact.source_name}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeBookmark(item.id, fact.id)}
          >
            <Ionicons name="bookmark" size={18} color={colors.timeline.done} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {sections.length === 0 ? (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Saved Facts</Text>
            <Text style={styles.headerSubtitle}>0 facts bookmarked</Text>
          </View>
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={64} color={colors.mutedSoft} />
            <Text style={styles.emptyTitle}>No saved facts yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the bookmark icon on any fact in your feed to save it here.
            </Text>
          </View>
        </>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          SectionSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
          ListHeaderComponent={() => (
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Saved Facts</Text>
              <Text style={styles.headerSubtitle}>
                {totalCount} {totalCount === 1 ? 'fact' : 'facts'} across {sections.length} {sections.length === 1 ? 'topic' : 'topics'}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.canvas,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.presets.displayMd,
    fontSize: typography.fontSizes.xxl,
  },
  headerSubtitle: {
    ...typography.presets.caption,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.presets.titleSm,
    flex: 1,
  },
  sectionCount: {
    ...typography.presets.caption,
    backgroundColor: colors.surfaceStrong,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  factText: {
    ...typography.presets.bodyMd,
    color: colors.ink,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  sourceText: {
    ...typography.presets.caption,
  },
  removeButton: {
    padding: spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.presets.displaySm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.presets.bodyMd,
    textAlign: 'center',
  },
  });
}
