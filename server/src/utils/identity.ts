export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
