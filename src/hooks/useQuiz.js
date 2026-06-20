import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import {
  callGenerateQuiz,
  callSubmitQuizSession,
  fetchWeeklyLeaderboard,
} from '../utils/quiz';
import { useLocale } from '../theme/LocaleContext';

const QuizContext = createContext(null);

export function QuizProvider({ children }) {
  const { locale } = useLocale();
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [topicName, setTopicName] = useState('');
  const [results, setResults] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userTopics, setUserTopics] = useState([]);
  const [questionTimings, setQuestionTimings] = useState({});

  const fetchQuizProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: topics }, { data: stats }] = await Promise.all([
      supabase
        .from('user_topics')
        .select('topic_id, topics(id, name, icon, color)')
        .eq('user_id', user.id),
      supabase
        .from('quiz_topic_stats')
        .select('topic_id, correct_count, answered_count')
        .eq('user_id', user.id),
    ]);

    const statsByTopic = new Map((stats ?? []).map((s) => [s.topic_id, s]));

    setUserTopics(
      (topics ?? [])
        .map((t) => t.topics)
        .filter(Boolean)
        .map((topic) => {
          const stat = statsByTopic.get(topic.id);
          return {
            ...topic,
            answeredCount: stat?.answered_count ?? 0,
            masteryPercent: Math.min(100, Math.round(((stat?.correct_count ?? 0) / 50) * 100)),
          };
        })
    );
  }, []);

  const startSession = useCallback(async ({
    topicIds,
    count,
    difficulty,
    includeBookmarks = false,
  }) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setQuestionTimings({});
    setLoadingStep('Checking facts…');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      setLoadingStep('Generating questions…');
      const result = await callGenerateQuiz({
        userId: user.id,
        topicIds,
        count,
        difficulty,
        includeBookmarks,
        locale,
      });

      if (!result.success) throw new Error(result.error);

      setSession({ id: result.sessionId, topicIds, count, difficulty });
      setQuestions(result.questions);
      setTopicName(result.topicName);
      return result;
    } catch (err) {
      const message = err.message ?? 'Could not start quiz';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  }, [locale]);

  const recordQuestionTime = useCallback((questionId, timeMs) => {
    setQuestionTimings((prev) => ({ ...prev, [questionId]: timeMs }));
  }, []);

  const submitSession = useCallback(async (answers) => {
    if (!session?.id) throw new Error('No active session');
    setLoading(true);
    setError(null);

    try {
      const payload = answers.map((a) => ({
        question_id: a.questionId,
        user_answer: a.userAnswer,
        time_ms: a.timeMs,
      }));

      const data = await callSubmitQuizSession(session.id, payload);
      setResults(data);
      await fetchQuizProfile();
      return data;
    } catch (err) {
      const message = err.message ?? 'Could not submit quiz';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, fetchQuizProfile]);

  const loadLeaderboard = useCallback(async (topicId = null) => {
    setLoading(true);
    try {
      const data = await fetchWeeklyLeaderboard(topicId);
      setLeaderboard(data);
      return data;
    } catch (err) {
      setError(err.message ?? 'Could not load leaderboard');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const resetSession = useCallback(() => {
    setSession(null);
    setQuestions([]);
    setTopicName('');
    setResults(null);
    setQuestionTimings({});
    setError(null);
  }, []);

  const cancelSession = useCallback(async () => {
    if (session?.id) {
      await supabase
        .from('quiz_sessions')
        .update({ status: 'cancelled' })
        .eq('id', session.id);
    }
    resetSession();
  }, [session, resetSession]);

  const value = {
    loading,
    loadingStep,
    error,
    session,
    questions,
    topicName,
    results,
    leaderboard,
    userTopics,
    questionTimings,
    fetchQuizProfile,
    startSession,
    recordQuestionTime,
    submitSession,
    loadLeaderboard,
    resetSession,
    cancelSession,
  };

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz() {
  const ctx = useContext(QuizContext);
  if (!ctx) {
    throw new Error('useQuiz must be used within QuizProvider');
  }
  return ctx;
}
