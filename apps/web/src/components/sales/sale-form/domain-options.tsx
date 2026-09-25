export function domainOptions(rows: { id: string; value: string }[] | undefined) {
  return (rows ?? []).map((row) => (
    <option key={row.id} value={row.id}>
      {row.value}
    </option>
  ));
}

export function userOptions(rows: { id: string; name: string }[] | undefined) {
  return (rows ?? []).map((row) => (
    <option key={row.id} value={row.id}>
      {row.name}
    </option>
  ));
}
