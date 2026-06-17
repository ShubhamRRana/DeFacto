-- Add columns for user-created topics
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;

-- Prevent duplicate topic names (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS topics_name_lower_unique
  ON public.topics (lower(trim(name)));

-- RPC: create or return existing custom topic
CREATE OR REPLACE FUNCTION public.create_custom_topic(p_name text)
RETURNS public.topics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_existing public.topics;
  v_new public.topics;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_name := trim(p_name);

  IF length(v_name) < 2 THEN
    RAISE EXCEPTION 'Interest name must be at least 2 characters';
  END IF;

  IF length(v_name) > 50 THEN
    RAISE EXCEPTION 'Interest name must be 50 characters or fewer';
  END IF;

  SELECT * INTO v_existing
  FROM public.topics
  WHERE lower(trim(name)) = lower(v_name)
  LIMIT 1;

  IF FOUND THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.topics (name, icon, color, description, created_by, is_custom)
  VALUES (
    v_name,
    'add-circle',
    '#6C63FF',
    'Custom interest added by a De''Facto user',
    auth.uid(),
    true
  )
  RETURNING * INTO v_new;

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_custom_topic(text) TO authenticated;

REVOKE ALL ON FUNCTION public.create_custom_topic(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_custom_topic(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_custom_topic(text) TO authenticated;
