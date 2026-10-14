const TECHNICAL_ERROR_PATTERN = /(?:\b(?:database|fetch|http|jwt|network|permission|postgrest|postgres(?:ql)?|row[- ]level|rpc|schema|supabase|timeout)\b|failed to fetch)/i;

export function userError(error, fallback) {
  const message = String(error?.message || '').trim();
  if (!message || message.length > 240 || TECHNICAL_ERROR_PATTERN.test(message)) return fallback;
  return message;
}

