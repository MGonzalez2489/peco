import {Injectable} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import {EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent} from 'typeorm';
import {UtcClock} from '../clock/utc-clock';

/** Writes application-owned identifiers and timestamps; never touches deletedAt (D8, D28). */
@EventSubscriber()
@Injectable()
export class BaseEntitySubscriber implements EntitySubscriberInterface {
  constructor(private readonly clock: UtcClock = new UtcClock()) {}

  beforeInsert(event: InsertEvent<object>): void {
    const entity = event.entity as Record<string, unknown>;
    const now = this.clock.now();

    if (!entity.publicId) {
      entity.publicId = randomUUID();
    }
    if (this.hasColumn(event, 'createdAt')) {
      entity.createdAt = now;
    }
    if (this.hasColumn(event, 'updatedAt')) {
      entity.updatedAt = now;
    }
  }

  beforeUpdate(event: UpdateEvent<object>): void {
    if (!event.entity || !this.hasColumn(event, 'updatedAt')) {
      return;
    }

    (event.entity as Record<string, unknown>).updatedAt = this.clock.now();
  }

  private hasColumn(
    event: InsertEvent<object> | UpdateEvent<object>,
    propertyName: string,
  ): boolean {
    return event.metadata.columns.some((column) => column.propertyName === propertyName);
  }
}
