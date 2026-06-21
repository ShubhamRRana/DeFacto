export function filterTopics(topics, query) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return topics;
  return topics.filter(
    (t) =>
      t.name.toLowerCase().includes(trimmed) ||
      (t.description && t.description.toLowerCase().includes(trimmed))
  );
}
