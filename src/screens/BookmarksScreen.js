import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  Alert, ScrollView,
} from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import {
  loadBookmarkStore,
  fetchBookmarksWithCache,
  removeBookmarkLocally,
  removeBookmarkFromCache,
  flushPendingBookmarkOps,
  isOnline,
} from '../utils/bookmarkCache';

function groupByTopic(bookmarks, defaultInk, otherLabel, locale) {
  const map = {};
  for (const b of bookmarks) {
    const topic = b.facts?.topics;
    const key = topic?.name ?? otherLabel;
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
  return Object.values(map).sort((a, b) => a.title.localeCompare(b.title, locale));
}

function PageHeader({ styles, title, subtitle }) {
  const { colors } = useTheme();

  return (
    <View style={styles.pageHeader}>
      <View style={styles.logoIcon}>
        <Ionicons name="bookmark" size={28} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

export default function BookmarksScreen() {
  const { t, i18n } = useTranslation();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [sections, setSections] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [collapsedTopics, setCollapsedTopics] = useState(new Set());
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  const applyBookmarks = useCallback((bookmarks) => {
    const grouped = groupByTopic(bookmarks ?? [], colors.ink, t('common.other'), i18n.language);
    setSections(grouped);
    setTotalCount(bookmarks?.length ?? 0);
  }, [colors.ink, t, i18n.language]);

  const fetchBookmarks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const cachedStore = await loadBookmarkStore(user.id);
    if (cachedStore.bookmarks.length === 0) {
      setLoading(true);
    }
    if (cachedStore.bookmarks.length > 0) {
      applyBookmarks(cachedStore.bookmarks);
      setLoading(false);
    }

    const online = await isOnline();
    const result = await fetchBookmarksWithCache(user.id);
    applyBookmarks(result.bookmarks);
    setShowOfflineBanner(
      result.offline || result.hasPending || !result.serverSynced
    );

    setLoading(false);
  }, [applyBookmarks]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      if (online) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await flushPendingBookmarkOps(user.id);
          await fetchBookmarks();
        }
        setShowOfflineBanner(false);
      } else {
        setShowOfflineBanner(true);
      }
    });
    return unsubscribe;
  }, [fetchBookmarks]);

  const displaySections = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        itemCount: section.data.length,
        data: collapsedTopics.has(section.title) ? [] : section.data,
      })),
    [sections, collapsedTopics]
  );

  const toggleSection = (title) => {
    Haptics.selectionAsync();
    setCollapsedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookmarks();
    }, [fetchBookmarks])
  );

  const removeBookmark = (bookmarkId, factId) => {
    Alert.alert(
      t('bookmarks.removeTitle'),
      t('bookmarks.removeMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
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
            if (!user) return;

            const online = await isOnline();
            if (online) {
              await supabase
                .from('bookmarks')
                .delete()
                .eq('user_id', user.id)
                .eq('fact_id', factId);
              await removeBookmarkFromCache(user.id, factId);
            } else {
              await removeBookmarkLocally(user.id, factId);
              setShowOfflineBanner(true);
            }
          },
        },
      ]
    );
  };

  const subtitleText = sections.length === 0
    ? t('bookmarks.subtitleZero')
    : t('bookmarks.subtitleGrouped', {
      factCount: totalCount,
      topicCount: sections.length,
      factLabel: t(totalCount === 1 ? 'bookmarks.fact' : 'bookmarks.facts'),
      topicLabel: t(sections.length === 1 ? 'bookmarks.topic' : 'bookmarks.topics'),
    });

  const OfflineBanner = showOfflineBanner ? (
    <View style={styles.offlineBanner}>
      <Ionicons name="cloud-offline-outline" size={16} color={colors.muted} />
      <Text style={styles.offlineBannerText}>{t('bookmarks.offlineBanner')}</Text>
    </View>
  ) : null;

  const renderSectionHeader = ({ section }) => {
    const isCollapsed = collapsedTopics.has(section.title);

    return (
      <TouchableOpacity
        style={styles.topicRow}
        onPress={() => toggleSection(section.title)}
        activeOpacity={0.8}
      >
        <Ionicons name={section.icon} size={20} color={section.color ?? colors.ink} />
        <Text style={styles.topicRowText}>{section.title}</Text>
        <Text style={styles.sectionCount}>{section.itemCount}</Text>
        <Ionicons
          name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
          size={16}
          color={colors.muted}
        />
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    const fact = item.facts;

    return (
      <View style={styles.card}>
        <Text style={styles.factText}>{fact?.content}</Text>
        <View style={styles.cardFooter}>
          {fact?.source_name && (
            <View style={styles.sourceRow}>
              <Ionicons name="link-outline" size={14} color={colors.muted} />
              <Text style={styles.sourceText}>{fact.source_name}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeBookmark(item.id, fact.id)}
            hitSlop={8}
          >
            <Ionicons name="bookmark" size={18} color={colors.timeline.done} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && sections.length === 0) {
    return (
      <View style={styles.centered}>
        <LoadingSpinner color={colors.primary} />
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader styles={styles} title={t('bookmarks.title')} subtitle={subtitleText} />
        {OfflineBanner}
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bookmark-outline" size={32} color={colors.mutedSoft} />
          </View>
          <Text style={styles.emptyTitle}>{t('bookmarks.emptyTitle')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('bookmarks.emptySubtitle')}
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={displaySections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        extraData={collapsedTopics}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        SectionSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={() => (
          <>
            <PageHeader styles={styles} title={t('bookmarks.title')} subtitle={subtitleText} />
            {OfflineBanner}
          </>
        )}
      />
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
    scroll: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: 60,
      paddingBottom: 100,
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingTop: 60,
      paddingBottom: 100,
    },
    pageHeader: {
      marginBottom: spacing.xl,
    },
    logoIcon: {
      width: 56,
      height: 56,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    title: {
      ...typography.presets.displayMd,
      marginBottom: spacing.xs,
    },
    subtitle: {
      ...typography.presets.bodyMd,
    },
    topicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.hairlineStrong,
      backgroundColor: colors.surfaceCard,
      marginBottom: spacing.sm,
    },
    topicRowText: {
      ...typography.presets.bodyMd,
      fontFamily: typography.fontFamily.sansMedium,
      color: colors.ink,
      flex: 1,
    },
    sectionCount: {
      ...typography.presets.caption,
      fontFamily: typography.fontFamily.sansMedium,
      backgroundColor: colors.surfaceStrong,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.pill,
      overflow: 'hidden',
      color: colors.muted,
    },
    card: {
      backgroundColor: colors.surfaceCard,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.hairline,
      gap: spacing.md,
    },
    factText: {
      ...typography.presets.bodyMd,
      color: colors.ink,
      lineHeight: 24,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.hairline,
      paddingTop: spacing.sm,
    },
    sourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
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
      paddingVertical: spacing.xxl,
      gap: spacing.md,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    emptyTitle: {
      ...typography.presets.displaySm,
      textAlign: 'center',
    },
    emptySubtitle: {
      ...typography.presets.bodyMd,
      textAlign: 'center',
      color: colors.muted,
    },
    offlineBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
    },
    offlineBannerText: {
      ...typography.presets.caption,
      color: colors.muted,
      flex: 1,
    },
  });
}
