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
