import {UserProfileRepository} from '../users/services/user-profile.repository';
import {CategoriesService} from './categories.service';
import {CategoryRepository} from './services/category.repository';

const USER = {id: 7, publicId: 'user-public-id'};

const CATEGORY = {
  publicId: 'category-public-id',
  name: 'cafe',
  displayName: 'Café',
  icon: 'coffee',
  color: '#F97316',
  applyType: 'EXPENSE',
  isRoot: false,
  isSystem: false,
  createdAt: '2026-11-21T10:00:00.000Z',
  updatedAt: '2026-11-21T10:00:00.000Z',
};

describe('CategoriesService', () => {
  let findActiveByPublicId: jest.Mock;
  let findVisibleByUser: jest.Mock;
  let ensureGlobalRoot: jest.Mock;
  let service: CategoriesService;

  beforeEach(() => {
    findActiveByPublicId = jest.fn().mockResolvedValue(USER);
    findVisibleByUser = jest.fn().mockResolvedValue([CATEGORY]);
    ensureGlobalRoot = jest.fn().mockResolvedValue(undefined);
    service = new CategoriesService(
      {findActiveByPublicId} as unknown as UserProfileRepository,
      {findVisibleByUser, ensureGlobalRoot} as unknown as CategoryRepository,
    );
  });

  it('maps the visible rows for the active caller', async () => {
    const result = await service.list('user-public-id');

    expect(findActiveByPublicId).toHaveBeenCalledWith('user-public-id');
    expect(findVisibleByUser).toHaveBeenCalledWith(7);
    expect(result[0]).toMatchObject(CATEGORY);
  });

  it('rejects a caller whose user row is gone before querying categories', async () => {
    findActiveByPublicId.mockResolvedValue(null);

    await expect(service.list('user-public-id')).rejects.toMatchObject({code: 'NOT_FOUND'});
    expect(findVisibleByUser).not.toHaveBeenCalled();
  });

  it('bootstraps the global root on module init', async () => {
    await service.onModuleInit();

    expect(ensureGlobalRoot).toHaveBeenCalledTimes(1);
  });
});
