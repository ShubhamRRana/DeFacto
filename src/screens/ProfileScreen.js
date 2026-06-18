import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
  TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../config/supabase';
import { useStreak } from '../hooks/useStreak';
import { useQuiz } from '../hooks/useQuiz';
import BadgeGrid from '../components/BadgeGrid';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

function getStreakEmoji(count) {
  if (count >= 100) return '🏆';
  if (count >= 30) return '🔥';
  if (count >= 7)  return '⚡';
  return '✨';
}

function getNextMilestone(count) {
  return STREAK_MILESTONES.find(m => m > count) ?? null;
}

export default function ProfileScreen({ navigation }) {
  const { colors, typography, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const { profile, loading, fetchProfile } = useStreak();
  const { quizProfile, badges, fetchQuizProfile } = useQuiz();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [localName, setLocalName] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchQuizProfile();
    }, [fetchProfile, fetchQuizProfile])
  );

  const handleEditName = () => {
    setNameInput(profile?.full_name ?? '');
    setEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert('Invalid name', 'Name cannot be empty.');
      return;
    }
    setSavingName(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, full_name: trimmed }, { onConflict: 'id' });

    if (error) {
      Alert.alert('Error', `Could not update your name.\n\n${error.message}`);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingName(false);
      setLocalName(trimmed);
    }
    setSavingName(false);
  };

  const handleEditInterests = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('EditInterests');
    } else {
      navigation.navigate('EditInterests');
    }
  };

  const handleChangePassword = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('ChangePassword');
    } else {
      navigation.navigate('ChangePassword');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await supabase.auth.signOut();
          },
        },
      ]
    );
  };

  if (loading || !profile) {
    return (
      <View style={styles.screen}>
        <TouchableOpacity
          style={[styles.themeToggle, { top: insets.top + 12 }]}
          onPress={toggleTheme}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={22}
            color={colors.muted}
          />
        </TouchableOpacity>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const streak = profile.streak_count ?? 0;
  const quizStreak = quizProfile?.quiz_streak_count ?? 0;
  const earnedBadgeKeys = badges.map((b) => b.badge_key);
  const nextMilestone = getNextMilestone(streak);
  const milestoneProgress = nextMilestone
    ? (streak / nextMilestone) * 100
    : 100;
  const displayName = localName ?? profile.full_name ?? 'Explorer';
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        style={[styles.themeToggle, { top: insets.top + 12 }]}
        onPress={toggleTheme}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <Ionicons
          name={isDark ? 'sunny-outline' : 'moon-outline'}
          size={22}
          color={colors.muted}
        />
      </TouchableOpacity>
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.nameRow} onPress={handleEditName} activeOpacity={0.7}>
          <Text style={styles.name}>{displayName}</Text>
          <Ionicons name="pencil" size={15} color={colors.muted} />
        </TouchableOpacity>
        <Text style={styles.email}>{profile.email}</Text>
      </View>

      <View style={styles.streakCard}>
        <View style={styles.streakTop}>
          <View>
            <Text style={styles.streakLabel}>Current Streak</Text>
            <View style={styles.streakCountRow}>
              <Text style={styles.streakCount}>{streak}</Text>
              <Text style={styles.streakUnit}> days</Text>
            </View>
          </View>
          <Text style={styles.streakEmoji}>{getStreakEmoji(streak)}</Text>
        </View>

        {nextMilestone && (
          <View style={styles.milestoneSection}>
            <View style={styles.milestoneLabelRow}>
              <Text style={styles.milestoneLabel}>Next milestone</Text>
              <Text style={styles.milestoneTarget}>{streak} / {nextMilestone} days</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${milestoneProgress}%` }]} />
            </View>
          </View>
        )}

        {!nextMilestone && (
          <Text style={styles.maxStreak}>You've reached the top! Incredible. 🏆</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Milestones</Text>
        <View style={styles.badgesRow}>
          {STREAK_MILESTONES.map(m => {
            const achieved = streak >= m;
            return (
              <View key={m} style={[styles.badge, achieved && styles.badgeAchieved]}>
                <Text style={styles.badgeEmoji}>{achieved ? '🔥' : '🔒'}</Text>
                <Text style={[styles.badgeDays, achieved && styles.badgeDaysAchieved]}>
                  {m}d
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={22} color={colors.timeline.done} />
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={22} color={colors.ink} />
            <Text style={styles.statValue}>
              {profile.created_at
                ? Math.floor((Date.now() - new Date(profile.created_at)) / 86400000)
                : 0}
            </Text>
            <Text style={styles.statLabel}>Days Joined</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="school" size={22} color={colors.primary} />
            <Text style={styles.statValue}>{quizStreak}</Text>
            <Text style={styles.statLabel}>Quiz Streak</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiz Badges</Text>
        <BadgeGrid earnedKeys={earnedBadgeKeys} />
      </View>

      <TouchableOpacity style={styles.editInterestsButton} onPress={handleEditInterests} activeOpacity={0.8}>
        <Ionicons name="options-outline" size={20} color={colors.ink} />
        <Text style={styles.editInterestsText}>Edit My Interests</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.editInterestsButton, styles.settingsButtonFollowUp]} onPress={handleChangePassword} activeOpacity={0.8}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.ink} />
        <Text style={styles.editInterestsText}>Change Password</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Modal visible={editingName} transparent animationType="fade" onRequestClose={() => setEditingName(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Name</Text>
            <TextInput
              style={styles.modalInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your full name"
              placeholderTextColor={colors.mutedSoft}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setEditingName(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleSaveName}
                disabled={savingName}
              >
                {savingName
                  ? <ActivityIndicator color={colors.onPrimary} size="small" />
                  : <Text style={styles.modalSaveText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </ScrollView>
    </View>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  themeToggle: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.canvas,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 70,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  avatarContainer: {
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.presets.titleMd,
    color: colors.canvas,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    ...typography.presets.displaySm,
    fontSize: typography.fontSizes.xl,
  },
  email: {
    ...typography.presets.caption,
  },
  streakCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  streakTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  streakLabel: {
    ...typography.presets.captionUppercase,
    textTransform: 'none',
    letterSpacing: 0,
    marginBottom: 4,
  },
  streakCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  streakCount: {
    ...typography.presets.displayLg,
    fontSize: typography.fontSizes.xxxl,
  },
  streakUnit: {
    ...typography.presets.bodyMd,
    color: colors.muted,
  },
  streakEmoji: {
    fontSize: 48,
  },
  milestoneSection: {
    gap: spacing.sm,
  },
  milestoneLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestoneLabel: {
    ...typography.presets.bodySm,
  },
  milestoneTarget: {
    ...typography.presets.bodySm,
    fontFamily: typography.fontFamily.sansSemiBold,
    color: colors.ink,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceStrong,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.timeline.done,
    borderRadius: 3,
  },
  maxStreak: {
    ...typography.presets.bodySm,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.presets.titleMd,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    width: 56,
    height: 64,
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  badgeAchieved: {
    backgroundColor: colors.timeline.done + '22',
    borderColor: colors.timeline.done + '55',
  },
  badgeEmoji: {
    fontSize: 22,
  },
  badgeDays: {
    ...typography.presets.caption,
    fontFamily: typography.fontFamily.sansSemiBold,
  },
  badgeDaysAchieved: {
    color: colors.timeline.done,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  statValue: {
    ...typography.presets.displayMd,
    fontSize: typography.fontSizes.xxl,
  },
  statLabel: {
    ...typography.presets.caption,
  },
  editInterestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.surfaceCard,
  },
  editInterestsText: {
    ...typography.presets.bodyMd,
    fontFamily: typography.fontFamily.sansMedium,
    color: colors.ink,
    flex: 1,
  },
  settingsButtonFollowUp: {
    marginTop: spacing.sm,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  signOutText: {
    ...typography.presets.button,
    color: colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(38,37,30,0.4)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  modalTitle: {
    ...typography.presets.titleMd,
  },
  modalInput: {
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    height: 44,
    fontSize: typography.fontSizes.md,
    fontFamily: typography.fontFamily.sans,
    color: colors.ink,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  modalCancelText: {
    ...typography.presets.button,
    color: colors.ink,
  },
  modalSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalSaveText: {
    ...typography.presets.button,
    color: colors.onPrimary,
  },
  });
}
