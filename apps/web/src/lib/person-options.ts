interface PersonOption {
  id: string;
  name: string;
}

export function findPersonName(
  options: PersonOption[],
  current: PersonOption | null,
  id: string,
): string | null {
  const candidates = current ? [...options, current] : options;
  return candidates.find((person) => person.id === id)?.name ?? null;
}
