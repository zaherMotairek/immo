import {
  isInQuietHours,
  parseAutomationSettings,
  renderReminderTemplate,
} from './org-automation.types';

describe('org-automation.types', () => {
  it('parseAutomationSettings applique les défauts', () => {
    const s = parseAutomationSettings(null);
    expect(s.autoGenerateSchedules).toBe(false);
    expect(s.autoRemindersEnabled).toBe(false);
    expect(s.reminderRules.length).toBe(4);
    expect(s.quietHoursStart).toBe(20);
  });

  it('renderReminderTemplate remplace les variables', () => {
    const out = renderReminderTemplate('Salut {prenom} — {montant}', {
      prenom: 'Awa',
      montant: '100 000',
      periode: 'mai 2026',
      bien: 'Immeuble A',
      echeance: '2026-05-05',
      lien_quittance: '',
    });
    expect(out).toContain('Awa');
    expect(out).toContain('100');
  });

  it('isInQuietHours gère 20h–7h', () => {
    expect(isInQuietHours(new Date('2026-05-01T21:00:00Z'), 20, 7)).toBe(true);
    expect(isInQuietHours(new Date('2026-05-01T06:00:00Z'), 20, 7)).toBe(true);
    expect(isInQuietHours(new Date('2026-05-01T10:00:00Z'), 20, 7)).toBe(false);
  });
});
