import { parseStatementCsv } from './statement-match';

describe('parseStatementCsv', () => {
  it('lit un CSV avec en-têtes FR', () => {
    const csv = ['montant;telephone;reference', '50000;0700000000;TX1', '25000;0101010101;TX2'].join('\n');
    const lines = parseStatementCsv(csv);
    expect(lines).toHaveLength(2);
    expect(lines[0].amount).toBe(50000);
    expect(lines[0].phone).toContain('0700');
    expect(lines[0].reference).toBe('TX1');
  });
});
