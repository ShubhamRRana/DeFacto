import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../config/supabase';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import { useQuiz } from '../hooks/useQuiz';

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];

export default function CreateQuestionScreen({ navigation, route }) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const { userTopics, createQuestion, loading } = useQuiz();

  const seedFact = route.params?.fact ?? null;

  const [selectedTopicId, setSelectedTopicId] = useState(seedFact?.topic_id ?? null);
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('mcq');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [bookmarks, setBookmarks] = useState([]);
  const [selectedFactId, setSelectedFactId] = useState(seedFact?.id ?? null);

  useFocusEffect(
    useCallback(() => {
      if (seedFact) return;
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return;
        const { data } = await supabase
          .from('bookmarks')
          .select('fact_id, facts(id, content, topic_id, topics(name))')
          .eq('user_id', user.id)
          .limit(20);
        setBookmarks(data ?? []);
      });
    }, [seedFact])
  );

  const handleOptionChange = (index, value) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSelectBookmark = (bookmark) => {
    const fact = bookmark.facts;
    if (!fact) return;
    setSelectedFactId(fact.id);
    setSelectedTopicId(fact.topic_id);
    setQuestionText(`Based on this fact: "${fact.content.slice(0, 120)}..."`);
    Haptics.selectionAsync();
  };

  const handleSubmit = async () => {
    if (!selectedTopicId) {
      Alert.alert('Select a topic', 'Choose a topic for your question.');
      return;
    }
    if (questionText.trim().length < 5) {
      Alert.alert('Question too short', 'Write at least 5 characters.');
      return;
    }

    const finalOptions = questionType === 'true_false'
      ? ['True', 'False']
      : options.filter((o) => o.trim());

    if (questionType === 'mcq' && finalOptions.length < 2) {
      Alert.alert('Add options', 'MCQ questions need at least 2 options.');
      return;
    }
    if (!correctAnswer.trim()) {
      Alert.alert('Correct answer required', 'Specify the correct answer.');
      return;
    }

    try {
      await createQuestion({
        topicId: selectedTopicId,
        questionText: questionText.trim(),
        questionType,
        options: finalOptions,
        correctAnswer: correctAnswer.trim(),
        difficulty,
        factId: selectedFactId,
        source: selectedFactId ? 'bookmark' : 'user',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Published!', 'Your question is now in the shared pool.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err.message ?? 'Could not publish question.');
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Question</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Topic</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topicRow}>
          {userTopics.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              style={[styles.topicChip, selectedTopicId === topic.id && styles.topicChipActive]}
              onPress={() => setSelectedTopicId(topic.id)}
            >
              <Text style={[styles.topicChipText, selectedTopicId === topic.id && styles.topicChipTextActive]}>
                {topic.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {!seedFact && bookmarks.length > 0 && (
          <>
            <Text style={styles.label}>Seed from Bookmark</Text>
            {bookmarks.slice(0, 5).map((b) => (
              <TouchableOpacity
                key={b.fact_id}
                style={[styles.bookmarkCard, selectedFactId === b.fact_id && styles.bookmarkCardActive]}
                onPress={() => handleSelectBookmark(b)}
              >
                <Text style={styles.bookmarkTopic}>{b.facts?.topics?.name}</Text>
                <Text style={styles.bookmarkContent} numberOfLines={2}>
                  {b.facts?.content}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <Text style={styles.label}>Question Type</Text>
        <View style={styles.typeRow}>
          {['mcq', 'true_false'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeChip, questionType === type && styles.typeChipActive]}
              onPress={() => {
                setQuestionType(type);
                if (type === 'true_false') {
                  setOptions(['True', 'False']);
                  setCorrectAnswer('');
                }
              }}
            >
              <Text style={[styles.typeChipText, questionType === type && styles.typeChipTextActive]}>
                {type === 'mcq' ? 'Multiple Choice' : 'True / False'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Question</Text>
        <TextInput
          style={styles.textArea}
          value={questionText}
          onChangeText={setQuestionText}
          placeholder="Write your question…"
          placeholderTextColor={colors.mutedSoft}
          multiline
        />

        {questionType === 'mcq' && (
          <>
            <Text style={styles.label}>Options</Text>
            {options.map((opt, i) => (
              <TextInput
                key={i}
                style={styles.input}
                value={opt}
                onChangeText={(v) => handleOptionChange(i, v)}
                placeholder={`Option ${i + 1}`}
                placeholderTextColor={colors.mutedSoft}
              />
            ))}
          </>
        )}

        <Text style={styles.label}>Correct Answer</Text>
        {questionType === 'true_false' ? (
          <View style={styles.typeRow}>
            {['True', 'False'].map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.typeChip, correctAnswer === val && styles.typeChipActive]}
                onPress={() => setCorrectAnswer(val)}
              >
                <Text style={[styles.typeChipText, correctAnswer === val && styles.typeChipTextActive]}>
                  {val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TextInput
            style={styles.input}
            value={correctAnswer}
            onChangeText={setCorrectAnswer}
            placeholder="Must match one option exactly"
            placeholderTextColor={colors.mutedSoft}
          />
        )}

        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.typeRow}>
          {DIFFICULTY_OPTIONS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.typeChip, difficulty === d && styles.typeChipActive]}
              onPress={() => setDifficulty(d)}
            >
              <Text style={[styles.typeChipText, difficulty === d && styles.typeChipTextActive]}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.submitText}>Publish to Shared Pool</Text>
          )}
        </TouchableOpacity>
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
    scroll: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
      marginTop: spacing.base,
    },
    topicRow: {
      marginBottom: spacing.sm,
    },
    topicChip: {
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.pill,
      borderWidth: 1,
      borderColor: colors.hairline,
      marginRight: spacing.sm,
      backgroundColor: colors.surfaceCard,
    },
    topicChipActive: {
      borderColor: colors.primary,
    },
    topicChipText: {
      fontSize: 14,
      color: colors.ink,
    },
    topicChipTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    bookmarkCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      padding: spacing.base,
      marginBottom: spacing.sm,
    },
    bookmarkCardActive: {
      borderColor: colors.primary,
    },
    bookmarkTopic: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 4,
    },
    bookmarkContent: {
      fontSize: 14,
      color: colors.ink,
    },
    typeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    typeChip: {
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.hairline,
      backgroundColor: colors.surfaceCard,
    },
    typeChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.canvasSoft,
    },
    typeChipText: {
      fontSize: 14,
      color: colors.ink,
    },
    typeChipTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    textArea: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: borderRadius.md,
      padding: spacing.base,
      fontSize: 16,
      color: colors.ink,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    input: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: borderRadius.md,
      padding: spacing.base,
      fontSize: 16,
      color: colors.ink,
      marginBottom: spacing.sm,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.base,
      alignItems: 'center',
      marginTop: spacing.xl,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
