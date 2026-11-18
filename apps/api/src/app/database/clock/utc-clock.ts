import {Injectable} from '@nestjs/common';

/** Single source of "now" for application-written timestamps. */
@Injectable()
export class UtcClock {
  now(): string {
    return new Date().toISOString();
  }

  /** UTC ISO-8601 timestamp `seconds` after the current instant (D22). */
  plusSeconds(seconds: number): string {
    return new Date(Date.now() + seconds * 1000).toISOString();
  }
}
