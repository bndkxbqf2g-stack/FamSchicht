export function clearInvitationParam(href) {
  const url = new URL(href);
  url.searchParams.delete('invite');
  return url.pathname + (url.search ? url.search : '') + url.hash;
}

export function buildInvitationLink(href, token) {
  const current = new URL(href);
  const link = new URL(current.pathname, current.origin);
  link.searchParams.set('invite', token);
  return link;
}
