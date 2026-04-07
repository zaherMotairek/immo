import { Decimal } from '@prisma/client/runtime/library';

export function toNumber(value: Decimal | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return value.toNumber();
}
