export const DEFAULT_CURRENCY = "NPR";

export function normalizeCurrencyCode(currency?: string | null) {
  const normalized = currency?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) && normalized !== "USD"
    ? normalized
    : DEFAULT_CURRENCY;
}

export function normalizeSupportedCurrencies(currencies: unknown) {
  const values = Array.isArray(currencies)
    ? currencies.filter((currency): currency is string => typeof currency === "string")
    : [];

  return Array.from(
    new Set([DEFAULT_CURRENCY, ...values.map(normalizeCurrencyCode)]),
  );
}
