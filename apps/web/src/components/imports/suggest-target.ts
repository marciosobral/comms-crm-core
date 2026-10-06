function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function score(source: string, target: string): number {
  if (source === "" || target === "") return 0;
  if (source === target) return 3;
  if (target.startsWith(`${source} `) || source.startsWith(`${target} `)) return 2;
  const targetWords = new Set(target.split(" "));
  return source.split(" ").every((word) => targetWords.has(word)) ? 1 : 0;
}

export function suggestTarget(
  sourceValue: string,
  targets: { id: string; label: string }[],
): string | null {
  const source = normalize(sourceValue);
  let bestId: string | null = null;
  let bestScore = 0;
  let isTied = false;

  for (const target of targets) {
    const targetScore = score(source, normalize(target.label));
    if (targetScore > bestScore) {
      bestId = target.id;
      bestScore = targetScore;
      isTied = false;
    } else if (targetScore > 0 && targetScore === bestScore) {
      isTied = true;
    }
  }

  return isTied ? null : bestId;
}
