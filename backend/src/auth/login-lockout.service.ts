import { Injectable } from '@nestjs/common';

type Entry = { failures: number; lockedUntil: number };

/**
 * Verrouillage progressif en mémoire (une instance Render).
 * Après N échecs : attente croissante. Réinitialisé après succès.
 */
@Injectable()
export class LoginLockoutService {
  private readonly byEmail = new Map<string, Entry>();
  private readonly maxFailures = Number(process.env.AUTH_LOCKOUT_MAX_FAILURES || 5);
  private readonly baseMs = Number(process.env.AUTH_LOCKOUT_BASE_MS || 30_000);

  private key(email: string) {
    return email.trim().toLowerCase();
  }

  /** Retourne ms restantes si verrouillé, sinon 0. */
  getLockRemainingMs(email: string): number {
    const e = this.byEmail.get(this.key(email));
    if (!e?.lockedUntil) return 0;
    const left = e.lockedUntil - Date.now();
    return left > 0 ? left : 0;
  }

  recordFailure(email: string): { lockedMs: number; failures: number } {
    const k = this.key(email);
    const prev = this.byEmail.get(k) || { failures: 0, lockedUntil: 0 };
    const failures = prev.failures + 1;
    let lockedUntil = 0;
    if (failures >= this.maxFailures) {
      const steps = failures - this.maxFailures + 1;
      lockedUntil = Date.now() + this.baseMs * Math.min(steps, 8);
    }
    this.byEmail.set(k, { failures, lockedUntil });
    return { lockedMs: Math.max(0, lockedUntil - Date.now()), failures };
  }

  recordSuccess(email: string) {
    this.byEmail.delete(this.key(email));
  }
}
