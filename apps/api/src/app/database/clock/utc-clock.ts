import {Injectable} from '@nestjs/common';

/** Single source of "now" for application-written timestamps. */
@Injectable()
export class UtcClock {
  now(): string {
    return new Date().toISOString();
  }
}
