import { currentSandboxId } from "@/common/sandbox-context";
import { Injectable } from "@nestjs/common";
import { type Observable, Subject, filter, map } from "rxjs";

export interface ChangeEvent {
  entity: string;
}

interface ScopedChange {
  change: ChangeEvent;
  sandboxId: string | undefined;
}

@Injectable()
export class ChangeEventsService {
  private readonly changes = new Subject<ScopedChange>();

  publish(change: ChangeEvent): void {
    this.changes.next({ change, sandboxId: currentSandboxId() });
  }

  stream(): Observable<ChangeEvent> {
    const sandboxId = currentSandboxId();
    return this.changes.pipe(
      filter((scoped) => scoped.sandboxId === sandboxId),
      map((scoped) => scoped.change),
    );
  }
}
