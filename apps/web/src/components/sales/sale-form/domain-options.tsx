export function domainOptions(rows: { id: string; value: string }[] | undefined) {
  return (rows ?? []).map((row) => (
    <option key={row.id} value={row.id}>
      {row.value}
    </option>
  ));
}

export function userOptions(
  rows: { id: string; name: string }[] | undefined,
  current?: { id: string; name: string } | null,
) {
  const list = rows ?? [];
  const withCurrent =
    current && !list.some((row) => row.id === current.id) ? [current, ...list] : list;
  return withCurrent.map((row) => (
    <option key={row.id} value={row.id}>
      {row.name}
    </option>
  ));
}
