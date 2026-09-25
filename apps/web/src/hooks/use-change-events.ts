import { api } from "@/lib/api";
import {
  type ServerSentEvent,
  parseServerSentEvents,
  queryKeysForChange,
  toChangeEvent,
} from "@/lib/change-events";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const FIRST_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;
const INVALIDATION_BATCH_MS = 500;

async function readEvents(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ServerSentEvent) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) return;
    const parsed = parseServerSentEvents(buffer + decoder.decode(value, { stream: true }));
    buffer = parsed.rest;
    for (const event of parsed.events) onEvent(event);
  }
}

function waitFor(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export function useChangeEvents(isEnabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isEnabled) return;
    const abort = new AbortController();
    const pendingKeys = new Map<string, QueryKey>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      flushTimer = null;
      for (const queryKey of pendingKeys.values()) queryClient.invalidateQueries({ queryKey });
      pendingKeys.clear();
    };

    const queueInvalidation = (keys: QueryKey[]) => {
      for (const queryKey of keys) pendingKeys.set(JSON.stringify(queryKey), queryKey);
      flushTimer ??= setTimeout(flush, INVALIDATION_BATCH_MS);
    };

    // Changes published while the stream was closed never arrive, so every reconnect refetches the
    // active queries; a planned "expire" reconnects right away instead of backing off.
    const listen = async () => {
      let retryMs = FIRST_RETRY_MS;
      let hasConnectedBefore = false;
      while (!abort.signal.aborted) {
        let isPlannedEnd = false;
        try {
          const response = await api.stream("/events", abort.signal);
          if (response.body) {
            if (hasConnectedBefore) queryClient.invalidateQueries();
            hasConnectedBefore = true;
            retryMs = FIRST_RETRY_MS;
            await readEvents(response.body, (event) => {
              if (event.type === "expire") isPlannedEnd = true;
              const change = toChangeEvent(event);
              if (change) queueInvalidation(queryKeysForChange(change));
            });
          }
        } catch {
          if (abort.signal.aborted) return;
        }
        if (isPlannedEnd) continue;
        await waitFor(retryMs, abort.signal);
        retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
      }
    };
    listen();

    return () => {
      abort.abort();
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, [isEnabled, queryClient]);
}
