-- Allow a quiz session to span multiple topics

ALTER TABLE public.quiz_sessions
  ALTER COLUMN topic_id DROP NOT NULL;

CREATE TABLE public.quiz_session_topics (
  session_id uuid NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, topic_id)
);

ALTER TABLE public.quiz_session_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY quiz_session_topics_select ON public.quiz_session_topics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

ALTER TABLE public.quiz_topic_stats
  ADD COLUMN IF NOT EXISTS answered_count int NOT NULL DEFAULT 0;

-- Each call now writes a single leaderboard row (global when p_topic_id is null,
-- per-topic otherwise) so a multi-topic session can call it once per topic
-- plus once for the global row without double-counting.
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
  IF p_topic_id IS NULL THEN
    INSERT INTO public.quiz_leaderboard_weekly AS lb (
      user_id, topic_id, week_start, composite_score, questions_answered, correct_count
    )
    VALUES (p_user_id, NULL, v_week, p_composite_delta, p_questions_delta, p_correct_delta)
    ON CONFLICT (user_id, week_start) WHERE topic_id IS NULL
    DO UPDATE SET
      composite_score = lb.composite_score + EXCLUDED.composite_score,
      questions_answered = lb.questions_answered + EXCLUDED.questions_answered,
      correct_count = lb.correct_count + EXCLUDED.correct_count;
  ELSE
    INSERT INTO public.quiz_leaderboard_weekly AS lb (
      user_id, topic_id, week_start, composite_score, questions_answered, correct_count
    )
    VALUES (p_user_id, p_topic_id, v_week, p_composite_delta, p_questions_delta, p_correct_delta)
    ON CONFLICT (user_id, topic_id, week_start) WHERE topic_id IS NOT NULL
    DO UPDATE SET
      composite_score = lb.composite_score + EXCLUDED.composite_score,
      questions_answered = lb.questions_answered + EXCLUDED.questions_answered,
      correct_count = lb.correct_count + EXCLUDED.correct_count;
  END IF;
END;
$$;

-- topic_master badge now looks at any topic touched by the session, since
-- quiz_sessions.topic_id is null for multi-topic sessions.
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

  SELECT COALESCE(MAX(qts.correct_count), 0) INTO v_topic_correct
  FROM public.quiz_topic_stats qts
  WHERE qts.user_id = p_user_id
    AND qts.topic_id IN (
      SELECT DISTINCT qq.topic_id
      FROM public.quiz_session_questions qsq
      JOIN public.quiz_questions qq ON qq.id = qsq.question_id
      WHERE qsq.session_id = p_session_id
    );

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

-- Per-topic stats/leaderboard deltas are now attributed via each question's own
-- topic_id (quiz_questions.topic_id) instead of quiz_sessions.topic_id, so this
-- works the same for single- and multi-topic sessions. A topic's share of the
-- session's composite score is proportional to its share of correct answers
-- (or, if nothing was answered correctly, its share of answered questions).
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
  v_topic_rec RECORD;
  v_topic_composite int;
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

  PERFORM public.update_quiz_streak(v_user_id);

  PERFORM public.update_weekly_leaderboard(
    v_user_id, NULL, v_composite, v_session.question_count, v_correct_count
  );

  FOR v_topic_rec IN
    SELECT qq.topic_id AS topic_id,
           count(*)::int AS answered,
           count(*) FILTER (WHERE qa.is_correct)::int AS correct
    FROM public.quiz_session_questions qsq
    JOIN public.quiz_questions qq ON qq.id = qsq.question_id
    JOIN public.quiz_answers qa ON qa.question_id = qq.id AND qa.session_id = p_session_id
    WHERE qsq.session_id = p_session_id
    GROUP BY qq.topic_id
  LOOP
    v_topic_composite := CASE
      WHEN v_correct_count > 0 THEN ROUND(v_composite::numeric * v_topic_rec.correct / v_correct_count)::int
      ELSE ROUND(v_composite::numeric * v_topic_rec.answered / v_session.question_count)::int
    END;

    INSERT INTO public.quiz_topic_stats (user_id, topic_id, correct_count, answered_count)
    VALUES (v_user_id, v_topic_rec.topic_id, v_topic_rec.correct, v_topic_rec.answered)
    ON CONFLICT (user_id, topic_id)
    DO UPDATE SET
      correct_count = quiz_topic_stats.correct_count + EXCLUDED.correct_count,
      answered_count = quiz_topic_stats.answered_count + EXCLUDED.answered_count;

    PERFORM public.update_weekly_leaderboard(
      v_user_id, v_topic_rec.topic_id, v_topic_composite, v_topic_rec.answered, v_topic_rec.correct
    );
  END LOOP;

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
