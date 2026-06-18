-- Quiz RPCs: scoring, streaks, badges, leaderboard, user questions

CREATE OR REPLACE FUNCTION public.get_week_start(p_date date DEFAULT CURRENT_DATE)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_date - ((EXTRACT(DOW FROM p_date)::int + 6) % 7))::date;
$$;

CREATE OR REPLACE FUNCTION public.compute_composite_score(
  p_correct int,
  p_difficulty public.quiz_difficulty,
  p_avg_time_ms int,
  p_question_count int
)
RETURNS int
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_difficulty_multiplier numeric;
  v_speed_bonus numeric;
  v_length_bonus numeric;
  v_avg_seconds numeric;
BEGIN
  v_difficulty_multiplier := CASE p_difficulty
    WHEN 'easy' THEN 1.0
    WHEN 'medium' THEN 1.5
    WHEN 'hard' THEN 2.0
  END;

  v_avg_seconds := GREATEST(p_avg_time_ms, 0) / 1000.0;
  v_speed_bonus := CASE
    WHEN v_avg_seconds < 5 THEN 1.2
    WHEN v_avg_seconds < 10 THEN 1.0
    ELSE 0.8
  END;

  v_length_bonus := CASE p_question_count
    WHEN 20 THEN 1.3
    WHEN 10 THEN 1.0
    WHEN 5 THEN 0.8
    ELSE 1.0
  END;

  RETURN GREATEST(
    0,
    ROUND(p_correct * v_difficulty_multiplier * v_speed_bonus * v_length_bonus)::int
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_quiz_streak(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_last date;
  v_count int;
BEGIN
  SELECT quiz_last_active_date, quiz_streak_count
  INTO v_last, v_count
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_last = v_today THEN
    RETURN;
  ELSIF v_last = v_today - 1 THEN
    v_count := COALESCE(v_count, 0) + 1;
  ELSE
    v_count := 1;
  END IF;

  UPDATE public.profiles
  SET quiz_streak_count = v_count,
      quiz_last_active_date = v_today
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_weekly_leaderboard(
  p_user_id uuid,
  p_topic_id uuid,
  p_composite_delta int,
  p_questions_delta int,
  p_correct_delta int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week date := public.get_week_start(CURRENT_DATE);
BEGIN
  INSERT INTO public.quiz_leaderboard_weekly AS lb (
    user_id, topic_id, week_start, composite_score, questions_answered, correct_count
  )
  VALUES (p_user_id, NULL, v_week, p_composite_delta, p_questions_delta, p_correct_delta)
  ON CONFLICT (user_id, week_start) WHERE topic_id IS NULL
  DO UPDATE SET
    composite_score = lb.composite_score + EXCLUDED.composite_score,
    questions_answered = lb.questions_answered + EXCLUDED.questions_answered,
    correct_count = lb.correct_count + EXCLUDED.correct_count;

  INSERT INTO public.quiz_leaderboard_weekly AS lb (
    user_id, topic_id, week_start, composite_score, questions_answered, correct_count
  )
  VALUES (p_user_id, p_topic_id, v_week, p_composite_delta, p_questions_delta, p_correct_delta)
  ON CONFLICT (user_id, topic_id, week_start) WHERE topic_id IS NOT NULL
  DO UPDATE SET
    composite_score = lb.composite_score + EXCLUDED.composite_score,
    questions_answered = lb.questions_answered + EXCLUDED.questions_answered,
    correct_count = lb.correct_count + EXCLUDED.correct_count;
END;
$$;

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
  v_user_question_count int;
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

  SELECT count(*) INTO v_user_question_count
  FROM public.quiz_questions
  WHERE created_by = p_user_id AND source = 'user';

  IF v_user_question_count >= 5
     AND NOT EXISTS (
       SELECT 1 FROM public.user_badges WHERE user_id = p_user_id AND badge_key = 'contributor'
     ) THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (p_user_id, 'contributor');
    v_new_badges := array_append(v_new_badges, 'contributor');
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

CREATE OR REPLACE FUNCTION public.submit_quiz_session(
  p_session_id uuid,
  p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_session public.quiz_sessions;
  v_answer jsonb;
  v_question_id uuid;
  v_user_answer text;
  v_time_ms int;
  v_correct_answer text;
  v_is_correct boolean;
  v_correct_count int := 0;
  v_total_time int := 0;
  v_answer_count int := 0;
  v_composite int;
  v_results jsonb := '[]'::jsonb;
  v_new_badges text[];
  v_fact_id uuid;
  v_question_text text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_session
  FROM public.quiz_sessions
  WHERE id = p_session_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session.status = 'completed' THEN
    RAISE EXCEPTION 'Session already completed';
  END IF;

  IF v_session.status NOT IN ('active', 'loading') THEN
    RAISE EXCEPTION 'Session is not active';
  END IF;

  IF jsonb_array_length(p_answers) <> v_session.question_count THEN
    RAISE EXCEPTION 'Answer count mismatch';
  END IF;

  DELETE FROM public.quiz_answers WHERE session_id = p_session_id;

  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    v_question_id := (v_answer->>'question_id')::uuid;
    v_user_answer := trim(v_answer->>'user_answer');
    v_time_ms := GREATEST(COALESCE((v_answer->>'time_ms')::int, 0), 500);

    IF NOT EXISTS (
      SELECT 1 FROM public.quiz_session_questions
      WHERE session_id = p_session_id AND question_id = v_question_id
    ) THEN
      RAISE EXCEPTION 'Invalid question for session';
    END IF;

    SELECT correct_answer, fact_id, question_text
    INTO v_correct_answer, v_fact_id, v_question_text
    FROM public.quiz_questions
    WHERE id = v_question_id;

    v_is_correct := lower(trim(v_user_answer)) = lower(trim(v_correct_answer));

    INSERT INTO public.quiz_answers (session_id, question_id, user_answer, is_correct, time_ms)
    VALUES (p_session_id, v_question_id, v_user_answer, v_is_correct, v_time_ms);

    IF v_is_correct THEN
      v_correct_count := v_correct_count + 1;
    ELSE
      v_results := v_results || jsonb_build_object(
        'question_id', v_question_id,
        'question_text', v_question_text,
        'user_answer', v_user_answer,
        'correct_answer', v_correct_answer,
        'fact_id', v_fact_id
      );
    END IF;

    v_total_time := v_total_time + v_time_ms;
    v_answer_count := v_answer_count + 1;
  END LOOP;

  v_composite := public.compute_composite_score(
    v_correct_count,
    v_session.difficulty,
    CASE WHEN v_answer_count > 0 THEN v_total_time / v_answer_count ELSE 0 END,
    v_session.question_count
  );

  UPDATE public.quiz_sessions
  SET status = 'completed',
      score_correct = v_correct_count,
      composite_score = v_composite,
      duration_ms = v_total_time,
      completed_at = now()
  WHERE id = p_session_id;

  INSERT INTO public.quiz_topic_stats (user_id, topic_id, correct_count)
  VALUES (v_user_id, v_session.topic_id, v_correct_count)
  ON CONFLICT (user_id, topic_id)
  DO UPDATE SET correct_count = quiz_topic_stats.correct_count + EXCLUDED.correct_count;

  PERFORM public.update_quiz_streak(v_user_id);

  PERFORM public.update_weekly_leaderboard(
    v_user_id,
    v_session.topic_id,
    v_composite,
    v_session.question_count,
    v_correct_count
  );

  v_new_badges := public.award_badges(v_user_id, p_session_id);

  RETURN jsonb_build_object(
    'score_correct', v_correct_count,
    'question_count', v_session.question_count,
    'composite_score', v_composite,
    'duration_ms', v_total_time,
    'wrong_answers', v_results,
    'new_badges', to_jsonb(v_new_badges)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_quiz_question(
  p_topic_id uuid,
  p_question_text text,
  p_question_type public.quiz_question_type,
  p_options jsonb,
  p_correct_answer text,
  p_difficulty public.quiz_difficulty DEFAULT 'medium',
  p_fact_id uuid DEFAULT NULL,
  p_source public.quiz_question_source DEFAULT 'user'
)
RETURNS public.quiz_questions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_question public.quiz_questions;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_topics
    WHERE user_id = v_user_id AND topic_id = p_topic_id
  ) THEN
    RAISE EXCEPTION 'Topic not in your interests';
  END IF;

  IF length(trim(p_question_text)) < 5 THEN
    RAISE EXCEPTION 'Question must be at least 5 characters';
  END IF;

  INSERT INTO public.quiz_questions (
    topic_id, fact_id, created_by, question_text, question_type,
    options, correct_answer, difficulty, source
  )
  VALUES (
    p_topic_id, p_fact_id, v_user_id, trim(p_question_text), p_question_type,
    COALESCE(p_options, '[]'::jsonb), trim(p_correct_answer), p_difficulty, p_source
  )
  RETURNING * INTO v_question;

  RETURN v_question;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(
  p_topic_id uuid DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  rank bigint,
  user_id uuid,
  full_name text,
  composite_score int,
  questions_answered int,
  correct_count int,
  accuracy numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH week_scores AS (
    SELECT
      lb.user_id,
      lb.composite_score,
      lb.questions_answered,
      lb.correct_count
    FROM public.quiz_leaderboard_weekly lb
    WHERE lb.week_start = public.get_week_start(CURRENT_DATE)
      AND (
        (p_topic_id IS NULL AND lb.topic_id IS NULL)
        OR lb.topic_id = p_topic_id
      )
  )
  SELECT
    row_number() OVER (ORDER BY ws.composite_score DESC, ws.correct_count DESC) AS rank,
    ws.user_id,
    COALESCE(p.full_name, 'Explorer') AS full_name,
    ws.composite_score,
    ws.questions_answered,
    ws.correct_count,
    CASE
      WHEN ws.questions_answered > 0
      THEN ROUND((ws.correct_count::numeric / ws.questions_answered) * 100, 1)
      ELSE 0
    END AS accuracy
  FROM week_scores ws
  LEFT JOIN public.profiles p ON p.id = ws.user_id
  ORDER BY ws.composite_score DESC, ws.correct_count DESC
  LIMIT GREATEST(p_limit, 1);
$$;

CREATE OR REPLACE FUNCTION public.get_user_quiz_rank(
  p_user_id uuid,
  p_topic_id uuid DEFAULT NULL
)
RETURNS TABLE (rank bigint, composite_score int, total_players bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      lb.user_id,
      lb.composite_score,
      row_number() OVER (ORDER BY lb.composite_score DESC, lb.correct_count DESC) AS rank,
      count(*) OVER () AS total_players
    FROM public.quiz_leaderboard_weekly lb
    WHERE lb.week_start = public.get_week_start(CURRENT_DATE)
      AND (
        (p_topic_id IS NULL AND lb.topic_id IS NULL)
        OR lb.topic_id = p_topic_id
      )
  )
  SELECT rank, composite_score, total_players
  FROM ranked
  WHERE user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.submit_quiz_session(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_quiz_question(uuid, text, public.quiz_question_type, jsonb, text, public.quiz_difficulty, uuid, public.quiz_question_source) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_quiz_rank(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_quiz_streak(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_composite_score(int, public.quiz_difficulty, int, int) TO authenticated;

REVOKE ALL ON FUNCTION public.submit_quiz_session(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_quiz_question(uuid, text, public.quiz_question_type, jsonb, text, public.quiz_difficulty, uuid, public.quiz_question_source) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_weekly_leaderboard(uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_quiz_rank(uuid, uuid) FROM PUBLIC;
