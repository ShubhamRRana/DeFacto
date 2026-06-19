-- Extend quiz session question counts from fixed (5, 10, 20) to 5–30 in steps of 5

ALTER TABLE public.quiz_sessions
  DROP CONSTRAINT IF EXISTS quiz_sessions_question_count_check;

ALTER TABLE public.quiz_sessions
  ADD CONSTRAINT quiz_sessions_question_count_check
  CHECK (question_count >= 5 AND question_count <= 30 AND question_count % 5 = 0);

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

  -- Linear scale: 5 questions → 0.8, 30 questions → 1.3
  v_length_bonus := 0.8 + (p_question_count - 5) * (0.5 / 25.0);

  RETURN GREATEST(
    0,
    ROUND(p_correct * v_difficulty_multiplier * v_speed_bonus * v_length_bonus)::int
  );
END;
$$;
