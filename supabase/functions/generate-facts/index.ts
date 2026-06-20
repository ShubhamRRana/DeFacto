/// <reference path="../global.d.ts" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIN_FACTS_PER_TOPIC = 5;
const SUPPORTED_LOCALES = ['en', 'ar', 'es', 'fr', 'pt-BR'] as const;

const LOCALE_TO_AI_LANGUAGE: Record<string, string> = {
  en: 'English',
  ar: 'Modern Standard Arabic',
  es: 'Spanish',
  fr: 'French',
  'pt-BR': 'Brazilian Portuguese',
};

function resolveLocale(raw: unknown): string {
  if (typeof raw === 'string' && SUPPORTED_LOCALES.includes(raw as typeof SUPPORTED_LOCALES[number])) {
    return raw;
  }
  return 'en';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, topic_ids, locale: rawLocale } = await req.json();
    const locale = resolveLocale(rawLocale);
    const languageName = LOCALE_TO_AI_LANGUAGE[locale] ?? 'English';

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const openAIKey = Deno.env.get('OPENAI_API_KEY')!;

    const { data: userTopics } = await supabase
      .from('user_topics')
      .select('topic_id, topics(name)')
      .eq('user_id', user_id);

    if (!userTopics || userTopics.length === 0) {
      return new Response(JSON.stringify({ error: 'No topics found for user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isTargeted = Array.isArray(topic_ids) && topic_ids.length > 0;
    const topicsToProcess = isTargeted
      ? userTopics.filter((ut) => topic_ids.includes(ut.topic_id))
      : userTopics;

    let totalInserted = 0;

    for (const ut of topicsToProcess) {
      const topicName = (ut.topics as { name?: string } | null)?.name;
      if (!topicName) continue;

      if (isTargeted) {
        const { count } = await supabase
          .from('facts')
          .select('*', { count: 'exact', head: true })
          .eq('topic_id', ut.topic_id)
          .eq('locale', locale);

        if ((count ?? 0) >= MIN_FACTS_PER_TOPIC) continue;
      }

      const prompt = `Generate 5 unique, fascinating, and verified facts about the topic: "${topicName}".

Write ALL content in ${languageName}.

Rules:
- Each fact must be surprising or counterintuitive
- Keep each fact to 2-3 sentences maximum
- Facts must be accurate and educational
- Vary the facts — cover different angles of the topic

Return ONLY a valid JSON array with this exact structure, no extra text:
[
  {
    "content": "The fact goes here.",
    "source_name": "Source Name",
    "source_url": "https://example.com"
  }
]`;

      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert fact generator. Write in ${languageName}. You only return valid JSON arrays as instructed. Never add markdown, code blocks, or extra explanation.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.85,
          max_tokens: 1500,
        }),
      });

      const aiData = await aiResponse.json();
      const rawContent = aiData.choices?.[0]?.message?.content ?? '[]';

      let facts: { content?: string; source_name?: string; source_url?: string }[] = [];
      try {
        facts = JSON.parse(rawContent);
      } catch {
        continue;
      }

      if (!Array.isArray(facts) || facts.length === 0) continue;

      const rows = facts
        .filter((f) => f.content && f.source_name)
        .map((f) => ({
          topic_id: ut.topic_id,
          content: f.content,
          source_name: f.source_name,
          source_url: f.source_url ?? null,
          locale,
        }));

      if (rows.length > 0) {
        const { data: inserted } = await supabase
          .from('facts')
          .insert(rows)
          .select();
        totalInserted += inserted?.length ?? 0;
      }
    }

    return new Response(
      JSON.stringify({ success: true, facts_generated: totalInserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
