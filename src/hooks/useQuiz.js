import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import {
  callGenerateQuiz,
  callSubmitQuizSession,
  fetchWeeklyLeaderboard,
  fetchUserQuizRank,
  callCreateQuizQuestion,
  buildBadgeProgress,
} from '../utils/quiz';

const QuizContext = createContext(null);

export function QuizProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [topicName, setTopicName] = useState('');
  const [results, setResults] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [quizProfile, setQuizProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [userTopics, setUserTopics] = useState([]);
  const [badgeProgress, setBadgeProgress] = useState({});
  const [questionTimings, setQuestionTimings] = useState({});

  const fetchQuizProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [
      { data: profile },
      { data: userBadges },
      { data: topics },
      { data: topicStats },
      { count: questionsCreated },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('quiz_streak_count, quiz_last_active_date, full_name')
        .eq('id', user.id)
        .single(),
      supabase.from('user_badges').select('badge_key, earned_at').eq('user_id', user.id),
      supabase
        .from('user_topics')
        .select('topic_id, topics(id, name, icon, color)')
        .eq('user_id', user.id),
      supabase
        .from('quiz_topic_stats')
        .select('correct_count')
        .eq('user_id', user.id),
      supabase
        .from('quiz_questions')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .eq('source', 'user'),
    ]);

    setQuizProfile(profile);
    setBadges(userBadges ?? []);
    setUserTopics((topics ?? []).map((t) => t.topics).filter(Boolean));

    const maxTopicCorrect = (topicStats ?? []).reduce(
      (max, row) => Math.max(max, row.correct_count ?? 0),
      0,
    );
    setBadgeProgress(buildBadgeProgress({
      maxTopicCorrect,
      quizStreak: profile?.quiz_streak_count ?? 0,
      questionsCreated: questionsCreated ?? 0,
    }));

    try {
      const rank = await fetchUserQuizRank(user.id, null);
      setUserRank(rank);
    } catch {
      setUserRank(null);
    }
  }, []);

  const startSession = useCallback(async ({
    topicId,
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
        topicId,
        count,
        difficulty,
        includeBookmarks,
      });

      if (!result.success) throw new Error(result.error);

      setSession({ id: result.sessionId, topicId, count, difficulty });
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
  }, []);

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

  const createQuestion = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const question = await callCreateQuizQuestion(params);
      await fetchQuizProfile();
      return question;
    } catch (err) {
      setError(err.message ?? 'Could not create question');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchQuizProfile]);

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
    userRank,
    quizProfile,
    badges,
    badgeProgress,
    userTopics,
    questionTimings,
    fetchQuizProfile,
    startSession,
    recordQuestionTime,
    submitSession,
    loadLeaderboard,
    createQuestion,
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
