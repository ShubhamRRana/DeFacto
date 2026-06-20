import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { topicCardTint, withAlpha } from '../utils/color';

const MIN_COUNT = 5;
const MAX_COUNT = 30;
const STEP = 5;
const TIME_FACTORS = { easy: 0.6, medium: 0.8, hard: 1.1 };
const SCREEN_HEIGHT = Dimensions.get('window').height;

const DIFFICULTY_OPTIONS = [
  { value: 'easy' },
  { value: 'medium' },
  { value: 'hard' },
];

function StepperButton({ label, active, accent, colors, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        stepperStyles.btn,
        active
          ? { backgroundColor: accent, borderWidth: 0 }
          : {
              backgroundColor: colors.surfaceCard,
              borderWidth: 1.5,
              borderColor: colors.hairline,
            },
      ]}
    >
      <Text
        style={[
          stepperStyles.btnText,
          { color: active ? colors.onPrimary : colors.mutedSoft },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const stepperStyles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 26,
    lineHeight: 28,
    paddingBottom: 2,
  },
});

function BookmarkToggle({ value, accent, colors, onToggle }) {
  const knobLeft = useSharedValue(value ? 22 : 3);

  useEffect(() => {
    knobLeft.value = withTiming(value ? 22 : 3, { duration: 200 });
  }, [value, knobLeft]);

  const knobStyle = useAnimatedStyle(() => ({
    left: knobLeft.value,
  }));

  return (
    <Pressable
      onPress={onToggle}
      style={[
        toggleStyles.track,
        { backgroundColor: value ? accent : colors.surfaceStrong },
      ]}
    >
      <Animated.View
        style={[
          toggleStyles.knob,
          { backgroundColor: colors.surfaceCard, shadowColor: colors.ink },
          knobStyle,
        ]}
      />
    </Pressable>
  );
}

const toggleStyles = StyleSheet.create({
  track: {
    width: 48,
    height: 29,
    borderRadius: 16,
    position: 'relative',
  },
  knob: {
    position: 'absolute',
    top: 3,
    width: 23,
    height: 23,
    borderRadius: 12,
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});

export default function SessionConfigSheet({
  visible,
  topics,
  onClose,
  onStart,
  starting,
}) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const topicList = topics ?? [];
  const primaryTopic = topicList[0];
  const accent = primaryTopic?.color ?? colors.primary;
  const isMulti = topicList.length > 1;
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const [count, setCount] = React.useState(10);
  const [difficulty, setDifficulty] = React.useState('medium');
  const [includeBookmarks, setIncludeBookmarks] = React.useState(false);
  const [mounted, setMounted] = useState(false);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useLayoutEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;
      translateY.value = withTiming(0, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, { duration: 280 });
    } else if (mounted) {
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration: 260,
        easing: Easing.in(Easing.cubic),
      }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
      backdropOpacity.value = withTiming(0, { duration: 240 });
    }
  }, [visible, mounted, translateY, backdropOpacity]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const topicKey = topicList.map((topic) => topic.id).join(',');

  useEffect(() => {
    if (visible) {
      setCount(10);
      setDifficulty('medium');
      setIncludeBookmarks(false);
    }
  }, [visible, topicKey]);

  const canDecrement = count > MIN_COUNT;
  const canIncrement = count < MAX_COUNT;
  const difficultyLabel = t(`quiz.difficulty.${difficulty}`);
  const estimatedMinutes = Math.max(1, Math.round(count * (TIME_FACTORS[difficulty] ?? 0.8)));

  const handleDecrement = () => {
    if (!canDecrement) return;
    Haptics.selectionAsync();
    setCount((c) => Math.max(MIN_COUNT, c - STEP));
  };

  const handleIncrement = () => {
    if (!canIncrement) return;
    Haptics.selectionAsync();
    setCount((c) => Math.min(MAX_COUNT, c + STEP));
  };

  const handleDifficulty = (value) => {
    Haptics.selectionAsync();
    setDifficulty(value);
  };

  const handleToggleBookmarks = () => {
    Haptics.selectionAsync();
    setIncludeBookmarks((v) => !v);
  };

  const handleStart = () => {
    if (topicList.length === 0) return;
    onStart({ topicIds: topicList.map((t) => t.id), count, difficulty, includeBookmarks });
  };

  if (!mounted) return null;

  return (
    <Modal visible={mounted} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            backdropStyle,
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 30) },
            sheetStyle,
          ]}
        >
            <View style={styles.handle} />

            <View style={styles.header}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: topicCardTint(accent, 0.75, colors.surfaceCard) },
                ]}
              >
                <Ionicons name={primaryTopic?.icon ?? 'help-circle'} size={22} color={accent} />
                {isMulti && (
                  <View style={[styles.iconBadge, { backgroundColor: accent }]}>
                    <Text style={styles.iconBadgeText}>+{topicList.length - 1}</Text>
                  </View>
                )}
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title} numberOfLines={2}>
                  {isMulti
                    ? t('quiz.session.topicsCount', { count: topicList.length })
                    : primaryTopic?.name ?? t('quiz.defaultTopic')}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {isMulti ? topicList.map((tp) => tp.name).join(' · ') : t('quiz.session.configure')}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>{t('quiz.session.numberOfQuestions')}</Text>
            <View style={styles.stepperCard}>
              <StepperButton
                label="−"
                active={canDecrement}
                accent={accent}
                colors={colors}
                onPress={handleDecrement}
                disabled={!canDecrement}
              />
              <View style={styles.countBlock}>
                <Text style={styles.countValue}>{count}</Text>
                <Text style={styles.countUnit}>{t('quiz.session.questions')}</Text>
              </View>
              <StepperButton
                label="+"
                active={canIncrement}
                accent={accent}
                colors={colors}
                onPress={handleIncrement}
                disabled={!canIncrement}
              />
            </View>

            <Text style={styles.sectionLabel}>{t('quiz.session.difficulty')}</Text>
            <View style={styles.difficultyTrack}>
              {DIFFICULTY_OPTIONS.map((d) => {
                const selected = difficulty === d.value;
                return (
                  <TouchableOpacity
                    key={d.value}
                    style={[
                      styles.difficultySegment,
                      selected && { backgroundColor: accent },
                    ]}
                    onPress={() => handleDifficulty(d.value)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.difficultyText,
                        selected && styles.difficultyTextSelected,
                      ]}
                    >
                      {t(`quiz.difficulty.${d.value}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.estimateBanner}>
              <Text style={styles.estimateIcon}>⏱</Text>
              <Text style={styles.estimateText}>
                {t('quiz.session.estimatedTime')}{' '}
                <Text style={styles.estimateStrong}>
                  {t('quiz.session.estimatedMinutes', { count: estimatedMinutes })}
                </Text>
                {' · '}
                {difficultyLabel}
              </Text>
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t('quiz.session.includeBookmarks')}</Text>
              <BookmarkToggle
                value={includeBookmarks}
                accent={accent}
                colors={colors}
                onToggle={handleToggleBookmarks}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.startButton,
                { backgroundColor: accent },
                starting && styles.startButtonDisabled,
                pressed && !starting && styles.startButtonPressed,
              ]}
              onPress={handleStart}
              disabled={starting}
            >
              <Text style={styles.startButtonText}>
                {starting ? t('quiz.session.starting') : t('quiz.session.startQuiz')}
              </Text>
            </Pressable>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      backgroundColor: withAlpha(colors.ink, 0.4),
    },
    sheet: {
      backgroundColor: colors.canvas,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 26,
      paddingTop: 18,
      shadowColor: colors.ink,
      shadowOpacity: 0.12,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: -8 },
      elevation: 12,
    },
    handle: {
      width: 40,
      height: 5,
      backgroundColor: colors.hairlineStrong,
      borderRadius: 3,
      alignSelf: 'center',
      marginBottom: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
    },
    iconBox: {
      width: 46,
      height: 46,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    iconBadge: {
      position: 'absolute',
      bottom: -5,
      right: -5,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.canvas,
    },
    iconBadgeText: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 10,
      fontWeight: '600',
      color: colors.onPrimary,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontFamily: typography.fontFamily.serifDisplayMedium,
      fontSize: 28,
      lineHeight: 30,
      color: colors.ink,
      fontWeight: '500',
    },
    subtitle: {
      fontFamily: typography.fontFamily.ui,
      fontSize: 13,
      color: colors.muted,
      marginTop: 4,
    },
    sectionLabel: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.9,
      color: colors.mutedSoft,
      marginTop: 26,
      marginBottom: 12,
    },
    stepperCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 18,
    },
    countBlock: {
      alignItems: 'center',
    },
    countValue: {
      fontFamily: typography.fontFamily.serifDisplayMedium,
      fontSize: 46,
      lineHeight: 48,
      color: colors.ink,
      fontWeight: '500',
    },
    countUnit: {
      fontFamily: typography.fontFamily.ui,
      fontSize: 11,
      color: colors.mutedSoft,
      letterSpacing: 0.6,
      marginTop: 3,
    },
    difficultyTrack: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceStrong,
      borderRadius: 14,
      padding: 4,
    },
    difficultySegment: {
      flex: 1,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 11,
    },
    difficultyText: {
      fontFamily: typography.fontFamily.ui,
      fontSize: 14,
      color: colors.muted,
    },
    difficultyTextSelected: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontWeight: '600',
      color: colors.onPrimary,
    },
    estimateBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      backgroundColor: colors.surfaceStrong,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 15,
      marginTop: 18,
    },
    estimateIcon: {
      fontSize: 16,
    },
    estimateText: {
      flex: 1,
      fontFamily: typography.fontFamily.ui,
      fontSize: 13.5,
      color: colors.body,
    },
    estimateStrong: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontWeight: '600',
      color: colors.primary,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 18,
      paddingHorizontal: 2,
    },
    toggleLabel: {
      fontFamily: typography.fontFamily.ui,
      fontSize: 15,
      color: colors.ink,
    },
    startButton: {
      height: 56,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      shadowColor: colors.primary,
      shadowOpacity: 0.32,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    startButtonPressed: {
      transform: [{ scale: 0.985 }],
    },
    startButtonDisabled: {
      opacity: 0.6,
    },
    startButtonText: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 17,
      fontWeight: '600',
      color: colors.onPrimary,
    },
    cancelButton: {
      alignItems: 'center',
      marginTop: 16,
      paddingVertical: 8,
    },
    cancelText: {
      fontFamily: typography.fontFamily.ui,
      fontSize: 15,
      color: colors.muted,
    },
  });
}
