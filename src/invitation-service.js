import {
  invitationAcceptance,
  invitationRequest,
} from './invitation-contract.js';

export async function createHouseholdInvitation(
  supabase,
  {householdId, email, role, ttlSeconds = 604800},
) {
  const request = invitationRequest({householdId, email, role});
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 3600 || ttlSeconds > 2592000) {
    throw new Error('invalid invitation lifetime');
  }
  return invokeInvitation(supabase, {
    action: 'create',
    ...request,
    ttlSeconds,
  });
}

export async function acceptHouseholdInvitation(supabase, token) {
  const request = invitationAcceptance({token});
  return invokeInvitation(supabase, {
    action: 'accept',
    ...request,
  });
}

export async function revokeHouseholdInvitation(supabase, invitationId) {
  const id = String(invitationId || '').trim();
  if (!id) throw new Error('invitationId is required');
  return invokeInvitation(supabase, {
    action: 'revoke',
    invitationId: id,
  });
}

async function invokeInvitation(supabase, body) {
  if (!supabase?.functions?.invoke) {
    throw new Error('Supabase Functions client is required');
  }
  const {data, error} = await supabase.functions.invoke(
    'household-invitations',
    {body},
  );
  if (error) {
    throw new Error('Einladungsdienst derzeit nicht erreichbar.');
  }
  if (!data || data.error) {
    throw new Error(data?.error || 'Einladungsdienst lieferte keine Antwort.');
  }
  return data;
}
