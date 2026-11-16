import {Controller, Get, HttpException, HttpStatus} from '@nestjs/common';
import {HealthService} from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check() {
    const uptime = process.uptime();

    try {
      await this.healthService.pingDatabase();
      return {status: 'ok', uptime, db: 'up'};
    } catch {
      throw new HttpException(
        {status: 'error', uptime, db: 'down'},
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
