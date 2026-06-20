-- User preferred locale for i18n

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_locale text NOT NULL DEFAULT 'en'
  CHECK (preferred_locale IN ('en', 'ar', 'es', 'fr', 'pt-BR'));
