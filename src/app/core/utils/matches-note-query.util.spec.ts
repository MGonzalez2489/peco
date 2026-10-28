import {matchesNoteQuery} from './matches-note-query.util';

describe('matchesNoteQuery', () => {
  it('matches every note when the query is empty', () => {
    expect(matchesNoteQuery('Supermercado', '')).toBe(true);
    expect(matchesNoteQuery(undefined, '')).toBe(true);
    expect(matchesNoteQuery('Supermercado', '   ')).toBe(true);
  });

  it('matches a substring regardless of the letter case', () => {
    expect(matchesNoteQuery('Supermercado Central', 'super')).toBe(true);
    expect(matchesNoteQuery('supermercado central', 'SUPER')).toBe(true);
    expect(matchesNoteQuery('Pago de Renta julio', 'renta')).toBe(true);
  });

  it('ignores surrounding whitespace in the query', () => {
    expect(matchesNoteQuery('Café con leche', '  café  ')).toBe(true);
  });

  it('rejects notes that do not contain the query', () => {
    expect(matchesNoteQuery('Supermercado', 'renta')).toBe(false);
  });

  it('only matches movements without a note when the query is empty', () => {
    expect(matchesNoteQuery(undefined, 'renta')).toBe(false);
  });
});
