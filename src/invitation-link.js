export function clearInvitationParam(href) {
  const url = new URL(href);
  url.searchParams.delete('invite');
  return url.pathname + (url.search ? url.search : '') + url.hash;
}
