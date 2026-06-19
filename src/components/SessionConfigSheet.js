import React, { useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Pressable,
} from 'react-native';
import Animated, {
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { topicCardTint } from '../utils/color';

const SHEET_BG = '#F4F3EC';
const ACCENT = '#E8590C';
const MIN_COUNT = 5;
const MAX_COUNT = 30;
const STEP = 5;
const TIME_FACTORS = { easy: 0.6, medium: 0.8, hard: 1.1 };

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

function StepperButton({ label, active, accent, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        stepperStyles.btn,
        active
          ? { backgroundColor: accent, borderWidth: 0 }
          : { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E4E2D8' },
      ]}
    >
      <Text style={[stepperStyles.btnText, { color: active ? '#fff' : '#c4c2b8' }]}>
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

function BookmarkToggle({ value, accent, onToggle }) {
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
        { backgroundColor: value ? accent : '#dcdad0' },
      ]}
    >
      <Animated.View style={[toggleStyles.knob, knobStyle]} />
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
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});

export default function SessionConfigSheet({
  visible,
  topic,
  onClose,
  onStart,
  starting,
}) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const accent = topic?.color ?? colors.primary ?? ACCENT;
  const styles = useMemo(() => createStyles(typography), [typography]);

  const [count, setCount] = React.useState(10);
  const [difficulty, setDifficulty] = React.useState('medium');
  const [includeBookmarks, setIncludeBookmarks] = React.useState(false);

  useEffect(() => {
    if (visible) {
      setCount(10);
      setDifficulty('medium');
      setIncludeBookmarks(false);
    }
  }, [visible, topic?.id]);

  const canDecrement = count > MIN_COUNT;
  const canIncrement = count < MAX_COUNT;
  const difficultyLabel = DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)?.label ?? 'Medium';
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
    if (!topic) return;
    onStart({ topicId: topic.id, count, difficulty, includeBookmarks });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            entering={SlideInDown.duration(420).springify().damping(18)}
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 30) }]}
          >
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={[styles.iconBox, { backgroundColor: topicCardTint(accent, 0.75) }]}>
                <Ionicons name={topic?.icon ?? 'help-circle'} size={22} color={accent} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title} numberOfLines={2}>{topic?.name ?? 'Quiz'}</Text>
                <Text style={styles.subtitle}>Configure your quiz session</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>NUMBER OF QUESTIONS</Text>
            <View style={styles.stepperCard}>
              <StepperButton
                label="−"
                active={canDecrement}
                accent={accent}
                onPress={handleDecrement}
                disabled={!canDecrement}
              />
              <View style={styles.countBlock}>
                <Text style={styles.countValue}>{count}</Text>
                <Text style={styles.countUnit}>QUESTIONS</Text>
              </View>
              <StepperButton
                label="+"
                active={canIncrement}
                accent={accent}
                onPress={handleIncrement}
                disabled={!canIncrement}
              />
            </View>

            <Text style={styles.sectionLabel}>DIFFICULTY</Text>
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
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.estimateBanner}>
              <Text style={styles.estimateIcon}>⏱</Text>
              <Text style={styles.estimateText}>
                Estimated time{' '}
                <Text style={styles.estimateStrong}>≈ {estimatedMinutes} min</Text>
                {' · '}
                {difficultyLabel}
              </Text>
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Include bookmarked facts</Text>
              <BookmarkToggle
                value={includeBookmarks}
                accent={accent}
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
                {starting ? 'Starting…' : 'Start Quiz'}
              </Text>
            </Pressable>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(typography) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(20, 18, 14, 0.34)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: SHEET_BG,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 26,
      paddingTop: 18,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: -8 },
      elevation: 12,
    },
    handle: {
      width: 40,
      height: 5,
      backgroundColor: '#cfcdc2',
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
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontFamily: typography.fontFamily.serifDisplayMedium,
      fontSize: 28,
      lineHeight: 30,
      color: '#1c1a17',
      fontWeight: '500',
    },
    subtitle: {
      fontFamily: typography.fontFamily.ui,
      fontSize: 13,
      color: '#74716a',
      marginTop: 4,
    },
    sectionLabel: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.9,
      color: '#8a877e',
      marginTop: 26,
      marginBottom: 12,
    },
    stepperCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#E4E2D8',
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
      color: '#1c1a17',
      fontWeight: '500',
    },
    countUnit: {
      fontFamily: typography.fontFamily.ui,
      fontSize: 11,
      color: '#8a877e',
      letterSpacing: 0.6,
      marginTop: 3,
    },
    difficultyTrack: {
      flexDirection: 'row',
      backgroundColor: '#EAE8DE',
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
      color: '#74716a',
    },
    difficultyTextSelected: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontWeight: '600',
      color: '#fff',
    },
    estimateBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      backgroundColor: '#F1E7DC',
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
      color: '#8a6a44',
    },
    estimateStrong: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontWeight: '600',
      color: '#b85c10',
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
      color: '#1c1a17',
    },
    startButton: {
      height: 56,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      shadowColor: ACCENT,
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
      color: '#fff',
    },
    cancelButton: {
      alignItems: 'center',
      marginTop: 16,
      paddingVertical: 8,
    },
    cancelText: {
      fontFamily: typography.fontFamily.ui,
      fontSize: 15,
      color: '#74716a',
    },
  });
}
