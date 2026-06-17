import { useState, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

const LOW_FACTS_THRESHOLD = 10; // trigger generation when fewer unseen facts remain

export function useFeed() {
  const [facts, setFacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [bookmarked, setBookmarked] = useState(new Set());
  const [liked, setLiked] = useState(new Set());

  const [generating, setGenerating] = useState(false);
  const interactionCount = useRef(0);

  const fetchFeed = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Count how many interactions user has made
    const { count } = await supabase
      .from('user_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    interactionCount.current = count ?? 0;

    let factsData = [];

    if (interactionCount.current >= 3) {
      // Enough data — use personalized algorithm
      const { data } = await supabase.rpc('get_personalized_feed', {
        p_user_id: user.id,
        p_limit: 50,
      });

      if (data && data.length > 0) {
        // Reshape RPC result to match our facts+topics structure
        factsData = data.map(row => ({
          id: row.id,
          topic_id: row.topic_id,
          content: row.content,
          source_name: row.source_name,
          source_url: row.source_url,
          likes_count: row.likes_count,
          created_at: row.created_at,
          topics: {
            name: row.topic_name,
            icon: row.topic_icon,
            color: row.topic_color,
          },
        }));
        setIsPersonalized(true);
      }
    }

    // Fallback: not enough interactions yet — fetch by selected topics
    if (factsData.length === 0) {
      const { data: userTopics } = await supabase
        .from('user_topics')
        .select('topic_id')
        .eq('user_id', user.id);

      const topicIds = userTopics?.map(t => t.topic_id) ?? [];

      const { data } = await supabase
        .from('facts')
        .select('*, topics(name, icon, color)')
        .in('topic_id', topicIds)
        .order('created_at', { ascending: false })
        .limit(50);

      // Shuffle for variety
      factsData = (data ?? []).sort(() => Math.random() - 0.5);
      setIsPersonalized(false);
    }

    // Load existing bookmarks and likes in parallel
    const [{ data: bData }, { data: lData }] = await Promise.all([
      supabase.from('bookmarks').select('fact_id').eq('user_id', user.id),
      supabase.from('user_interactions').select('fact_id').eq('user_id', user.id).eq('action', 'like'),
    ]);

    setBookmarked(new Set(bData?.map(b => b.fact_id) ?? []));
    setLiked(new Set(lData?.map(l => l.fact_id) ?? []));
    setFacts(factsData);
    setLoading(false);

    // Auto-generate more facts if feed is running low
    if (factsData.length < LOW_FACTS_THRESHOLD) {
      generateFacts(user.id);
    }
  }, []);

  const generateFacts = useCallback(async (userId) => {
    if (generating) return; // prevent duplicate calls
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${SUPABASE_URL}/functions/v1/generate-facts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ user_id: userId }),
      });
    } catch {
      // Silent fail — user still sees existing facts
    } finally {
      setGenerating(false);
    }
  }, [generating]);

  const toggleBookmark = async (factId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const isBookmarked = bookmarked.has(factId);

    // Optimistic update
    setBookmarked(prev => {
      const next = new Set(prev);
      isBookmarked ? next.delete(factId) : next.add(factId);
      return next;
    });

    if (isBookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('fact_id', factId);
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, fact_id: factId });
    }
  };

  const toggleLike = async (factId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const isLiked = liked.has(factId);

    setLiked(prev => {
      const next = new Set(prev);
      isLiked ? next.delete(factId) : next.add(factId);
      return next;
    });

    if (isLiked) {
      await supabase.from('user_interactions')
        .delete()
        .eq('user_id', user.id)
        .eq('fact_id', factId);
      await supabase.rpc('decrement_likes', { fact_id: factId });
    } else {
      await supabase.from('user_interactions')
        .upsert({ user_id: user.id, fact_id: factId, action: 'like' });
      await supabase.rpc('increment_likes', { fact_id: factId });
    }
  };

  const recordSkip = async (factId) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('user_interactions')
      .upsert({ user_id: user.id, fact_id: factId, action: 'skip' });
  };

  return {
    facts,
    loading,
    isPersonalized,
    generating,
    bookmarked,
    liked,
    fetchFeed,
    generateFacts,
    toggleBookmark,
    toggleLike,
    recordSkip,
  };
}
