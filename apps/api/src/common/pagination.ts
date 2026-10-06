export const MAX_PER_PAGE = 100;

export function pageWindow(query: { page?: number; perPage?: number }, defaultPerPage: number) {
  const page = query.page ?? 1;
  const perPage = Math.min(query.perPage ?? defaultPerPage, MAX_PER_PAGE);
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}
