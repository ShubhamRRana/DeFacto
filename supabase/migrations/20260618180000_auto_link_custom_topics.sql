-- Auto-link custom topics to user_topics on creation + backfill orphans

CREATE OR REPLACE FUNCTION public.create_custom_topic(p_name text)
RETURNS public.topics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_existing public.topics;
  v_result public.topics;
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
    v_result := v_existing;
  ELSE
    INSERT INTO public.topics (name, icon, color, description, created_by, is_custom)
    VALUES (
      v_name,
      'add-circle',
      '#6C63FF',
      'Custom interest added by a De''Facto user',
      auth.uid(),
      true
    )
    RETURNING * INTO v_result;
  END IF;

  DELETE FROM public.user_hidden_topics
  WHERE user_id = auth.uid() AND topic_id = v_result.id;

  INSERT INTO public.user_topics (user_id, topic_id)
  VALUES (auth.uid(), v_result.id)
  ON CONFLICT (user_id, topic_id) DO NOTHING;

  RETURN v_result;
END;
$$;

-- Backfill: link orphan custom topics to their creator
INSERT INTO public.user_topics (user_id, topic_id)
SELECT t.created_by, t.id
FROM public.topics t
WHERE t.is_custom = true
  AND t.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_topics ut
    WHERE ut.user_id = t.created_by AND ut.topic_id = t.id
  )
ON CONFLICT DO NOTHING;
