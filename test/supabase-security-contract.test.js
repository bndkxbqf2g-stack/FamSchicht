import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('owner-only household member migration keeps the RLS boundary explicit', () => {
  const source = read('supabase/migrations/20260925150049_create_owner_household_members.sql');
  assert.match(source, /alter table public\.household_members enable row level security/);
  assert.match(source, /revoke all on table public\.household_members from anon/);
  assert.match(source, /revoke all on table public\.household_members from authenticated/);
  assert.match(source, /grant select, insert, update, delete on table public\.household_members to authenticated/);

  for (const action of ['read', 'insert', 'update', 'delete']) {
    assert.match(source, new RegExp(`create policy household_members_owner_${action}`));
  }
  const policies = source.split(/create policy /).slice(1);
  assert.equal(policies.length, 4);
  policies.forEach(policy => assert.match(policy, /h\.owner_id = \(select auth\.uid\(\)\)/));
  const updatePolicy = policies.find(policy => policy.startsWith('household_members_owner_update'));
  assert.match(updatePolicy, /using \(/);
  assert.match(updatePolicy, /with check \(/);
});

test('invitation secrets stay outside browser grants and acceptance remains atomic', () => {
  const table = read('supabase/migrations/20260925161507_create_private_household_invitations.sql');
  const rpcs = read('supabase/migrations/20260925162320_add_secure_invitation_rpcs.sql');
  const edgeBoundary = read('supabase/migrations/20260925162601_move_invitation_privilege_to_edge_boundary.sql');

  assert.match(table, /revoke all on schema private from public/);
  assert.match(table, /revoke all on schema private from anon/);
  assert.match(table, /revoke all on schema private from authenticated/);
  assert.match(table, /revoke all on table private\.household_invitations from authenticated/);
  assert.match(rpcs, /encode\(extensions\.digest\(btrim\(p_token\), 'sha256'\), 'hex'\)/);
  assert.match(rpcs, /for update/);
  assert.match(rpcs, /accepted_at = now\(\), accepted_by/);
  assert.match(edgeBoundary, /language plpgsql\s+security invoker/);
  assert.match(edgeBoundary, /grant execute on function public\.edge_create_household_invitation[\s\S]+to service_role/);
  assert.doesNotMatch(edgeBoundary, /grant execute on function public\.edge_(?:create|accept|revoke)_household_invitation[\s\S]+to authenticated/);
});

test('private invitation storage has an explicit server-role RLS boundary', () => {
  const migration = read('supabase/migrations/20261019100000_enable_private_invitation_rls.sql');
  const schema = read('supabase/schema.sql');

  for (const source of [migration, schema]) {
    assert.match(source, /alter table private\.household_invitations enable row level security/);
    assert.match(source, /create policy household_invitations_service_role_only/);
    assert.match(source, /for all\s+to service_role/);
    assert.match(source, /using \(true\)\s+with check \(true\)/);
    const policy = source.match(/create policy household_invitations_service_role_only[\s\S]*?with check \(true\);/);
    assert.ok(policy);
    assert.doesNotMatch(policy[0], /to (?:anon|authenticated)/);
  }
});

test('client code never contains service-role or secret-key material', () => {
  const sourceFiles = fs.readdirSync(path.join(root, 'src'))
    .filter(file => file.endsWith('.js'))
    .map(file => read(path.join('src', file)))
    .join('\n');
  const executableClientCode = sourceFiles
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(executableClientCode, /service_role|SUPABASE_SERVICE_ROLE|sb_secret_/i);
});

test('the deployed invitation edge boundary authenticates users before admin RPCs', () => {
  const source = read('supabase/functions/household-invitations/index.ts');
  assert.match(source, /withSupabase\(\s*\{ auth: 'user' \}/);
  assert.match(source, /const actorId = ctx\.userClaims\?\.sub/);
  assert.match(source, /const actorEmail = ctx\.userClaims\?\.email/);
  assert.match(source, /ctx\.supabaseAdmin\.rpc\(/);
  assert.match(source, /if \(!actorId \|\| !actorEmail\)/);
});


test('coparent calendar access is shared but excludes private, self, and shift data', () => {
  const migration = read('supabase/migrations/20261019110000_enable_coparent_shared_calendar_rls.sql');
  const schema = read('supabase/schema.sql');

  for (const source of [migration, schema]) {
    assert.match(source, /create or replace function public\.is_household_coparent/);
    assert.match(source, /m\.role\s*=\s*'coparent'/);
    assert.match(source, /create or replace function public\.get_my_household_context/);
    assert.match(source, /create policy event_coparent_read/);
    assert.match(source, /create policy event_coparent_insert/);
    assert.match(source, /create policy event_coparent_update/);
    assert.match(source, /visibility <> 'self'/);
    assert.match(source, /category not in \('shift', ?'private'\)/);
  }

  assert.match(migration, /create trigger trg_calendar_event_identity/);
  assert.match(migration, /new\.household_id is distinct from old\.household_id/);
  assert.match(migration, /new\.creator_id is distinct from old\.creator_id/);
  assert.doesNotMatch(migration, /create policy event_coparent_delete/);
  assert.match(schema, /create policy households_read[\s\S]+public\.is_household_owner\(id\)/);
  assert.match(schema, /create policy memberships_read[\s\S]+public\.is_household_owner\(household_id\)/);
});

test('owner round-trip remains available for coparent-created shared events', () => {
  const migration = read('supabase/migrations/20261019114500_complete_owner_event_scope_for_coparent_writes.sql');
  assert.match(migration, /create policy event_household_owner_read/);
  assert.match(migration, /create policy event_household_owner_update/);
  assert.match(migration, /create policy event_household_owner_delete/);
  assert.match(migration, /h\.owner_id = \(select auth\.uid\(\)\)/);
});

