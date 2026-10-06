export function containsInsensitive(term: string) {
  return { contains: term, mode: "insensitive" as const };
}
