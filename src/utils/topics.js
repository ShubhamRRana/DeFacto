import { supabase } from '../config/supabase';

export function filterTopics(topics, query) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return topics;
  return topics.filter(
    (t) =>
      t.name.toLowerCase().includes(trimmed) ||
      (t.description && t.description.toLowerCase().includes(trimmed))
  );
}

export async function createCustomTopic(name) {
  const { data, error } = await supabase.rpc('create_custom_topic', { p_name: name });
  if (error) throw error;
  return data;
}

export function upsertTopicInList(topics, topic) {
  const idx = topics.findIndex((t) => t.id === topic.id);
  if (idx >= 0) {
    const next = [...topics];
    next[idx] = topic;
    return next;
  }
  return [...topics, topic].sort((a, b) => a.name.localeCompare(b.name));
}
