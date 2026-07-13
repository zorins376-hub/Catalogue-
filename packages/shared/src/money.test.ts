import { describe, expect, it } from 'vitest';
import { convertMinor, formatPrice, minorDigits } from './money';

describe('money (ТЗ §2/§8 Q2)', () => {
  it('formats minor units into a grouped string', () => {
    const s = formatPrice(149900, 'KGS', 'ru');
    expect(s).toBeDefined();
    expect(s).toContain('1');
    expect(s).toContain('499');
  });

  it('returns undefined for a null price (price on request)', () => {
    expect(formatPrice(null, 'KGS', 'ru')).toBeUndefined();
    expect(formatPrice(undefined, 'USD', 'ru')).toBeUndefined();
  });

  it('knows minor-unit precision', () => {
    expect(minorDigits('KGS')).toBe(2);
    expect(minorDigits('usd')).toBe(2);
    expect(minorDigits('XXX')).toBe(2); // unknown default
  });

  it('converts between currencies honouring precision', () => {
    // $112.00 → KGS at 89 KGS/USD
    expect(convertMinor(11200, 'USD', 'KGS', 89)).toBe(996800);
    // 1499.00 KGS → USD at 1/89
    expect(convertMinor(149900, 'KGS', 'USD', 1 / 89)).toBe(1684);
  });

  it('passes through when currencies match and null stays null', () => {
    expect(convertMinor(1490, 'EUR', 'EUR', 1)).toBe(1490);
    expect(convertMinor(null, 'KGS', 'USD', 0.011)).toBeNull();
  });
});
