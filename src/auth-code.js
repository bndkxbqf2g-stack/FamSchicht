export function isValidLoginCode(value) {
  return /^\d{6}$/.test(String(value || '').trim());
}
