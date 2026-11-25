import {Injectable} from '@nestjs/common';
import {DataSource, IsNull} from 'typeorm';
import {UserPreferencesEntity} from '../../database/entities';

type PreferenceValues = Pick<
  UserPreferencesEntity,
  'theme' | 'pwaBannerDismissedAt' | 'hideBalance' | 'hideReversal'
>;

/** Owner-scoped persistence for the single per-user preferences row. */
@Injectable()
export class PreferencesRepository {
  constructor(private readonly dataSource: DataSource) {}

  find(userId: number): Promise<UserPreferencesEntity | null> {
    return this.dataSource.getRepository(UserPreferencesEntity).findOne({
      where: {userId, deletedAt: IsNull()},
    });
  }

  async save(
    userId: number,
    current: UserPreferencesEntity | null,
    values: PreferenceValues,
  ): Promise<UserPreferencesEntity> {
    const repository = this.dataSource.getRepository(UserPreferencesEntity);
    const entity = current ?? repository.create({userId, deletedAt: null});

    entity.theme = values.theme;
    entity.pwaBannerDismissedAt = values.pwaBannerDismissedAt;
    entity.hideBalance = values.hideBalance;
    entity.hideReversal = values.hideReversal;

    return repository.save(entity);
  }
}
