import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert,
} from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme/colors';
import { useQuiz } from '../hooks/useQuiz';
import { topicCardTint } from '../utils/color';
import SessionConfigSheet from '../components/SessionConfigSheet';

const MAX_TOPICS = 5;

export default function QuizHomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const {
    userTopics,
    loading,
    loadingStep,
    fetchQuizProfile,
    startSession,
  } = useQuiz();

  const [selectedIds, setSelectedIds] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [starting, setStarting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchQuizProfile();
    }, [fetchQuizProfile])
  );

  const navigateToStack = (screen, params) => {
    const parent = navigation.getParent();
    if (parent) parent.navigate(screen, params);
    else navigation.navigate(screen, params);
  };

  const selectedTopics = useMemo(
    () => userTopics.filter((topic) => selectedIds.includes(topic.id)),
    [userTopics, selectedIds]
  );

  const handleTopicPress = (topic) => {
    Haptics.selectionAsync();
    setSelectedIds((prev) => {
      if (prev.includes(topic.id)) return prev.filter((id) => id !== topic.id);
      if (prev.length >= MAX_TOPICS) return prev;
      return [...prev, topic.id];
    });
  };

  const handleOpenConfig = () => {
    if (selectedTopics.length === 0) return;
    Haptics.selectionAsync();
    setShowConfig(true);
  };

  const handleStartQuiz = async (config) => {
    setStarting(true);
    setShowConfig(false);
    try {
      const result = await startSession(config);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedIds([]);
      navigateToStack('QuizPlay', { topicName: result.topicName });
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('quiz.couldNotStart'), err.message ?? t('common.tryAgain'));
    } finally {
      setStarting(false);
    }
  };

  const summaryTitle = selectedTopics.length === 1
    ? selectedTopics[0].name
    : t('quiz.session.topicsSelected', { count: selectedTopics.length });
  const summaryHint = selectedTopics.length === 1
    ? t('quiz.session.readyHint')
    : selectedTopics.map((topic) => topic.name).join(' · ');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          selectedTopics.length > 0 && styles.scrollWithBar,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('quiz.title')}</Text>
        <Text style={styles.subtitle}>{t('quiz.subtitle')}</Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('quiz.yourTopics')}</Text>
          <Text style={styles.sectionHint}>{t('quiz.tapToSelect')}</Text>
        </View>

        {loading && userTopics.length === 0 ? (
          <LoadingSpinner color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.topicList}>
            {userTopics.map((topic) => {
              const accent = topic.color ?? colors.primary;
              const selected = selectedIds.includes(topic.id);
              return (
                <TouchableOpacity
                  key={topic.id}
                  style={[styles.topicRow, { backgroundColor: topicCardTint(accent, 0.85, colors.surfaceCard) }]}
                  onPress={() => handleTopicPress(topic)}
                  activeOpacity={0.8}
                >
                  <View style={styles.topicRowLeft}>
                    <View style={[styles.topicIconCircle, { backgroundColor: colors.surfaceCard }]}>
                      <Ionicons name={topic.icon ?? 'help-circle'} size={16} color={accent} />
                    </View>
                    <Text style={styles.topicName} numberOfLines={1}>{topic.name}</Text>
                  </View>

                  <View
                    style={[
                      styles.radio,
                      selected
                        ? { backgroundColor: colors.primary, borderWidth: 0 }
                        : { backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 2, borderColor: 'rgba(0,0,0,0.18)' },
                    ]}
                  >
                    {selected && <Ionicons name="checkmark" size={15} color={colors.onPrimary} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigateToStack('Leaderboard')}
          >
            <Ionicons name="trophy-outline" size={17} color={colors.body} />
            <Text style={styles.actionText}>{t('quiz.leaderboardLabel')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {selectedTopics.length > 0 && !starting && (
        <View style={[styles.selectionBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionTitle} numberOfLines={1}>{summaryTitle}</Text>
            <Text style={styles.selectionHint} numberOfLines={1}>{summaryHint}</Text>
          </View>
          <TouchableOpacity
            style={[styles.startPill, { backgroundColor: colors.primary }]}
            onPress={handleOpenConfig}
            activeOpacity={0.85}
          >
            <Text style={styles.startPillText}>{t('quiz.session.startQuiz')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {starting && (
        <View style={styles.loadingOverlay}>
          <LoadingSpinner color={colors.primary} />
          <Text style={styles.loadingText}>{loadingStep || t('quiz.preparing')}</Text>
          <Text style={styles.loadingHint}>{t('quiz.preparingHint')}</Text>
        </View>
      )}

      <SessionConfigSheet
        visible={showConfig}
        topics={selectedTopics}
        onClose={() => setShowConfig(false)}
        onStart={handleStartQuiz}
        starting={starting}
      />
    </View>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.canvas,
    },
    scroll: {
      paddingHorizontal: 24,
      paddingTop: 3,
      paddingBottom: spacing.xxl,
    },
    scrollWithBar: {
      paddingBottom: 110,
    },
    title: {
      fontFamily: typography.fontFamily.serifDisplayMedium,
      fontSize: 38,
      lineHeight: 38,
      letterSpacing: -0.4,
      color: colors.ink,
      marginBottom: 5,
    },
    subtitle: {
      fontFamily: typography.fontFamily.ui,
      fontSize: 15.5,
      color: colors.muted,
      marginBottom: 13,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 9,
    },
    sectionTitle: {
      fontFamily: typography.fontFamily.serifDisplayMedium,
      fontSize: 19,
      color: colors.ink,
    },
    sectionHint: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 0.5,
      color: colors.mutedSoft,
    },
    topicList: {
      flexDirection: 'column',
      gap: 11,
      marginBottom: 9,
    },
    topicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      borderRadius: 18,
      paddingVertical: 13,
      paddingHorizontal: 15,
      minHeight: 58,
    },
    topicRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
      flex: 1,
      minWidth: 0,
    },
    topicIconCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    topicName: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 15.5,
      fontWeight: '700',
      color: colors.ink,
      flexShrink: 1,
    },
    radio: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 11,
      marginBottom: 16,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      height: 46,
      backgroundColor: colors.surfaceCard,
      borderRadius: 14,
      shadowColor: colors.ink,
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    actionText: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 13.5,
      color: colors.body,
    },
    loader: {
      marginVertical: spacing.xl,
    },
    selectionBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surfaceCard,
      borderTopWidth: 0.5,
      borderTopColor: colors.hairline,
      paddingHorizontal: 22,
      paddingTop: 14,
      shadowColor: colors.ink,
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: -4 },
      elevation: 6,
    },
    selectionInfo: {
      flex: 1,
    },
    selectionTitle: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.ink,
    },
    selectionHint: {
      fontFamily: typography.fontFamily.ui,
      fontSize: 11.5,
      color: colors.muted,
      marginTop: 2,
    },
    startPill: {
      paddingHorizontal: 22,
      height: 46,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    startPillText: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.onPrimary,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.canvas + 'EE',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    loadingText: {
      marginTop: spacing.base,
      fontSize: 16,
      color: colors.ink,
      fontWeight: '600',
    },
    loadingHint: {
      marginTop: spacing.xs,
      fontSize: 13,
      color: colors.muted,
    },
  });
}
