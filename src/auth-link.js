export function parseLoginLink(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const query = new URLSearchParams(url.search);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const tokenHash = query.get('token_hash') || query.get('token');
  if (tokenHash) return {kind: 'token_hash', value: tokenHash};

  const code = query.get('code');
  if (code) return {kind: 'code', value: code};

  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken && refreshToken) {
    return {kind: 'session', accessToken, refreshToken};
  }

  return null;
}
