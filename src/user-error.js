const TECHNICAL_ERROR_PATTERN = /(?:\b(?:api|column|constraint|database|duplicate key|fetch|http|jwt|network|permission|postgrest|postgres(?:ql)?|relation|row[- ]level|rpc|schema|sql|supabase|timeout)\b|failed to fetch|invalid input syntax|status code|violates|^\s*(?:error:\s*)?\d{3}\b)/i;

export function userError(error, fallback) {
  const message = String(error?.message || '').trim();
  if (!message || message.length > 240 || TECHNICAL_ERROR_PATTERN.test(message)) return fallback;
  return message;
}

