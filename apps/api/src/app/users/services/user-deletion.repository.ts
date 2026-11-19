import {Injectable} from '@nestjs/common';
import {DataSource, IsNull} from 'typeorm';
import {UtcClock} from '../../database/clock/utc-clock';
import {
  AuditLogEntity,
  RefreshTokenEntity,
  UserEntity,
  UserPreferencesEntity,
} from '../../database/entities';
import {ANONYMIZED_PASSWORD_HASH} from '../constants/anonymized-password-hash.constant';
import {ANONYMIZED_USER_NAME} from '../constants/anonymized-user-name.constant';
import {USER_AUDIT_ENTITY} from '../constants/user-audit-entity.constant';
import {USER_DELETE_AUDIT_ACTION} from '../constants/user-delete-audit-action.constant';

/**
 * Irreversible account deletion in one transaction (D31/D87): sessions die,
 * credentials are anonymized, the email stays reserved and the audit trail is
 * appended only after the user row was actually changed.
 */
@Injectable()
export class UserDeletionRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: UtcClock,
  ) {}

  delete(publicId: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(UserEntity, {
        where: {publicId, deletedAt: IsNull()},
        lock: {mode: 'pessimistic_write'},
      });
      if (!user) {
        return false;
      }

      const now = this.clock.now();
      await manager.update(
        RefreshTokenEntity,
        {userId: user.id, revokedAt: IsNull()},
        {revokedAt: now},
      );
      await manager.update(
        UserPreferencesEntity,
        {userId: user.id, deletedAt: IsNull()},
        {deletedAt: now, updatedAt: now},
      );
      await manager.update(
        UserEntity,
        {id: user.id, deletedAt: IsNull()},
        {
          deletedAt: now,
          name: ANONYMIZED_USER_NAME,
          passwordHash: ANONYMIZED_PASSWORD_HASH,
          updatedAt: now,
        },
      );
      await manager.save(
        manager.create(AuditLogEntity, {
          userId: user.id,
          entity: USER_AUDIT_ENTITY,
          entityId: user.publicId,
          action: USER_DELETE_AUDIT_ACTION,
          before: {deletedAt: null},
          after: {deletedAt: now, name: ANONYMIZED_USER_NAME},
        }),
      );

      return true;
    });
  }
}
