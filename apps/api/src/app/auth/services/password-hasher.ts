import {Injectable} from '@nestjs/common';
import {hash, verify} from 'argon2';

/** Argon2id password hashing; plain passwords never reach the database or logs. */
@Injectable()
export class PasswordHasher {
  hash(password: string): Promise<string> {
    return hash(password);
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }
}
