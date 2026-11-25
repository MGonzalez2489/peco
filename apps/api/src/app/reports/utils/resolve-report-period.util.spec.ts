import type {ReportPeriodQuery} from '@peco/contracts';
import {ApiException} from '../../common/http/api-exception';
import {resolveReportPeriod} from './resolve-report-period.util';

const CURRENT_PERIOD = '2026-11';

const rangeError = (query: ReportPeriodQuery): ApiException => {
  try {
    resolveReportPeriod(query, CURRENT_PERIOD);
  } catch (error) {
    if (error instanceof ApiException) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a report range error.');
};

describe('resolveReportPeriod (US-806)', () => {
  it('uses the current period when the query is omitted', () => {
    expect(resolveReportPeriod({}, CURRENT_PERIOD)).toBe(CURRENT_PERIOD);
  });

  it('keeps an explicit period', () => {
    expect(resolveReportPeriod({period: '2026-09'}, CURRENT_PERIOD)).toBe('2026-09');
  });

  it('uses the end of an explicit ordered range', () => {
    expect(resolveReportPeriod({from: '2026-01', to: '2026-09'}, CURRENT_PERIOD)).toBe('2026-09');
  });

  it('accepts a default window of the current period plus twelve months', () => {
    expect(resolveReportPeriod({from: '2025-11'}, CURRENT_PERIOD)).toBe(CURRENT_PERIOD);
    expect(resolveReportPeriod({to: CURRENT_PERIOD}, CURRENT_PERIOD)).toBe(CURRENT_PERIOD);
  });

  it('accepts an explicit range of exactly 24 months', () => {
    expect(resolveReportPeriod({from: '2024-12', to: '2026-11'}, CURRENT_PERIOD)).toBe(
      CURRENT_PERIOD,
    );
  });

  it('rejects a reversed range on the to field', () => {
    const error = rangeError({from: '2026-11', to: '2026-10'});

    expect(error.getStatus()).toBe(400);
    expect(error.getResponse()).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: {fields: {to: expect.any(String)}},
    });
  });

  it('rejects a range longer than 24 months without truncating it', () => {
    const error = rangeError({from: '2024-10', to: '2026-11'});

    expect(error.getStatus()).toBe(400);
    expect(error.getResponse()).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: {fields: {to: expect.any(String)}},
    });
  });

  it('rejects a defaulted window whose from bound exceeds the cap', () => {
    const error = rangeError({from: '2024-10'});

    expect(error.getResponse()).toMatchObject({details: {fields: {to: expect.any(String)}}});
  });
});
