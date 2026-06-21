-- Remove the ability for users to create custom interests.
-- Purge existing custom topics, drop their supporting RPCs/table/columns.

DELETE FROM public.user_topics
WHERE topic_id IN (SELECT id FROM public.topics WHERE is_custom = true);

DELETE FROM public.topics WHERE is_custom = true;

DROP FUNCTION IF EXISTS public.create_custom_topic(text);
DROP FUNCTION IF EXISTS public.hide_custom_topic(uuid);

DROP TABLE IF EXISTS public.user_hidden_topics;

DROP INDEX IF EXISTS public.topics_name_lower_unique;

ALTER TABLE public.topics
  DROP COLUMN IF EXISTS is_custom,
  DROP COLUMN IF EXISTS created_by;
