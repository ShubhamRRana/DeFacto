/// <reference path="../global.d.ts" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();

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

    // Get the user's selected topics
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

    let totalInserted = 0;

    // Generate 5 facts per topic
    for (const ut of userTopics) {
      const topicName = (ut.topics as any)?.name;
      if (!topicName) continue;

      const prompt = `Generate 5 unique, fascinating, and verified facts about the topic: "${topicName}".

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
              content: 'You are an expert fact generator. You only return valid JSON arrays as instructed. Never add markdown, code blocks, or extra explanation.',
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

      let facts: any[] = [];
      try {
        facts = JSON.parse(rawContent);
      } catch {
        // Skip this topic if JSON parse fails
        continue;
      }

      if (!Array.isArray(facts) || facts.length === 0) continue;

      const rows = facts
        .filter(f => f.content && f.source_name)
        .map(f => ({
          topic_id: ut.topic_id,
          content: f.content,
          source_name: f.source_name,
          source_url: f.source_url ?? null,
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
