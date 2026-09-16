export function commitTag(tags: string[], raw: string): string[] {
  const tag = raw.trim();
  if (!tag || tags.includes(tag)) return tags;
  return [...tags, tag];
}
