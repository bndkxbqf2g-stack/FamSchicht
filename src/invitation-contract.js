const INVITABLE_ROLES = new Set(['partner', 'coparent']);

export function normalizeInvitationEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('valid invitation email is required');
  }
  return email;
}

export function validateInvitationRole(value) {
  const role = String(value || '').trim();
  if (!INVITABLE_ROLES.has(role)) {
    throw new Error('unsupported invitation role');
  }
  return role;
}

export function invitationRequest({householdId, email, role}) {
  const cleanHouseholdId = String(householdId || '').trim();
  if (!cleanHouseholdId) throw new Error('householdId is required');
  return Object.freeze({
    householdId: cleanHouseholdId,
    email: normalizeInvitationEmail(email),
    role: validateInvitationRole(role),
  });
}

export function invitationAcceptance({token}) {
  const cleanToken = String(token || '').trim();
  // The server owns token generation and cryptographic validation. The client
  // contract only rejects obviously empty/truncated values and never decodes
  // authorization data from the token itself.
  if (cleanToken.length < 32 || cleanToken.length > 512 || /\s/.test(cleanToken)) {
    throw new Error('valid invitation token is required');
  }
  return Object.freeze({token: cleanToken});
}
