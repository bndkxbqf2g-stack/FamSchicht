const inactiveInvitationMessage =
  'Einladung ist bereits abgelaufen, widerrufen oder nicht mehr verfügbar.';

export function invitationRevocationOutcome(result) {
  if (result?.revoked === true) {
    return {
      revoked: true,
      message: 'Einladung widerrufen. Der persönliche Link ist nicht mehr gültig.',
    };
  }
  return {revoked: false, message: inactiveInvitationMessage};
}
