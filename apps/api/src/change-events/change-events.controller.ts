import { Controller, type MessageEvent, Req, Sse, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { type Observable, endWith, interval, map, merge, takeUntil, timer } from "rxjs";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../permissions/permissions.guard";
import { ChangeEventsService } from "./change-events.service";

const HEARTBEAT_MS = 25_000;
const MAX_STREAM_LIFETIME_MS = 15 * 60_000;

@Controller("events")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChangeEventsController {
  constructor(private readonly changeEvents: ChangeEventsService) {}

  @Sse()
  stream(@Req() req: Request): Observable<MessageEvent> {
    const tokenLifetimeMs = (req.user?.tokenExpiresAt ?? 0) - Date.now();
    const lifetimeMs = Math.min(Math.max(tokenLifetimeMs, 0), MAX_STREAM_LIFETIME_MS);
    // Guards only run on connect, so the stream closes when the access token expires and the
    // client reconnects with a fresh one, re-checking the user.
    return merge(
      this.changeEvents.stream().pipe(map((change) => ({ type: "change", data: change }))),
      interval(HEARTBEAT_MS).pipe(map(() => ({ type: "ping", data: "" }))),
    ).pipe(takeUntil(timer(lifetimeMs)), endWith({ type: "expire", data: "" }));
  }
}
