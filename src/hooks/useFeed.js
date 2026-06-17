import { useState, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

const LOW_FACTS_THRESHOLD = 10; // trigger generation when fewer unseen facts remain

async function getUnseenCount(userId) {
  const [{ data: userTopics }, { data: interactions }] = await Promise.all([
    supabase.from('user_topics').select('topic_id').eq('user_id', userId),
    supabase.from('user_interactions').select('fact_id').eq('user_id', userId),
  ]);

  const topicIds = userTopics?.map(t => t.topic_id) ?? [];
  if (topicIds.length === 0) return 0;

  const seenSet = new Set(interactions?.map(i => i.fact_id) ?? []);

  const { data: topicFacts } = await supabase
    .from('facts')
    .select('id')
    .in('topic_id', topicIds);

  return (topicFacts ?? []).filter(f => !seenSet.has(f.id)).length;
}

async function getUnseenTopicCount(userId, topicId) {
  const { data: interactions } = await supabase
    .from('user_interactions')
    .select('fact_id')
    .eq('user_id', userId);

  const seenSet = new Set(interactions?.map(i => i.fact_id) ?? []);

  const { data: topicFacts } = await supabase
    .from('facts')
    .select('id')
    .eq('topic_id', topicId);

  return (topicFacts ?? []).filter(f => !seenSet.has(f.id)).length;
}

function mapPersonalizedRow(row) {
  return {
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
  };
}

export function useFeed() {
  const [facts, setFacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [bookmarked, setBookmarked] = useState(new Set());
  const [liked, setLiked] = useState(new Set());

  const [generating, setGenerating] = useState(false);
  const interactionCount = useRef(0);
  const generatingRef = useRef(false);
  const loadingMoreRef = useRef(false);

  const loadFeedData = useCallback(async (userId) => {
    const { count } = await supabase
      .from('user_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    interactionCount.current = count ?? 0;

    let factsData = [];
    let personalized = false;

    if (interactionCount.current >= 3) {
      const { data } = await supabase.rpc('get_personalized_feed', {
        p_user_id: userId,
        p_limit: 50,
      });

      if (data && data.length > 0) {
        factsData = data.map(mapPersonalizedRow);
        personalized = true;
      }
    }

    if (factsData.length === 0) {
      const { data: userTopics } = await supabase
        .from('user_topics')
        .select('topic_id')
        .eq('user_id', userId);

      const topicIds = userTopics?.map(t => t.topic_id) ?? [];

      const { data } = await supabase
        .from('facts')
        .select('*, topics(name, icon, color)')
        .in('topic_id', topicIds)
        .order('created_at', { ascending: false })
        .limit(50);

      factsData = (data ?? []).sort(() => Math.random() - 0.5);
      personalized = false;
    }

    return { factsData, isPersonalized: personalized };
  }, []);

  const syncBookmarksAndLikes = useCallback(async (userId) => {
    const [{ data: bData }, { data: lData }] = await Promise.all([
      supabase.from('bookmarks').select('fact_id').eq('user_id', userId),
      supabase.from('user_interactions').select('fact_id').eq('user_id', userId).eq('action', 'like'),
    ]);

    setBookmarked(new Set(bData?.map(b => b.fact_id) ?? []));
    setLiked(new Set(lData?.map(l => l.fact_id) ?? []));
  }, []);

  const applyFeedData = useCallback(async (userId, factsData, personalized) => {
    await syncBookmarksAndLikes(userId);
    setFacts(factsData);
    setIsPersonalized(personalized);
  }, [syncBookmarksAndLikes]);

  const generateFacts = useCallback(async (userId) => {
    if (generatingRef.current) {
      return { success: false, facts_generated: 0, skipped: true };
    }

    generatingRef.current = true;
    setGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-facts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          facts_generated: 0,
          error: body.error ?? 'Could not generate new facts',
        };
      }

      return {
        success: true,
        facts_generated: body.facts_generated ?? 0,
      };
    } catch (err) {
      return {
        success: false,
        facts_generated: 0,
        error: err instanceof Error ? err.message : 'Could not generate new facts',
      };
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  }, []);

  const fetchAndApplyFeed = useCallback(async (userId, mode) => {
    const unseenCount = await getUnseenCount(userId);
    let genResult = { success: true, facts_generated: 0, skipped: false };

    if (unseenCount < LOW_FACTS_THRESHOLD) {
      genResult = await generateFacts(userId);

      if (!genResult.success && !genResult.skipped) {
        return {
          success: false,
          error: genResult.error ?? 'Could not fetch new facts. Please try again.',
          unseenCount,
          genResult,
          newFactsCount: 0,
        };
      }
    }

    const { factsData, isPersonalized: personalized } = await loadFeedData(userId);
    await syncBookmarksAndLikes(userId);

    let newFactsCount = 0;

    if (mode === 'append') {
      setFacts(prev => {
        const existingIds = new Set(prev.map(f => f.id));
        const newFacts = factsData.filter(f => !existingIds.has(f.id));
        newFactsCount = newFacts.length;
        if (newFacts.length === 0) return prev;
        return [...prev, ...newFacts];
      });
      if (personalized) setIsPersonalized(true);
    } else {
      setFacts(factsData);
      setIsPersonalized(personalized);
      newFactsCount = factsData.length;
    }

    if (mode === 'replace' && factsData.length === 0) {
      return {
        success: false,
        error: 'No new facts available yet. Please try again in a moment.',
        unseenCount,
        genResult,
        newFactsCount: 0,
      };
    }

    if (
      mode === 'append' &&
      newFactsCount === 0 &&
      unseenCount < LOW_FACTS_THRESHOLD &&
      genResult.facts_generated === 0 &&
      !genResult.skipped
    ) {
      return {
        success: false,
        error: 'Could not fetch new facts. Please try again.',
        unseenCount,
        genResult,
        newFactsCount: 0,
      };
    }

    if (
      mode === 'replace' &&
      unseenCount < LOW_FACTS_THRESHOLD &&
      genResult.facts_generated === 0 &&
      !genResult.skipped
    ) {
      return {
        success: false,
        error: 'Could not fetch new facts. Please try again.',
        unseenCount,
        genResult,
        newFactsCount: 0,
      };
    }

    return {
      success: true,
      newFactsCount,
      facts_generated: genResult.facts_generated ?? 0,
    };
  }, [loadFeedData, syncBookmarksAndLikes, generateFacts]);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setRefreshError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { factsData, isPersonalized: personalized } = await loadFeedData(user.id);
    await applyFeedData(user.id, factsData, personalized);
    setLoading(false);

    const unseenCount = await getUnseenCount(user.id);
    if (unseenCount < LOW_FACTS_THRESHOLD) {
      generateFacts(user.id);
    }
  }, [loadFeedData, applyFeedData, generateFacts]);

  const refreshFeed = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRefreshing(false);
      return { success: false, error: 'Not signed in' };
    }

    const result = await fetchAndApplyFeed(user.id, 'replace');
    setRefreshing(false);

    if (!result.success) {
      setRefreshError(result.error);
      return { success: false, error: result.error };
    }

    return { success: true, facts_generated: result.facts_generated ?? 0 };
  }, [fetchAndApplyFeed]);

  const loadMoreFeed = useCallback(async () => {
    if (loadingMoreRef.current) {
      return { success: false, skipped: true };
    }

    loadingMoreRef.current = true;
    setRefreshing(true);
    setRefreshError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      loadingMoreRef.current = false;
      setRefreshing(false);
      return { success: false, error: 'Not signed in' };
    }

    const result = await fetchAndApplyFeed(user.id, 'append');
    loadingMoreRef.current = false;
    setRefreshing(false);

    if (!result.success) {
      setRefreshError(result.error);
      return { success: false, error: result.error, newFactsCount: 0 };
    }

    return { success: true, newFactsCount: result.newFactsCount ?? 0 };
  }, [fetchAndApplyFeed]);

  const toggleBookmark = async (factId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const isBookmarked = bookmarked.has(factId);

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

  const fetchTopicFacts = useCallback(async (topicId) => {
    const { data } = await supabase
      .from('facts')
      .select('*, topics(name, icon, color)')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: false })
      .limit(50);

    return (data ?? []).sort(() => Math.random() - 0.5);
  }, []);

  const refreshTopicFeed = useCallback(async (topicId) => {
    setRefreshing(true);
    setRefreshError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRefreshing(false);
      return { success: false, error: 'Not signed in' };
    }

    const unseenCount = await getUnseenTopicCount(user.id, topicId);
    let genResult = { success: true, facts_generated: 0, skipped: false };

    if (unseenCount < LOW_FACTS_THRESHOLD) {
      genResult = await generateFacts(user.id);

      if (!genResult.success && !genResult.skipped) {
        const error = genResult.error ?? 'Could not fetch new facts. Please try again.';
        setRefreshError(error);
        setRefreshing(false);
        return { success: false, error };
      }
    }

    const factsData = await fetchTopicFacts(topicId);
    setRefreshing(false);

    if (factsData.length === 0) {
      const error = 'No new facts available yet. Please try again in a moment.';
      setRefreshError(error);
      return { success: false, error };
    }

    if (
      unseenCount < LOW_FACTS_THRESHOLD &&
      genResult.facts_generated === 0 &&
      !genResult.skipped
    ) {
      const error = 'Could not fetch new facts. Please try again.';
      setRefreshError(error);
      return { success: false, error };
    }

    return { success: true, facts: factsData };
  }, [fetchTopicFacts, generateFacts]);

  const loadMoreTopicFeed = useCallback(async (topicId, existingFacts) => {
    if (loadingMoreRef.current) {
      return { success: false, skipped: true };
    }

    loadingMoreRef.current = true;
    setRefreshing(true);
    setRefreshError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      loadingMoreRef.current = false;
      setRefreshing(false);
      return { success: false, error: 'Not signed in' };
    }

    const unseenCount = await getUnseenTopicCount(user.id, topicId);
    let genResult = { success: true, facts_generated: 0, skipped: false };

    if (unseenCount < LOW_FACTS_THRESHOLD) {
      genResult = await generateFacts(user.id);

      if (!genResult.success && !genResult.skipped) {
        const error = genResult.error ?? 'Could not fetch new facts. Please try again.';
        setRefreshError(error);
        loadingMoreRef.current = false;
        setRefreshing(false);
        return { success: false, error, newFactsCount: 0 };
      }
    }

    const factsData = await fetchTopicFacts(topicId);
    const existingIds = new Set(existingFacts.map(f => f.id));
    const newFacts = factsData.filter(f => !existingIds.has(f.id));
    loadingMoreRef.current = false;
    setRefreshing(false);

    if (
      newFacts.length === 0 &&
      unseenCount < LOW_FACTS_THRESHOLD &&
      genResult.facts_generated === 0 &&
      !genResult.skipped
    ) {
      const error = 'Could not fetch new facts. Please try again.';
      setRefreshError(error);
      return { success: false, error, newFactsCount: 0 };
    }

    return { success: true, newFacts, newFactsCount: newFacts.length };
  }, [fetchTopicFacts, generateFacts]);

  return {
    facts,
    loading,
    refreshing,
    refreshError,
    isPersonalized,
    generating,
    bookmarked,
    liked,
    fetchFeed,
    refreshFeed,
    loadMoreFeed,
    fetchTopicFacts,
    refreshTopicFeed,
    loadMoreTopicFeed,
    generateFacts,
    toggleBookmark,
    toggleLike,
    recordSkip,
  };
}
