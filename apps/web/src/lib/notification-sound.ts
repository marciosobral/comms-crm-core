const ANNOUNCED_COUNT_KEY = "crm-notification-sound-count";

// Tabs poll at different moments; the count already announced is shared through localStorage so
// only the first tab that sees an increase plays the sound. A tab never plays on its first count.
export function shouldPlayNotificationSound(
  previousInTab: number | null,
  announced: number | null,
  current: number,
): boolean {
  if (previousInTab === null) return false;
  return current > (announced ?? previousInTab);
}

export function readAnnouncedCount(): number | null {
  try {
    const stored = localStorage.getItem(ANNOUNCED_COUNT_KEY);
    return stored === null ? null : Number(stored);
  } catch {
    return null;
  }
}

export function writeAnnouncedCount(count: number): void {
  try {
    localStorage.setItem(ANNOUNCED_COUNT_KEY, String(count));
  } catch {
    // Storage blocked: each tab falls back to its own count.
  }
}

// Browsers block audio until the user has interacted with the page; a blocked play is ignored.
export function playSound(sound: Blob): void {
  const url = URL.createObjectURL(sound);
  const audio = new Audio(url);
  const release = () => URL.revokeObjectURL(url);
  audio.addEventListener("ended", release);
  audio.play().catch(release);
}
