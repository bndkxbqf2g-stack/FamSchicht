const TECHNICAL_ERROR_PATTERN = /(?:\b(?:api|column|constraint|database|duplicate|fetch|http|jwt|network|permission|postgrest|postgres(?:ql)?|relation|row[- ]level|rpc|schema|sql|supabase|timeout|unsupported|unknown)\b|\b(?:is required|must be|between\s+\d|too many)\b|failed to fetch|invalid input syntax|status code|violates|^\s*(?:error:\s*)?\d{3}\b)/i;

export function userError(error, fallback) {
  const message = String(error?.message || '').trim();
  if (!message || message.length > 240 || TECHNICAL_ERROR_PATTERN.test(message)) return fallback;
  return message;
}

