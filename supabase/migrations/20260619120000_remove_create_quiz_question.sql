-- Remove user-created question flow: RPC, contributor badge logic, client insert policy

DROP FUNCTION IF EXISTS public.create_quiz_question(
  uuid, text, public.quiz_question_type, jsonb, text,
  public.quiz_difficulty, uuid, public.quiz_question_source
);

CREATE OR REPLACE FUNCTION public.award_badges(p_user_id uuid, p_session_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.quiz_sessions;
  v_new_badges text[] := ARRAY[]::text[];
  v_topic_correct int;
  v_global_rank int;
BEGIN
  SELECT * INTO v_session FROM public.quiz_sessions WHERE id = p_session_id;
  IF NOT FOUND OR v_session.user_id <> p_user_id THEN
    RETURN v_new_badges;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_badges WHERE user_id = p_user_id AND badge_key = 'first_quiz'
  ) THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (p_user_id, 'first_quiz');
    v_new_badges := array_append(v_new_badges, 'first_quiz');
  END IF;

  IF v_session.question_count = 10 AND v_session.score_correct = 10
     AND NOT EXISTS (
       SELECT 1 FROM public.user_badges WHERE user_id = p_user_id AND badge_key = 'perfect_10'
     ) THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (p_user_id, 'perfect_10');
    v_new_badges := array_append(v_new_badges, 'perfect_10');
  END IF;

  SELECT correct_count INTO v_topic_correct
  FROM public.quiz_topic_stats
  WHERE user_id = p_user_id AND topic_id = v_session.topic_id;

  IF COALESCE(v_topic_correct, 0) >= 50
     AND NOT EXISTS (
       SELECT 1 FROM public.user_badges WHERE user_id = p_user_id AND badge_key = 'topic_master'
     ) THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (p_user_id, 'topic_master');
    v_new_badges := array_append(v_new_badges, 'topic_master');
  END IF;

  IF (SELECT quiz_streak_count FROM public.profiles WHERE id = p_user_id) >= 7
     AND NOT EXISTS (
       SELECT 1 FROM public.user_badges WHERE user_id = p_user_id AND badge_key = 'streak_7'
     ) THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (p_user_id, 'streak_7');
    v_new_badges := array_append(v_new_badges, 'streak_7');
  END IF;

  SELECT count(*) + 1 INTO v_global_rank
  FROM public.quiz_leaderboard_weekly
  WHERE topic_id IS NULL
    AND week_start = public.get_week_start(CURRENT_DATE)
    AND composite_score > (
      SELECT composite_score FROM public.quiz_leaderboard_weekly
      WHERE user_id = p_user_id AND topic_id IS NULL
        AND week_start = public.get_week_start(CURRENT_DATE)
    );

  IF v_global_rank <= 10 AND v_global_rank > 0
     AND NOT EXISTS (
       SELECT 1 FROM public.user_badges WHERE user_id = p_user_id AND badge_key = 'top_10'
     ) THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (p_user_id, 'top_10');
    v_new_badges := array_append(v_new_badges, 'top_10');
  END IF;

  RETURN v_new_badges;
END;
$$;

DROP POLICY IF EXISTS quiz_questions_insert ON public.quiz_questions;
