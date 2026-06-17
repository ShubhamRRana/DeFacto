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

export default function EditInterestsScreen({ navigation }) {
  const [topics, setTopics] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    const [{ data: allTopics }, { data: userTopics }] = await Promise.all([
      supabase.from('topics').select('*').order('name'),
      supabase.from('user_topics').select('topic_id').eq('user_id', user.id),
    ]);

    setTopics(allTopics ?? []);
    setSelected(new Set(userTopics?.map(t => t.topic_id) ?? []));
    setLoading(false);

    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const toggleTopic = (topicId) => {
    Haptics.selectionAsync();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(topicId) ? next.delete(topicId) : next.add(topicId);
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size < MIN_TOPICS) {
      Alert.alert('Too few topics', `Please keep at least ${MIN_TOPICS} topics selected.`);
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data: { user } } = await supabase.auth.getUser();

    // Delete all existing and reinsert selected
    await supabase.from('user_topics').delete().eq('user_id', user.id);

    const rows = Array.from(selected).map(topic_id => ({ user_id: user.id, topic_id }));
    const { error } = await supabase.from('user_topics').insert(rows);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Could not save your interests. Please try again.');
      setSaving(false);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    navigation.goBack();
  };

  const renderTopic = ({ item }) => {
    const isSelected = selected.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.topicCard, isSelected && styles.topicCardSelected]}
        onPress={() => toggleTopic(item.id)}
        activeOpacity={0.8}
      >
        {isSelected && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        )}
        <View style={[styles.iconCircle, { backgroundColor: item.color + '22' }]}>
          <Ionicons name={item.icon} size={28} color={item.color} />
        </View>
        <Text style={styles.topicName}>{item.name}</Text>
        <Text style={styles.topicDesc} numberOfLines={2}>{item.description}</Text>
        {isSelected && (
          <LinearGradient
            colors={[item.color + '33', item.color + '11']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        )}
      </TouchableOpacity>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>My Interests</Text>
          <Text style={styles.subtitle}>{selected.size} topics selected</Text>
        </View>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={topics}
          renderItem={renderTopic}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, selected.size < MIN_TOPICS && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || selected.size < MIN_TOPICS}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={selected.size >= MIN_TOPICS ? colors.gradientPrimary : ['#333', '#444']}
            style={styles.saveGradient}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.saveText}>Save Interests</Text>
                <Ionicons name="checkmark" size={18} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    width: 40, height: 40, borderRadius: borderRadius.md,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.extrabold, color: colors.textPrimary },
  subtitle: { fontSize: typography.fontSizes.sm, color: colors.textMuted, marginTop: 2 },
  grid: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 120 },
  row: { gap: spacing.md, marginBottom: spacing.md },
  topicCard: {
    width: CARD_SIZE, backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 2, borderColor: 'transparent', overflow: 'hidden', minHeight: 130,
  },
  topicCardSelected: { borderColor: colors.primary },
  checkmark: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', zIndex: 1,
  },
  iconCircle: {
    width: 52, height: 52, borderRadius: borderRadius.md,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  topicName: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.textPrimary, marginBottom: 4 },
  topicDesc: { fontSize: typography.fontSizes.xs, color: colors.textMuted, lineHeight: 16 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.lg, paddingBottom: 40, paddingTop: spacing.md,
    backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  saveButton: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  saveButtonDisabled: { opacity: 0.5 },
  saveGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  saveText: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, color: '#fff' },
});
