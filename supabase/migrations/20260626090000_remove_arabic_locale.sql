-- Arabic support removed from the app; drop 'ar' from preferred_locale

UPDATE public.profiles
  SET preferred_locale = 'en'
  WHERE preferred_locale = 'ar';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_preferred_locale_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_preferred_locale_check
  CHECK (preferred_locale IN ('en', 'es', 'fr', 'pt-BR'));
