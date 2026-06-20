-- Locale column for AI-generated content

ALTER TABLE public.facts
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';

CREATE INDEX IF NOT EXISTS facts_topic_locale_idx
  ON public.facts (topic_id, locale);

CREATE INDEX IF NOT EXISTS quiz_questions_topic_locale_idx
  ON public.quiz_questions (topic_id, locale);
