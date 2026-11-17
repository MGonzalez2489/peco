import {Injectable} from '@nestjs/common';
import {AppConfig} from './app-config';

/** Typed holder for the configuration parsed once during bootstrap. */
@Injectable()
export class ConfigService {
  constructor(readonly config: AppConfig) {}
}
