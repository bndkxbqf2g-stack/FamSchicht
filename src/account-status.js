export function accountStatusText({hasInvite = false, inviteStatus = ''} = {}) {
  if (inviteStatus) return inviteStatus;
  if (hasInvite) return 'Nach der Anmeldung wird eine offene Einladung automatisch geprüft.';
  return 'Familientermine werden nach Einrichtung deines Haushalts synchronisiert. Ohne Anmeldung bleiben Einträge nur auf diesem Gerät.';
}
