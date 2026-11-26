import type {LoggerService} from '@nestjs/common';
import {EventEmitter} from 'node:events';
import type {Response} from 'express';
import {runWithCorrelationId} from '../middleware/correlation-id.context';
import {runWithJobKey} from '../observability/job-context';
import type {CorrelatedRequest} from '../types/correlated-request.type';
import {JsonLogger} from './json-logger';
import {createRequestLogger} from './request-logger.middleware';
import {redactSensitiveFields} from './redact-sensitive-fields';

describe('structured logging (US-105)', () => {
  it('redacts credentials and secrets recursively', () => {
    expect(
      redactSensitiveFields({
        password: 'secret',
        nested: {authorization: 'Bearer token', safe: 'visible'},
        list: [{apiKey: 'key'}],
      }),
    ).toEqual({
      password: '[REDACTED]',
      nested: {authorization: '[REDACTED]', safe: 'visible'},
      list: [{apiKey: '[REDACTED]'}],
    });
  });

  it('redacts direct identifiers and stack traces', () => {
    expect(
      redactSensitiveFields({
        userId: 7,
        accountPublicId: 'account-1',
        email: 'user@example.com',
        stack: 'Error at secret-path',
      }),
    ).toEqual({
      userId: '[REDACTED]',
      accountPublicId: '[REDACTED]',
      email: '[REDACTED]',
      stack: '[REDACTED]',
    });
  });

  it('writes one JSON line with the correlation id and redacted fields', () => {
    const write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    try {
      const logger = new JsonLogger({env: 'test', logLevel: 'info'});

      runWithCorrelationId('01JC7Z3Q9K', () => {
        runWithJobKey('CLEANUP', () => {
          logger.log({password: 'secret', safe: 'visible'}, 'Test');
        });
      });

      const line = write.mock.calls.at(-1)?.[0] as string;
      expect(JSON.parse(line)).toMatchObject({
        service: 'peco-api',
        environment: 'test',
        correlationId: '01JC7Z3Q9K',
        jobKey: 'CLEANUP',
        context: 'Test',
        message: {password: '[REDACTED]', safe: 'visible'},
      });
    } finally {
      write.mockRestore();
    }
  });

  it('honours the configured log level', () => {
    const logger = new JsonLogger({env: 'production', logLevel: 'error'});

    expect(logger.isLevelEnabled('log')).toBe(false);
    expect(logger.isLevelEnabled('warn')).toBe(false);
    expect(logger.isLevelEnabled('error')).toBe(true);
  });

  it('logs route-level request data without bodies or headers', () => {
    const logger: LoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      fatal: jest.fn(),
    };
    const response = new EventEmitter() as Response;
    Object.assign(response, {statusCode: 200});
    const request = {
      method: 'GET',
      baseUrl: '/api',
      correlationId: '01JC7Z3Q9K',
      route: {path: '/items'},
      user: {publicId: 'user-1'},
      body: {password: 'secret'},
      headers: {authorization: 'Bearer token'},
    } as unknown as CorrelatedRequest;
    const next = jest.fn();

    createRequestLogger(logger)(request, response, next);
    expect(next).toHaveBeenCalledTimes(1);

    response.emit('finish');

    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'http_request',
        method: 'GET',
        route: '/api/items',
        statusCode: 200,
        durationMs: expect.any(Number),
        correlationId: '01JC7Z3Q9K',
      }),
      'HTTP',
    );

    const payload = (logger.log as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('body');
    expect(payload).not.toHaveProperty('headers');
    expect(payload).not.toHaveProperty('userId');
    expect(JSON.stringify(payload)).not.toContain('secret');
    expect(JSON.stringify(payload)).not.toContain('Bearer');
  });
});
