import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../config/supabase';

const storeKey = (userId) => `bookmarks:${userId}`;

export async function isOnline() {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function factToSnapshot(fact) {
  return {
    id: fact.id,
    content: fact.content,
    source_name: fact.source_name ?? null,
    source_url: fact.source_url ?? null,
    topics: fact.topics
      ? {
          name: fact.topics.name,
          icon: fact.topics.icon,
          color: fact.topics.color,
        }
      : null,
  };
}

function buildBookmarkRow(fact, bookmarkId, createdAt) {
  return {
    id: bookmarkId,
    created_at: createdAt ?? new Date().toISOString(),
    facts: factToSnapshot(fact),
  };
}

export async function loadBookmarkStore(userId) {
  try {
    const raw = await AsyncStorage.getItem(storeKey(userId));
    if (!raw) return { bookmarks: [], pending: [] };
    const parsed = JSON.parse(raw);
    return {
      bookmarks: parsed.bookmarks ?? [],
      pending: parsed.pending ?? [],
    };
  } catch {
    return { bookmarks: [], pending: [] };
  }
}

export async function saveBookmarkStore(userId, store) {
  await AsyncStorage.setItem(storeKey(userId), JSON.stringify(store));
}

export async function setCachedBookmarks(userId, rows) {
  const store = await loadBookmarkStore(userId);
  store.bookmarks = rows;
  await saveBookmarkStore(userId, store);
}

export async function addBookmarkLocally(userId, fact) {
  const store = await loadBookmarkStore(userId);
  const factId = fact.id;

  if (store.bookmarks.some((b) => b.facts?.id === factId)) {
    return store;
  }

  store.pending = store.pending.filter(
    (p) => !(p.op === 'remove' && p.factId === factId)
  );

  if (!store.pending.some((p) => p.op === 'add' && p.factId === factId)) {
    store.pending.push({
      op: 'add',
      factId,
      payload: factToSnapshot(fact),
    });
  }

  store.bookmarks.unshift(buildBookmarkRow(fact, `pending-${factId}`));
  await saveBookmarkStore(userId, store);
  return store;
}

export async function removeBookmarkLocally(userId, factId) {
  const store = await loadBookmarkStore(userId);
  store.bookmarks = store.bookmarks.filter((b) => b.facts?.id !== factId);

  const hadPendingAdd = store.pending.some(
    (p) => p.op === 'add' && p.factId === factId
  );
  store.pending = store.pending.filter(
    (p) => !(p.op === 'add' && p.factId === factId)
  );

  if (!hadPendingAdd) {
    if (!store.pending.some((p) => p.op === 'remove' && p.factId === factId)) {
      store.pending.push({ op: 'remove', factId });
    }
  }

  await saveBookmarkStore(userId, store);
  return store;
}

export async function addBookmarkToCache(userId, fact, serverRow) {
  const store = await loadBookmarkStore(userId);
  store.bookmarks = store.bookmarks.filter((b) => b.facts?.id !== fact.id);
  store.bookmarks.unshift({
    id: serverRow.id,
    created_at: serverRow.created_at,
    facts: factToSnapshot(fact),
  });
  await saveBookmarkStore(userId, store);
}

export async function removeBookmarkFromCache(userId, factId) {
  const store = await loadBookmarkStore(userId);
  store.bookmarks = store.bookmarks.filter((b) => b.facts?.id !== factId);
  await saveBookmarkStore(userId, store);
}

export async function reconcileBookmarksFromServer(userId) {
  const { data, error } = await supabase
    .from('bookmarks')
    .select(
      'id, created_at, facts(id, content, source_name, source_url, topics(name, icon, color))'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return null;

  const store = await loadBookmarkStore(userId);
  store.bookmarks = data ?? [];
  await saveBookmarkStore(userId, store);
  return data ?? [];
}

export async function flushPendingBookmarkOps(userId) {
  if (!(await isOnline())) return { synced: false };

  const store = await loadBookmarkStore(userId);
  if (store.pending.length === 0) return { synced: true };

  const remaining = [];

  for (const op of store.pending) {
    if (op.op === 'add') {
      const { data, error } = await supabase
        .from('bookmarks')
        .insert({ user_id: userId, fact_id: op.factId })
        .select('id, created_at')
        .single();

      if (error) {
        if (error.code === '23505') {
          const { data: existing } = await supabase
            .from('bookmarks')
            .select('id, created_at')
            .eq('user_id', userId)
            .eq('fact_id', op.factId)
            .maybeSingle();

          if (existing) {
            const idx = store.bookmarks.findIndex((b) => b.facts?.id === op.factId);
            if (idx >= 0) {
              store.bookmarks[idx].id = existing.id;
              store.bookmarks[idx].created_at = existing.created_at;
            }
            continue;
          }
        }
        remaining.push(op);
        continue;
      }

      const idx = store.bookmarks.findIndex((b) => b.facts?.id === op.factId);
      if (idx >= 0) {
        store.bookmarks[idx].id = data.id;
        store.bookmarks[idx].created_at = data.created_at;
      }
    } else if (op.op === 'remove') {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('fact_id', op.factId);

      if (error) {
        remaining.push(op);
      }
    }
  }

  store.pending = remaining;
  await saveBookmarkStore(userId, store);

  if (remaining.length === 0) {
    await reconcileBookmarksFromServer(userId);
  }

  return { synced: remaining.length === 0 };
}

export async function clearBookmarkStore(userId) {
  await AsyncStorage.removeItem(storeKey(userId));
}

export async function fetchBookmarksWithCache(userId) {
  const cachedStore = await loadBookmarkStore(userId);

  if (await isOnline()) {
    await flushPendingBookmarkOps(userId);
    const data = await reconcileBookmarksFromServer(userId);
    if (data) {
      return { bookmarks: data, offline: false, hasPending: false, serverSynced: true };
    }

    const store = await loadBookmarkStore(userId);
    return {
      bookmarks: store.bookmarks.length > 0 ? store.bookmarks : cachedStore.bookmarks,
      offline: false,
      hasPending: store.pending.length > 0,
      serverSynced: false,
    };
  }

  const store = await loadBookmarkStore(userId);
  return {
    bookmarks: store.bookmarks.length > 0 ? store.bookmarks : cachedStore.bookmarks,
    offline: true,
    hasPending: store.pending.length > 0,
    serverSynced: false,
  };
}
