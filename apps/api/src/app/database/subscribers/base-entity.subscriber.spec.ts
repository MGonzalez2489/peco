import {EntityMetadata, InsertEvent, UpdateEvent} from 'typeorm';
import {UtcClock} from '../clock/utc-clock';
import {BaseEntitySubscriber} from './base-entity.subscriber';

const FIXED_TIME = '2026-11-17T12:34:56.789Z';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const metadataWith = (...propertyNames: string[]): EntityMetadata =>
  ({
    columns: propertyNames.map((propertyName) => ({propertyName})),
  }) as unknown as EntityMetadata;

const insertEvent = (
  entity: Record<string, unknown>,
  metadata: EntityMetadata,
): InsertEvent<object> => ({entity, metadata}) as unknown as InsertEvent<object>;

const updateEvent = (
  entity: Record<string, unknown> | undefined,
  metadata: EntityMetadata,
): UpdateEvent<object> => ({entity, metadata}) as unknown as UpdateEvent<object>;

describe('BaseEntitySubscriber', () => {
  const clock = {now: jest.fn(() => FIXED_TIME)} as unknown as UtcClock;
  const subscriber = new BaseEntitySubscriber(clock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates a UUID v4 and writes insert timestamps without touching deletedAt', () => {
    const entity: Record<string, unknown> = {deletedAt: null};
    const metadata = metadataWith('publicId', 'createdAt', 'updatedAt', 'deletedAt');

    subscriber.beforeInsert(insertEvent(entity, metadata));

    expect(entity.publicId).toMatch(UUID_V4);
    expect(entity.createdAt).toBe(FIXED_TIME);
    expect(entity.updatedAt).toBe(FIXED_TIME);
    expect(entity.deletedAt).toBeNull();
    expect(clock.now).toHaveBeenCalledTimes(1);
  });

  it('preserves an application-supplied publicId', () => {
    const entity: Record<string, unknown> = {publicId: 'existing-public-id'};

    subscriber.beforeInsert(insertEvent(entity, metadataWith('publicId')));

    expect(entity.publicId).toBe('existing-public-id');
  });

  it('only writes updatedAt on update', () => {
    const entity: Record<string, unknown> = {
      createdAt: '2026-01-01T00:00:00.000Z',
      deletedAt: '2026-02-01T00:00:00.000Z',
    };
    const metadata = metadataWith('createdAt', 'updatedAt', 'deletedAt');

    subscriber.beforeUpdate(updateEvent(entity, metadata));

    expect(entity.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(entity.deletedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(entity.updatedAt).toBe(FIXED_TIME);
  });

  it('does nothing on update when the entity has no updatedAt column', () => {
    const entity: Record<string, unknown> = {name: 'unchanged'};

    subscriber.beforeUpdate(updateEvent(entity, metadataWith('name')));

    expect(entity).toEqual({name: 'unchanged'});
    expect(clock.now).not.toHaveBeenCalled();
  });
});
