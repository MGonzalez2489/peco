import {hashIdempotencyRequest} from './hash-idempotency-request.util';

const base = {
  method: 'post',
  endpoint: 'POST /movements',
  params: {publicId: 'movement-1'},
  query: {},
  body: {amount: 1000, category: {icon: 'tag', name: 'Comida'}},
};

describe('hashIdempotencyRequest (D108)', () => {
  it('is deterministic and case-insensitive for the method', () => {
    expect(hashIdempotencyRequest(base)).toBe(hashIdempotencyRequest({...base, method: 'POST'}));
  });

  it('ignores object key order', () => {
    expect(hashIdempotencyRequest(base)).toBe(
      hashIdempotencyRequest({
        ...base,
        body: {category: {name: 'Comida', icon: 'tag'}, amount: 1000},
      }),
    );
  });

  it('changes when the body, params, query or endpoint changes', () => {
    const original = hashIdempotencyRequest(base);

    expect(hashIdempotencyRequest({...base, body: {...base.body, amount: 1001}})).not.toBe(
      original,
    );
    expect(hashIdempotencyRequest({...base, params: {publicId: 'movement-2'}})).not.toBe(original);
    expect(hashIdempotencyRequest({...base, query: {includeCanceled: 'true'}})).not.toBe(original);
    expect(hashIdempotencyRequest({...base, endpoint: 'POST /accounts'})).not.toBe(original);
  });
});
