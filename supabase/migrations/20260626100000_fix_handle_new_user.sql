-- Fix signup trigger: insert into public.profiles (not stale user_profiles table)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locale text := COALESCE(new.raw_user_meta_data->>'preferred_locale', 'en');
BEGIN
  IF v_locale NOT IN ('en', 'es', 'fr', 'pt-BR') THEN
    v_locale := 'en';
  END IF;

  INSERT INTO public.profiles (id, full_name, preferred_locale)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', v_locale);

  RETURN new;
END;
$$;
