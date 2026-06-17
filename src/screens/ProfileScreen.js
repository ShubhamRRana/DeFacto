import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
  TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../config/supabase';
import { useStreak } from '../hooks/useStreak';
import { colors, typography, spacing, borderRadius } from '../theme/colors';

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
  const { profile, loading, fetchProfile } = useStreak();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [localName, setLocalName] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
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
    navigation.navigate('EditInterests');
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const streak = profile.streak_count ?? 0;
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#1A1A2E', colors.background]} style={styles.headerGradient}>
        <View style={styles.avatarContainer}>
          <LinearGradient colors={colors.gradientPrimary} style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
        </View>
        <TouchableOpacity style={styles.nameRow} onPress={handleEditName} activeOpacity={0.7}>
          <Text style={styles.name}>{displayName}</Text>
          <Ionicons name="pencil" size={15} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.email}>{profile.email}</Text>
      </LinearGradient>

      {/* Streak card */}
      <View style={styles.streakCard}>
        <LinearGradient
          colors={streak >= 7 ? ['#FF6584', '#6C63FF'] : ['#1A1A2E', '#16213E']}
          style={styles.streakGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
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

          {/* Progress to next milestone */}
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
        </LinearGradient>
      </View>

      {/* Milestone badges */}
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

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={22} color={colors.secondary} />
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={22} color={colors.primary} />
            <Text style={styles.statValue}>
              {profile.created_at
                ? Math.floor((Date.now() - new Date(profile.created_at)) / 86400000)
                : 0}
            </Text>
            <Text style={styles.statLabel}>Days Joined</Text>
          </View>
        </View>
      </View>

      {/* Edit Interests */}
      <TouchableOpacity style={styles.editInterestsButton} onPress={handleEditInterests} activeOpacity={0.8}>
        <Ionicons name="options-outline" size={20} color={colors.primary} />
        <Text style={styles.editInterestsText}>Edit My Interests</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
      {/* Edit Name Modal */}
      <Modal visible={editingName} transparent animationType="fade" onRequestClose={() => setEditingName(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Name</Text>
            <TextInput
              style={styles.modalInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your full name"
              placeholderTextColor={colors.textMuted}
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
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalSaveText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    paddingTop: 70,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarContainer: {
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.extrabold,
    color: '#fff',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  email: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  streakCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  streakGradient: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  streakTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  streakLabel: {
    fontSize: typography.fontSizes.sm,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  streakCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  streakCount: {
    fontSize: typography.fontSizes.xxxl,
    fontWeight: typography.fontWeights.extrabold,
    color: '#fff',
  },
  streakUnit: {
    fontSize: typography.fontSizes.lg,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: typography.fontWeights.medium,
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
    fontSize: typography.fontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  milestoneTarget: {
    fontSize: typography.fontSizes.sm,
    color: '#fff',
    fontWeight: typography.fontWeights.semibold,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  maxStreak: {
    fontSize: typography.fontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    width: 56,
    height: 64,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  badgeAchieved: {
    backgroundColor: colors.primary + '22',
    borderColor: colors.primary + '55',
  },
  badgeEmoji: {
    fontSize: 22,
  },
  badgeDays: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semibold,
  },
  badgeDaysAchieved: {
    color: colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statValue: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
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
    borderColor: colors.primary + '44',
    backgroundColor: colors.primary + '11',
  },
  editInterestsText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
    flex: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error + '44',
    backgroundColor: colors.error + '11',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalCancelText: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  modalSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: typography.fontSizes.md,
    color: '#fff',
    fontWeight: typography.fontWeights.bold,
  },
  signOutText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.error,
  },
});
