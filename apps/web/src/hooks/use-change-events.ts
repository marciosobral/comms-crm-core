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
    const pendingKeys = new Map<string, QueryKey>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let stream: AbortController | null = null;
    let hasConnectedBefore = false;

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
    const listen = async (signal: AbortSignal) => {
      let retryMs = FIRST_RETRY_MS;
      while (!signal.aborted) {
        let isPlannedEnd = false;
        try {
          const response = await api.stream("/events", signal);
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
          if (signal.aborted) return;
        }
        if (isPlannedEnd) continue;
        await waitFor(retryMs, signal);
        retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
      }
    };

    const open = () => {
      if (stream) return;
      stream = new AbortController();
      listen(stream.signal);
    };
    const close = () => {
      stream?.abort();
      stream = null;
    };

    // Only the visible tab keeps a stream: each one holds a connection, and over HTTP/1.1 the
    // browser allows just six per server, so background tabs would starve every other request.
    const onVisibilityChange = () => (document.visibilityState === "visible" ? open() : close());
    if (document.visibilityState === "visible") open();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      close();
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, [isEnabled, queryClient]);
}
