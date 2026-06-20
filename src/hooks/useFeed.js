import { useState, useCallback, useRef, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../config/supabase';
import { callGenerateFacts } from '../utils/generateFacts';
import { useLocale } from '../theme/LocaleContext';
import { DEFAULT_LOCALE } from '../i18n/languages';
import {
  isOnline,
  addBookmarkLocally,
  removeBookmarkLocally,
  addBookmarkToCache,
  removeBookmarkFromCache,
  flushPendingBookmarkOps,
} from '../utils/bookmarkCache';

const LOW_FACTS_THRESHOLD = 10;
const MIN_FACTS_PER_TOPIC = 5;

async function getUnseenCount(userId, locale = DEFAULT_LOCALE) {
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
    .in('topic_id', topicIds)
    .eq('locale', locale);

  return (topicFacts ?? []).filter(f => !seenSet.has(f.id)).length;
}

async function getUnseenTopicCount(userId, topicId, locale = DEFAULT_LOCALE) {
  const { data: interactions } = await supabase
    .from('user_interactions')
    .select('fact_id')
    .eq('user_id', userId);

  const seenSet = new Set(interactions?.map(i => i.fact_id) ?? []);

  const { data: topicFacts } = await supabase
    .from('facts')
    .select('id')
    .eq('topic_id', topicId)
    .eq('locale', locale);

  return (topicFacts ?? []).filter(f => !seenSet.has(f.id)).length;
}

async function getTopicsNeedingFacts(userId, locale = DEFAULT_LOCALE) {
  const { data: userTopics } = await supabase
    .from('user_topics')
    .select('topic_id')
    .eq('user_id', userId);

  const topicIds = userTopics?.map(t => t.topic_id) ?? [];
  if (topicIds.length === 0) return [];

  const { data: facts } = await supabase
    .from('facts')
    .select('topic_id')
    .in('topic_id', topicIds)
    .eq('locale', locale);

  const counts = Object.fromEntries(topicIds.map(id => [id, 0]));
  for (const f of facts ?? []) {
    counts[f.topic_id] = (counts[f.topic_id] ?? 0) + 1;
  }

  return topicIds.filter(id => counts[id] < MIN_FACTS_PER_TOPIC);
}

async function getTopicFactCount(topicId, locale = DEFAULT_LOCALE) {
  const { count } = await supabase
    .from('facts')
    .select('*', { count: 'exact', head: true })
    .eq('topic_id', topicId)
    .eq('locale', locale);

  return count ?? 0;
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
  const { locale } = useLocale();
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
  const factsRef = useRef(facts);
  factsRef.current = facts;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await flushPendingBookmarkOps(user.id);
      }
    });
    return unsubscribe;
  }, []);

  const loadFeedData = useCallback(async (userId, activeLocale = locale) => {
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
        factsData = data
          .filter((row) => !row.locale || row.locale === activeLocale)
          .map(mapPersonalizedRow);
        personalized = factsData.length > 0;
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
        .eq('locale', activeLocale)
        .order('created_at', { ascending: false })
        .limit(50);

      factsData = (data ?? []).sort(() => Math.random() - 0.5);
      personalized = false;
    }

    return { factsData, isPersonalized: personalized };
  }, [locale]);

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

  const generateFacts = useCallback(async (userId, topicIds, activeLocale = locale) => {
    if (generatingRef.current) {
      return { success: false, facts_generated: 0, skipped: true };
    }

    generatingRef.current = true;
    setGenerating(true);

    try {
      return await callGenerateFacts(userId, topicIds, activeLocale);
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
  }, [locale]);

  const maybeGenerateFacts = useCallback(async (userId, options = {}) => {
    const { topicId } = options;
    const unseenCount = await getUnseenCount(userId, locale);
    const topicsNeedingFacts = await getTopicsNeedingFacts(userId, locale);

    if (topicId) {
      const factCount = await getTopicFactCount(topicId, locale);
      if (factCount >= MIN_FACTS_PER_TOPIC) {
        const unseenTopicCount = await getUnseenTopicCount(userId, topicId, locale);
        if (unseenTopicCount >= LOW_FACTS_THRESHOLD) {
          return { success: true, facts_generated: 0, skipped: true };
        }
        return generateFacts(userId);
      }
      return generateFacts(userId, [topicId]);
    }

    if (unseenCount < LOW_FACTS_THRESHOLD) {
      return generateFacts(userId);
    }

    if (topicsNeedingFacts.length > 0) {
      return generateFacts(userId, topicsNeedingFacts);
    }

    return { success: true, facts_generated: 0, skipped: true };
  }, [generateFacts, locale]);

  const fetchAndApplyFeed = useCallback(async (userId, mode) => {
    const unseenCount = await getUnseenCount(userId, locale);
    const topicsNeedingFacts = await getTopicsNeedingFacts(userId, locale);
    let genResult = { success: true, facts_generated: 0, skipped: false };

    if (unseenCount < LOW_FACTS_THRESHOLD) {
      genResult = await generateFacts(userId);
    } else if (topicsNeedingFacts.length > 0) {
      genResult = await generateFacts(userId, topicsNeedingFacts);
    }

    if (!genResult.success && !genResult.skipped) {
      return {
        success: false,
        error: genResult.error ?? 'Could not fetch new facts. Please try again.',
        unseenCount,
        genResult,
        newFactsCount: 0,
      };
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

    const generationAttempted = unseenCount < LOW_FACTS_THRESHOLD || topicsNeedingFacts.length > 0;

    if (
      mode === 'append' &&
      newFactsCount === 0 &&
      generationAttempted &&
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
      generationAttempted &&
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
  }, [loadFeedData, syncBookmarksAndLikes, generateFacts, locale]);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setRefreshError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    await flushPendingBookmarkOps(user.id);

    const unseenCount = await getUnseenCount(user.id, locale);
    const topicsNeedingFacts = await getTopicsNeedingFacts(user.id, locale);

    if (unseenCount < LOW_FACTS_THRESHOLD) {
      await generateFacts(user.id);
    } else if (topicsNeedingFacts.length > 0) {
      await generateFacts(user.id, topicsNeedingFacts);
    }

    const { factsData, isPersonalized: personalized } = await loadFeedData(user.id);
    await applyFeedData(user.id, factsData, personalized);
    setLoading(false);
  }, [loadFeedData, applyFeedData, generateFacts, locale]);

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
    if (!user) return;

    const isBookmarked = bookmarked.has(factId);
    const fact = factsRef.current.find((f) => f.id === factId);

    setBookmarked((prev) => {
      const next = new Set(prev);
      isBookmarked ? next.delete(factId) : next.add(factId);
      return next;
    });

    const online = await isOnline();

    if (isBookmarked) {
      if (online) {
        await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('fact_id', factId);
        await removeBookmarkFromCache(user.id, factId);
      } else {
        await removeBookmarkLocally(user.id, factId);
      }
    } else if (fact) {
      if (online) {
        const { data, error } = await supabase
          .from('bookmarks')
          .insert({ user_id: user.id, fact_id: factId })
          .select('id, created_at')
          .single();

        if (!error && data) {
          await addBookmarkToCache(user.id, fact, data);
        }
      } else {
        await addBookmarkLocally(user.id, fact);
      }
    } else if (online) {
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

  const fetchTopicFacts = useCallback(async (topicId, activeLocale = locale) => {
    const { data } = await supabase
      .from('facts')
      .select('*, topics(name, icon, color)')
      .eq('topic_id', topicId)
      .eq('locale', activeLocale)
      .order('created_at', { ascending: false })
      .limit(50);

    return (data ?? []).sort(() => Math.random() - 0.5);
  }, [locale]);

  const refreshTopicFeed = useCallback(async (topicId) => {
    setRefreshing(true);
    setRefreshError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRefreshing(false);
      return { success: false, error: 'Not signed in' };
    }

    const genResult = await maybeGenerateFacts(user.id, { topicId });

    if (!genResult.success && !genResult.skipped) {
      const error = genResult.error ?? 'Could not fetch new facts. Please try again.';
      setRefreshError(error);
      setRefreshing(false);
      return { success: false, error };
    }

    const factsData = await fetchTopicFacts(topicId);
    setRefreshing(false);

    if (factsData.length === 0 && !genResult.skipped && genResult.facts_generated === 0) {
      const error = 'No new facts available yet. Please try again in a moment.';
      setRefreshError(error);
      return { success: false, error };
    }

    if (factsData.length === 0) {
      const error = 'No new facts available yet. Please try again in a moment.';
      setRefreshError(error);
      return { success: false, error };
    }

    return { success: true, facts: factsData };
  }, [fetchTopicFacts, maybeGenerateFacts]);

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

    const genResult = await maybeGenerateFacts(user.id, { topicId });

    if (!genResult.success && !genResult.skipped) {
      const error = genResult.error ?? 'Could not fetch new facts. Please try again.';
      setRefreshError(error);
      loadingMoreRef.current = false;
      setRefreshing(false);
      return { success: false, error, newFactsCount: 0 };
    }

    const factsData = await fetchTopicFacts(topicId);
    const existingIds = new Set(existingFacts.map(f => f.id));
    const newFacts = factsData.filter(f => !existingIds.has(f.id));
    loadingMoreRef.current = false;
    setRefreshing(false);

    if (
      newFacts.length === 0 &&
      !genResult.skipped &&
      genResult.facts_generated === 0
    ) {
      const error = 'Could not fetch new facts. Please try again.';
      setRefreshError(error);
      return { success: false, error, newFactsCount: 0 };
    }

    return { success: true, newFacts, newFactsCount: newFacts.length };
  }, [fetchTopicFacts, maybeGenerateFacts]);

  const fetchTopicFactsWithGeneration = useCallback(async (topicId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await maybeGenerateFacts(user.id, { topicId });
    }
    return fetchTopicFacts(topicId);
  }, [fetchTopicFacts, maybeGenerateFacts]);

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
    fetchTopicFactsWithGeneration,
    refreshTopicFeed,
    loadMoreTopicFeed,
    generateFacts,
    toggleBookmark,
    toggleLike,
    recordSkip,
  };
}
