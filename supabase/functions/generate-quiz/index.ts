/// <reference path="../global.d.ts" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIN_FACTS_PER_TOPIC = 5;
const MAX_QUESTIONS_PER_CALL = 30;
const MIN_QUESTIONS_PER_CALL = 5;
const QUESTION_COUNT_STEP = 5;
const RATE_LIMIT_PER_HOUR = 10;

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

type Difficulty = 'easy' | 'medium' | 'hard';
type QuestionType = 'mcq' | 'true_false';

interface GeneratedQuestion {
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_answer: string;
  difficulty: Difficulty;
  fact_id?: string | null;
}

function parseJsonArray(raw: string): unknown[] {
  try {
    const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function generateFactsForTopic(
  supabase: ReturnType<typeof createClient>,
  openAIKey: string,
  topicId: string,
  topicName: string,
  locale: string,
  languageName: string,
): Promise<number> {
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
      Authorization: `Bearer ${openAIKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert fact generator. Write in ${languageName}. You only return valid JSON arrays as instructed.`,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 1500,
    }),
  });

  if (!aiResponse.ok) {
    const errBody = await aiResponse.text();
    console.error('OpenAI fact generation failed:', aiResponse.status, errBody);
    return 0;
  }

  const aiData = await aiResponse.json();
  const rawContent = aiData.choices?.[0]?.message?.content ?? '[]';
  const parsed = parseJsonArray(rawContent) as { content?: string; source_name?: string; source_url?: string }[];

  if (parsed.length === 0) return 0;

  const rows = parsed
    .filter((f) => f.content && f.source_name)
    .map((f) => ({
      topic_id: topicId,
      content: f.content,
      source_name: f.source_name,
      source_url: f.source_url ?? null,
      locale,
    }));

  if (rows.length === 0) return 0;

  const { data: inserted, error: insertError } = await supabase.from('facts').insert(rows).select();
  if (insertError) {
    console.error('Fact insert failed:', insertError.message);
    return 0;
  }
  return inserted?.length ?? 0;
}

async function generateQuestionsFromFacts(
  openAIKey: string,
  topicName: string,
  difficulty: Difficulty,
  count: number,
  facts: { id: string; content: string }[],
  languageName: string,
): Promise<GeneratedQuestion[]> {
  const factList = facts
    .map((f, i) => `[${i}] (id: ${f.id}) ${f.content}`)
    .join('\n\n');

  const prompt = `Create ${count} quiz questions about "${topicName}" at ${difficulty} difficulty.

Write ALL questions, options, and answers in ${languageName}.

Use these facts as source material (reference fact id when relevant):
${factList}

Rules:
- Mix ~70% multiple choice (mcq) and ~30% true/false (true_false)
- MCQ must have exactly 4 options in the options array
- For true_false, use localized "True" and "False" equivalents in ${languageName}
- correct_answer must exactly match one option
- Questions must be answerable from the facts
- Difficulty: easy = direct recall, medium = inference, hard = nuanced details

Return ONLY a valid JSON array:
[
  {
    "question_text": "Question here?",
    "question_type": "mcq",
    "options": ["A", "B", "C", "D"],
    "correct_answer": "A",
    "difficulty": "${difficulty}",
    "fact_id": null
  }
]`;

  const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAIKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert quiz writer. Write in ${languageName}. Return only valid JSON arrays.`,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2500,
    }),
  });

  if (!aiResponse.ok) {
    const errBody = await aiResponse.text();
    console.error('OpenAI question generation failed:', aiResponse.status, errBody);
    return [];
  }

  const aiData = await aiResponse.json();
  const rawContent = aiData.choices?.[0]?.message?.content ?? '[]';
  const parsed = parseJsonArray(rawContent) as GeneratedQuestion[];
  return parsed.slice(0, count);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      user_id,
      topic_id,
      count = 10,
      difficulty = 'medium',
      include_bookmarks = false,
      locale: rawLocale,
    } = await req.json();

    const locale = resolveLocale(rawLocale);
    const languageName = LOCALE_TO_AI_LANGUAGE[locale] ?? 'English';

    if (!user_id || !topic_id) {
      return new Response(JSON.stringify({ error: 'user_id and topic_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawCount = Number(count) || 10;
    const questionCount = Math.min(
      Math.max(rawCount, MIN_QUESTIONS_PER_CALL),
      MAX_QUESTIONS_PER_CALL,
    );
    if (questionCount % QUESTION_COUNT_STEP !== 0) {
      return new Response(
        JSON.stringify({ error: 'count must be a multiple of 5 between 5 and 30' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const validDifficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
      return new Response(JSON.stringify({ error: 'Invalid difficulty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const openAIKey = Deno.env.get('OPENAI_API_KEY')!;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentSessions } = await supabase
      .from('quiz_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .gte('started_at', oneHourAgo);

    if ((recentSessions ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: topic } = await supabase
      .from('topics')
      .select('id, name')
      .eq('id', topic_id)
      .single();

    if (!topic) {
      return new Response(JSON.stringify({ error: 'Topic not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({
        user_id,
        topic_id,
        question_count: questionCount,
        difficulty,
        status: 'loading',
        include_bookmarks: include_bookmarks,
      })
      .select()
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: sessionError?.message ?? 'Could not create session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { count: factCount } = await supabase
      .from('facts')
      .select('*', { count: 'exact', head: true })
      .eq('topic_id', topic_id)
      .eq('locale', locale);

    if ((factCount ?? 0) < MIN_FACTS_PER_TOPIC) {
      await generateFactsForTopic(supabase, openAIKey, topic_id, topic.name, locale, languageName);
    }

    let factQuery = supabase
      .from('facts')
      .select('id, content')
      .eq('topic_id', topic_id)
      .eq('locale', locale)
      .limit(30);

    if (include_bookmarks) {
      const { data: bookmarks } = await supabase
        .from('bookmarks')
        .select('facts(id, content, topic_id)')
        .eq('user_id', user_id);

      const bookmarkFacts = (bookmarks ?? [])
        .map((b) => b.facts as { id: string; content: string; topic_id: string } | null)
        .filter((f): f is { id: string; content: string; topic_id: string } =>
          f !== null && f.topic_id === topic_id
        );

      if (bookmarkFacts.length > 0) {
        factQuery = supabase
          .from('facts')
          .select('id, content')
          .in('id', bookmarkFacts.map((f) => f.id));
      }
    }

    const { data: facts } = await factQuery;

    const { data: userSessions } = await supabase
      .from('quiz_sessions')
      .select('id')
      .eq('user_id', user_id);

    const sessionIds = userSessions?.map((s) => s.id) ?? [];
    let answeredIds = new Set<string>();

    if (sessionIds.length > 0) {
      const { data: answered } = await supabase
        .from('quiz_answers')
        .select('question_id')
        .in('session_id', sessionIds);
      answeredIds = new Set(answered?.map((a) => a.question_id) ?? []);
    }

    const { data: poolQuestions } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('topic_id', topic_id)
      .eq('difficulty', difficulty)
      .eq('locale', locale)
      .order('created_at', { ascending: false })
      .limit(100);

    const unseenPool = (poolQuestions ?? []).filter((q) => !answeredIds.has(q.id));
    const selectedQuestions = unseenPool.slice(0, questionCount);
    const needed = questionCount - selectedQuestions.length;

    let newQuestions: GeneratedQuestion[] = [];
    if (needed > 0 && facts && facts.length > 0) {
      newQuestions = await generateQuestionsFromFacts(
        openAIKey,
        topic.name,
        difficulty,
        needed,
        facts,
        languageName,
      );

      if (newQuestions.length > 0) {
        const validFactIds = new Set(facts.map((f) => f.id));
        const rows = newQuestions
          .filter((q) => q.question_text && q.correct_answer && q.options?.length)
          .map((q) => ({
            topic_id,
            fact_id: q.fact_id && validFactIds.has(q.fact_id) ? q.fact_id : null,
            created_by: user_id,
            question_text: q.question_text,
            question_type: q.question_type === 'true_false' ? 'true_false' : 'mcq',
            options: q.options,
            correct_answer: q.correct_answer,
            difficulty,
            source: 'ai',
            locale,
          }));

        if (rows.length > 0) {
          const { data: inserted, error: insertError } = await supabase
            .from('quiz_questions')
            .insert(rows)
            .select();
          if (insertError) {
            console.error('Question insert failed:', insertError.message);
          } else if (inserted) {
            selectedQuestions.push(...inserted.filter((q) => !answeredIds.has(q.id)));
          }
        }
      }
    }

    const finalQuestions = selectedQuestions.slice(0, questionCount);

    if (finalQuestions.length < questionCount) {
      await supabase
        .from('quiz_sessions')
        .update({ status: 'cancelled' })
        .eq('id', session.id);

      const errorMessage = finalQuestions.length === 0
        ? 'Could not generate quiz questions for this topic. Please try again in a moment.'
        : `Only ${finalQuestions.length} questions available. Try a shorter quiz or browse the feed first.`;

      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const sessionQuestionRows = finalQuestions.map((q, index) => ({
      session_id: session.id,
      question_id: q.id,
      sort_order: index,
    }));

    await supabase.from('quiz_session_questions').insert(sessionQuestionRows);

    await supabase
      .from('quiz_sessions')
      .update({ status: 'active' })
      .eq('id', session.id);

    const clientQuestions = finalQuestions.map((q, index) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      difficulty: q.difficulty,
      fact_id: q.fact_id,
      sort_order: index,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        topic_name: topic.name,
        questions: clientQuestions,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
