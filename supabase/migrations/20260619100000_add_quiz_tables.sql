-- Quiz feature: enums, tables, profile columns, RLS

CREATE TYPE public.quiz_question_type AS ENUM ('mcq', 'true_false');
CREATE TYPE public.quiz_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE public.quiz_question_source AS ENUM ('ai', 'user', 'bookmark');
CREATE TYPE public.quiz_session_status AS ENUM ('loading', 'active', 'completed', 'cancelled');

CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  fact_id uuid REFERENCES public.facts(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  question_text text NOT NULL,
  question_type public.quiz_question_type NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer text NOT NULL,
  difficulty public.quiz_difficulty NOT NULL DEFAULT 'medium',
  source public.quiz_question_source NOT NULL DEFAULT 'ai',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quiz_questions_text_len CHECK (char_length(question_text) BETWEEN 5 AND 500)
);

CREATE INDEX quiz_questions_topic_difficulty_idx
  ON public.quiz_questions (topic_id, difficulty);

CREATE TABLE public.quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  question_count int NOT NULL CHECK (question_count IN (5, 10, 20)),
  difficulty public.quiz_difficulty NOT NULL,
  status public.quiz_session_status NOT NULL DEFAULT 'loading',
  score_correct int NOT NULL DEFAULT 0,
  composite_score int NOT NULL DEFAULT 0,
  duration_ms int NOT NULL DEFAULT 0,
  include_bookmarks boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX quiz_sessions_user_idx ON public.quiz_sessions (user_id, started_at DESC);

CREATE TABLE public.quiz_session_questions (
  session_id uuid NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  sort_order int NOT NULL,
  PRIMARY KEY (session_id, question_id)
);

CREATE TABLE public.quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  user_answer text NOT NULL,
  is_correct boolean NOT NULL,
  time_ms int NOT NULL DEFAULT 0 CHECK (time_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);

CREATE TABLE public.user_badges (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_key)
);

CREATE TABLE public.quiz_leaderboard_weekly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  composite_score int NOT NULL DEFAULT 0,
  questions_answered int NOT NULL DEFAULT 0,
  correct_count int NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX quiz_leaderboard_weekly_global_unique
  ON public.quiz_leaderboard_weekly (user_id, week_start)
  WHERE topic_id IS NULL;

CREATE UNIQUE INDEX quiz_leaderboard_weekly_topic_unique
  ON public.quiz_leaderboard_weekly (user_id, topic_id, week_start)
  WHERE topic_id IS NOT NULL;

CREATE INDEX quiz_leaderboard_weekly_score_idx
  ON public.quiz_leaderboard_weekly (week_start, topic_id, composite_score DESC);

CREATE TABLE public.quiz_topic_stats (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  correct_count int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, topic_id)
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quiz_streak_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quiz_last_active_date date;

-- RLS
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_leaderboard_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_topic_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY quiz_questions_select ON public.quiz_questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY quiz_questions_insert ON public.quiz_questions
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND source IN ('user', 'bookmark'));

CREATE POLICY quiz_sessions_select ON public.quiz_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY quiz_sessions_insert ON public.quiz_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY quiz_sessions_update ON public.quiz_sessions
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY quiz_session_questions_select ON public.quiz_session_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY quiz_answers_select ON public.quiz_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY user_badges_select ON public.user_badges
  FOR SELECT TO authenticated USING (true);

CREATE POLICY quiz_leaderboard_weekly_select ON public.quiz_leaderboard_weekly
  FOR SELECT TO authenticated USING (true);

CREATE POLICY quiz_topic_stats_select ON public.quiz_topic_stats
  FOR SELECT TO authenticated USING (user_id = auth.uid());
