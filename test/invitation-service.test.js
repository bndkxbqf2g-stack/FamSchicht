import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptHouseholdInvitation,
  createHouseholdInvitation,
  revokeHouseholdInvitation,
} from '../src/invitation-service.js';

function fakeClient(response = {data: {ok: true}, error: null}) {
  const calls = [];
  return {
    calls,
    functions: {
      async invoke(name, options) {
        calls.push([name, options]);
        return response;
      },
    },
  };
}

test('create invitation sends normalized validated request to edge boundary', async () => {
  const client = fakeClient({
    data: {invitationId: 'i1', token: 'A'.repeat(64), expiresAt: '2026-10-02'},
    error: null,
  });

  const result = await createHouseholdInvitation(client, {
    householdId: 'house-1',
    email: ' Partner@Example.DE ',
    role: 'partner',
  });

  assert.equal(result.invitationId, 'i1');
  assert.deepEqual(client.calls, [[
    'household-invitations',
    {body: {
      action: 'create',
      householdId: 'house-1',
      email: 'partner@example.de',
      role: 'partner',
      ttlSeconds: 604800,
    }},
  ]]);
});

test('invalid role is rejected before edge invocation', async () => {
  const client = fakeClient();
  await assert.rejects(
    () => createHouseholdInvitation(client, {
      householdId: 'house-1',
      email: 'x@example.de',
      role: 'owner',
    }),
    /unsupported invitation role/,
  );
  assert.deepEqual(client.calls, []);
});

test('accept invitation passes opaque token unchanged', async () => {
  const client = fakeClient({
    data: {householdId: 'house-1', role: 'coparent'},
    error: null,
  });
  const token = 'AbCdEf0123456789_-AbCdEf0123456789_-';

  const result = await acceptHouseholdInvitation(client, token);

  assert.equal(result.role, 'coparent');
  assert.deepEqual(client.calls[0], [
    'household-invitations',
    {body: {action: 'accept', token}},
  ]);
});

test('revoke invitation uses edge boundary and requires an id', async () => {
  const client = fakeClient({data: {revoked: true}, error: null});
  assert.deepEqual(
    await revokeHouseholdInvitation(client, 'invite-1'),
    {revoked: true},
  );
  await assert.rejects(
    () => revokeHouseholdInvitation(client, ''),
    /invitationId is required/,
  );
});

test('edge transport errors do not leak provider details', async () => {
  const client = fakeClient({
    data: null,
    error: new Error('secret backend detail'),
  });
  await assert.rejects(
    () => acceptHouseholdInvitation(
      client,
      'AbCdEf0123456789_-AbCdEf0123456789_-',
    ),
    /Einladungsdienst derzeit nicht erreichbar/,
  );
});
