import { supabase } from '../config/supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
import { DEFAULT_LOCALE } from '../i18n/languages';

export async function callGenerateFacts(userId, topicIds, locale = DEFAULT_LOCALE) {
  const { data: { session } } = await supabase.auth.getSession();
  const body = { user_id: userId, locale };
  if (topicIds?.length > 0) {
    body.topic_ids = topicIds;
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-facts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      facts_generated: 0,
      error: result.error ?? 'Could not generate new facts',
    };
  }

  return {
    success: true,
    facts_generated: result.facts_generated ?? 0,
  };
}
