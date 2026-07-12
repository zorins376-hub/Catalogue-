/**
 * Money is stored as INTEGER minor units + a 3-letter currency (ТЗ §2).
 * Formatting happens on the backend so templates never touch price logic (§4).
 */

const MINOR_UNITS: Record<string, number> = {
  KGS: 2,
  USD: 2,
  EUR: 2,
  RUB: 2,
  KZT: 2,
};

/** Number of minor-unit digits for a currency (default 2). */
export function minorDigits(currency: string): number {
  return MINOR_UNITS[currency.toUpperCase()] ?? 2;
}

/**
 * Format a minor-unit amount for display, e.g. (149900, 'KGS', 'ru') → "1 499 сом".
 * Returns undefined for null price ("price on request" — the template decides copy).
 */
export function formatPrice(
  price: number | null | undefined,
  currency: string,
  locale = 'ru',
): string | undefined {
  if (price == null) return undefined;
  const digits = minorDigits(currency);
  const major = price / 10 ** digits;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: Number.isInteger(major) ? 0 : digits,
      maximumFractionDigits: digits,
    }).format(major);
  } catch {
    // Unknown currency code — fall back to grouped number + code.
    const grouped = new Intl.NumberFormat(locale, {
      minimumFractionDigits: Number.isInteger(major) ? 0 : digits,
      maximumFractionDigits: digits,
    }).format(major);
    return `${grouped} ${currency.toUpperCase()}`;
  }
}
