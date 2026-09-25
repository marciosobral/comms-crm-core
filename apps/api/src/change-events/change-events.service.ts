import { Injectable } from "@nestjs/common";
import { type Observable, Subject } from "rxjs";

export interface ChangeEvent {
  entity: string;
}

@Injectable()
export class ChangeEventsService {
  private readonly changes = new Subject<ChangeEvent>();

  publish(change: ChangeEvent): void {
    this.changes.next(change);
  }

  stream(): Observable<ChangeEvent> {
    return this.changes.asObservable();
  }
}
