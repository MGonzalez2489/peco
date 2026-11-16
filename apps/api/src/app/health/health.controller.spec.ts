import {HttpException, HttpStatus} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import {HealthController} from './health.controller';
import {HealthService} from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: {pingDatabase: jest.Mock};

  beforeEach(async () => {
    healthService = {pingDatabase: jest.fn()};

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{provide: HealthService, useValue: healthService}],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('returns ok when the database ping succeeds', async () => {
    healthService.pingDatabase.mockResolvedValue(undefined);

    const result = await controller.check();

    expect(result).toEqual({
      status: 'ok',
      uptime: expect.any(Number),
      db: 'up',
    });
  });

  it('throws 503 when the database ping fails', async () => {
    healthService.pingDatabase.mockRejectedValue(new Error('db down'));

    await expect(controller.check()).rejects.toMatchObject({
      constructor: HttpException,
      status: HttpStatus.SERVICE_UNAVAILABLE,
      response: {
        status: 'error',
        uptime: expect.any(Number),
        db: 'down',
      },
    });
  });
});
