import {CategoryApplyTypeEnum} from '@peco/enums';
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
  applyType: CategoryApplyTypeEnum.EXPENSE.toString(),
  isRoot: false,
  isSystem: false,
  createdAt: '2026-11-21T10:00:00.000Z',
  updatedAt: '2026-11-21T10:00:00.000Z',
};

const STORED_CATEGORY = {...CATEGORY, userId: USER.id};

const CREATE_REQUEST = {
  displayName: 'Café',
  icon: 'coffee',
  color: '#F97316',
  applyType: CategoryApplyTypeEnum.EXPENSE.toString(),
};

const UPDATE_REQUEST = {
  displayName: 'Café con Leche',
  applyType: CategoryApplyTypeEnum.BOTH.toString(),
};

describe('CategoriesService', () => {
  let findActiveUserByPublicId: jest.Mock;
  let findVisibleByUser: jest.Mock;
  let findCategoryByPublicId: jest.Mock;
  let create: jest.Mock;
  let update: jest.Mock;
  let ensureSystemCatalog: jest.Mock;
  let service: CategoriesService;

  beforeEach(() => {
    findActiveUserByPublicId = jest.fn().mockResolvedValue(USER);
    findVisibleByUser = jest.fn().mockResolvedValue([STORED_CATEGORY]);
    findCategoryByPublicId = jest.fn().mockResolvedValue(STORED_CATEGORY);
    create = jest.fn().mockResolvedValue(STORED_CATEGORY);
    update = jest.fn().mockResolvedValue({
      ...STORED_CATEGORY,
      name: 'cafe-con-leche',
      displayName: 'Café con Leche',
      applyType: CategoryApplyTypeEnum.BOTH.toString(),
    });
    ensureSystemCatalog = jest.fn().mockResolvedValue(undefined);
    service = new CategoriesService(
      {findActiveByPublicId: findActiveUserByPublicId} as unknown as UserProfileRepository,
      {
        findVisibleByUser,
        findActiveByPublicId: findCategoryByPublicId,
        create,
        update,
        ensureSystemCatalog,
      } as unknown as CategoryRepository,
    );
  });

  it('maps the visible rows for the active caller', async () => {
    const result = await service.list('user-public-id');

    expect(findActiveUserByPublicId).toHaveBeenCalledWith('user-public-id');
    expect(findVisibleByUser).toHaveBeenCalledWith(7);
    expect(result[0]).toMatchObject(CATEGORY);
  });

  it('rejects a caller whose user row is gone before querying categories', async () => {
    findActiveUserByPublicId.mockResolvedValue(null);

    await expect(service.list('user-public-id')).rejects.toMatchObject({code: 'NOT_FOUND'});
    expect(findVisibleByUser).not.toHaveBeenCalled();
  });

  it('bootstraps the full global catalog on module init', async () => {
    await service.onModuleInit();

    expect(ensureSystemCatalog).toHaveBeenCalledTimes(1);
  });

  it('creates a category in the caller namespace and returns the public shape', async () => {
    const result = await service.create('user-public-id', CREATE_REQUEST);

    expect(create).toHaveBeenCalledWith(7, CREATE_REQUEST);
    expect(result).toMatchObject(CATEGORY);
  });

  it('rejects a deleted caller before creating a category', async () => {
    findActiveUserByPublicId.mockResolvedValue(null);

    await expect(service.create('user-public-id', CREATE_REQUEST)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('updates an owned category with the validated request', async () => {
    const result = await service.update('user-public-id', 'category-public-id', UPDATE_REQUEST);

    expect(findCategoryByPublicId).toHaveBeenCalledWith('category-public-id');
    expect(update).toHaveBeenCalledWith(STORED_CATEGORY, UPDATE_REQUEST);
    expect(result).toMatchObject({
      name: 'cafe-con-leche',
      displayName: 'Café con Leche',
      applyType: CategoryApplyTypeEnum.BOTH.toString(),
    });
  });

  it('returns 404 when the category does not exist', async () => {
    findCategoryByPublicId.mockResolvedValue(null);

    await expect(
      service.update('user-public-id', 'missing-public-id', UPDATE_REQUEST),
    ).rejects.toMatchObject({code: 'NOT_FOUND'});
    expect(update).not.toHaveBeenCalled();
  });

  it('protects a global catalog row from updates', async () => {
    findCategoryByPublicId.mockResolvedValue({...STORED_CATEGORY, userId: null});

    await expect(
      service.update('user-public-id', 'category-public-id', UPDATE_REQUEST),
    ).rejects.toMatchObject({code: 'CATEGORY_SYSTEM_PROTECTED'});
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    ['root', {isRoot: true}],
    ['system', {isSystem: true}],
  ])('protects a %s user row from updates', async (_label, flag) => {
    findCategoryByPublicId.mockResolvedValue({...STORED_CATEGORY, ...flag});

    await expect(
      service.update('user-public-id', 'category-public-id', UPDATE_REQUEST),
    ).rejects.toMatchObject({code: 'CATEGORY_SYSTEM_PROTECTED'});
    expect(update).not.toHaveBeenCalled();
  });

  it('returns 404 for a category owned by another user', async () => {
    findCategoryByPublicId.mockResolvedValue({...STORED_CATEGORY, userId: 8});

    await expect(
      service.update('user-public-id', 'category-public-id', UPDATE_REQUEST),
    ).rejects.toMatchObject({code: 'NOT_FOUND'});
    expect(update).not.toHaveBeenCalled();
  });
});
