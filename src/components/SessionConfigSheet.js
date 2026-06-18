import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Switch, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';

const LENGTH_OPTIONS = [5, 10, 20];
const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export default function SessionConfigSheet({
  visible,
  topic,
  onClose,
  onStart,
  starting,
}) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [count, setCount] = React.useState(10);
  const [difficulty, setDifficulty] = React.useState('medium');
  const [includeBookmarks, setIncludeBookmarks] = React.useState(false);

  const handleStart = () => {
    if (!topic) return;
    onStart({ topicId: topic.id, count, difficulty, includeBookmarks });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{topic?.name ?? 'Quiz'}</Text>
          <Text style={styles.subtitle}>Configure your quiz session</Text>

          <Text style={styles.sectionLabel}>Questions</Text>
          <View style={styles.optionRow}>
            {LENGTH_OPTIONS.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.chip, count === n && styles.chipSelected]}
                onPress={() => setCount(n)}
              >
                <Text style={[styles.chipText, count === n && styles.chipTextSelected]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Difficulty</Text>
          <View style={styles.optionRow}>
            {DIFFICULTY_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d.value}
                style={[styles.chip, difficulty === d.value && styles.chipSelected]}
                onPress={() => setDifficulty(d.value)}
              >
                <Text style={[styles.chipText, difficulty === d.value && styles.chipTextSelected]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Include bookmarked facts</Text>
            <Switch
              value={includeBookmarks}
              onValueChange={setIncludeBookmarks}
              trackColor={{ false: colors.hairline, true: colors.primary }}
            />
          </View>

          <TouchableOpacity
            style={[styles.startButton, starting && styles.startButtonDisabled]}
            onPress={handleStart}
            disabled={starting}
          >
            <Text style={styles.startButtonText}>
              {starting ? 'Starting…' : 'Start Quiz'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.canvas,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: colors.hairlineStrong,
      borderRadius: borderRadius.pill,
      alignSelf: 'center',
      marginBottom: spacing.base,
    },
    title: {
      ...typography.presets.displaySm,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: 14,
      color: colors.muted,
      marginBottom: spacing.lg,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.88,
      marginBottom: spacing.sm,
      marginTop: spacing.base,
    },
    optionRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    chip: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.hairline,
      backgroundColor: colors.surfaceCard,
      alignItems: 'center',
    },
    chipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.canvasSoft,
    },
    chipText: {
      fontSize: 15,
      color: colors.ink,
    },
    chipTextSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.lg,
      paddingVertical: spacing.sm,
    },
    toggleLabel: {
      fontSize: 15,
      color: colors.ink,
    },
    startButton: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.base,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    startButtonDisabled: {
      opacity: 0.6,
    },
    startButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButton: {
      alignItems: 'center',
      marginTop: spacing.base,
      padding: spacing.sm,
    },
    cancelText: {
      color: colors.muted,
      fontSize: 15,
    },
  });
}
