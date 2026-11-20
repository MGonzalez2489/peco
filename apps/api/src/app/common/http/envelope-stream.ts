import {StreamableFile} from '@nestjs/common';
import {Readable} from 'node:stream';

/**
 * A response stream that already carries the 8.3/D73 success envelope.
 *
 * Extending `StreamableFile` is what makes Nest's Express adapter pipe the
 * chunks instead of JSON-serializing the object. The global interceptor leaves
 * this class untouched, so the envelope is emitted exactly once on the wire.
 */
export class EnvelopeStream extends StreamableFile implements AsyncIterable<string> {
  constructor(chunks: AsyncIterable<string>) {
    super(Readable.from(chunks));
  }

  public [Symbol.asyncIterator](): AsyncIterator<string> {
    return this.getStream()[Symbol.asyncIterator]();
  }
}
