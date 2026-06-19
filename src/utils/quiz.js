import { supabase } from '../config/supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

export async function callGenerateQuiz({
  userId,
  topicId,
  count,
  difficulty,
  includeBookmarks = false,
}) {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-quiz`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      user_id: userId,
      topic_id: topicId,
      count,
      difficulty,
      include_bookmarks: includeBookmarks,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      error: result.error ?? 'Could not start quiz',
    };
  }

  return {
    success: true,
    sessionId: result.session_id,
    topicName: result.topic_name,
    questions: result.questions ?? [],
  };
}

export async function callCreateQuizQuestion({
  topicId,
  questionText,
  questionType,
  options,
  correctAnswer,
  difficulty = 'medium',
  factId = null,
  source = 'user',
}) {
  const { data, error } = await supabase.rpc('create_quiz_question', {
    p_topic_id: topicId,
    p_question_text: questionText,
    p_question_type: questionType,
    p_options: options,
    p_correct_answer: correctAnswer,
    p_difficulty: difficulty,
    p_fact_id: factId,
    p_source: source,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function callSubmitQuizSession(sessionId, answers) {
  const { data, error } = await supabase.rpc('submit_quiz_session', {
    p_session_id: sessionId,
    p_answers: answers,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchWeeklyLeaderboard(topicId = null, limit = 50) {
  const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
    p_topic_id: topicId,
    p_limit: limit,
  });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchUserQuizRank(userId, topicId = null) {
  const { data, error } = await supabase.rpc('get_user_quiz_rank', {
    p_user_id: userId,
    p_topic_id: topicId,
  });

  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export const BADGE_DEFINITIONS = {
  first_quiz: { label: 'First Quiz', emoji: '🎯', icon: 'checkmark-circle-outline', description: 'Complete your first quiz' },
  perfect_10: { label: 'Perfect 10', emoji: '💯', icon: 'star', description: 'Score 10/10 on a quiz' },
  topic_master: { label: 'Topic Master', emoji: '🎓', icon: 'school-outline', description: '50 correct answers in one topic' },
  streak_7: { label: 'Quiz Streak', emoji: '🔥', icon: 'flame', description: '7-day quiz streak' },
  contributor: { label: 'Contributor', emoji: '✍️', icon: 'create-outline', description: 'Create 5 quiz questions' },
  top_10: { label: 'Top 10', emoji: '🏆', icon: 'podium-outline', description: 'Reach top 10 on weekly leaderboard' },
};

export const ALL_BADGE_KEYS = Object.keys(BADGE_DEFINITIONS);

export const BADGE_THRESHOLDS = {
  topic_master: 50,
  streak_7: 7,
  contributor: 5,
};

export function getBadgeProgress(key, stats) {
  switch (key) {
    case 'topic_master':
      return stats.maxTopicCorrect > 0
        ? { current: stats.maxTopicCorrect, target: BADGE_THRESHOLDS.topic_master }
        : null;
    case 'streak_7':
      return stats.quizStreak > 0
        ? { current: stats.quizStreak, target: BADGE_THRESHOLDS.streak_7 }
        : null;
    case 'contributor':
      return stats.questionsCreated > 0
        ? { current: stats.questionsCreated, target: BADGE_THRESHOLDS.contributor }
        : null;
    default:
      return null;
  }
}

export function buildBadgeProgress(stats) {
  const progress = {};
  for (const key of ALL_BADGE_KEYS) {
    const p = getBadgeProgress(key, stats);
    if (p) progress[key] = p;
  }
  return progress;
}
