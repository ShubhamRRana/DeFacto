-- Table for per-user hidden custom topics
CREATE TABLE IF NOT EXISTS public.user_hidden_topics (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic_id)
);

ALTER TABLE public.user_hidden_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own hidden topics"
  ON public.user_hidden_topics
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RPC: hide a custom topic created by the current user
CREATE OR REPLACE FUNCTION public.hide_custom_topic(p_topic_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic public.topics;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_topic
  FROM public.topics
  WHERE id = p_topic_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Topic not found';
  END IF;

  IF NOT v_topic.is_custom THEN
    RAISE EXCEPTION 'Only custom interests can be deleted';
  END IF;

  IF v_topic.created_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only delete interests you created';
  END IF;

  INSERT INTO public.user_hidden_topics (user_id, topic_id)
  VALUES (auth.uid(), p_topic_id)
  ON CONFLICT (user_id, topic_id) DO NOTHING;

  DELETE FROM public.user_topics
  WHERE user_id = auth.uid() AND topic_id = p_topic_id;

  RETURN p_topic_id;
END;
$$;

REVOKE ALL ON FUNCTION public.hide_custom_topic(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hide_custom_topic(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.hide_custom_topic(uuid) TO authenticated;

-- Update create_custom_topic to unhide when re-adding
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

  RETURN v_result;
END;
$$;
