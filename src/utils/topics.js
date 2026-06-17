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

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('user_topics').upsert(
      { user_id: user.id, topic_id: data.id },
      { onConflict: 'user_id,topic_id' }
    );
  }

  return data;
}

export async function hideCustomTopic(topicId) {
  const { data, error } = await supabase.rpc('hide_custom_topic', { p_topic_id: topicId });
  if (error) throw error;
  return data;
}

export function canDeleteCustomTopic(topic, userId) {
  return topic.is_custom && topic.created_by === userId;
}

export function removeTopicFromList(topics, topicId) {
  return topics.filter((t) => t.id !== topicId);
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
