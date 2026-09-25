import { withSupabase } from 'npm:@supabase/server'

const allowedOrigins = new Set([
  'https://bndkxbqf2g-stack.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
])

function corsHeaders(origin: string | null) {
  const allowed = origin && allowedOrigins.has(origin)
    ? origin
    : 'https://bndkxbqf2g-stack.github.io'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json',
    },
  })
}

const authenticatedHandler = withSupabase(
  { auth: 'user' },
  async (req, ctx) => {
    const origin = req.headers.get('Origin')
    const actorId = ctx.userClaims?.sub
    const actorEmail = ctx.userClaims?.email
    if (!actorId || !actorEmail) {
      return json({ error: 'Nicht angemeldet.' }, 401, origin)
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Ungültige Anfrage.' }, 400, origin)
    }

    const action = String(body.action || '')

    if (action === 'create') {
      const householdId = String(body.householdId || '').trim()
      const email = String(body.email || '').trim().toLowerCase()
      const role = String(body.role || '').trim()
      const ttlSeconds = Number(body.ttlSeconds ?? 604800)

      if (!householdId || !email || !['partner', 'coparent'].includes(role) ||
          !Number.isInteger(ttlSeconds)) {
        return json({ error: 'Ungültige Einladung.' }, 400, origin)
      }

      const { data, error } = await ctx.supabaseAdmin.rpc(
        'edge_create_household_invitation',
        {
          p_actor_id: actorId,
          p_household_id: householdId,
          p_recipient_email: email,
          p_role: role,
          p_ttl_seconds: ttlSeconds,
        },
      )

      if (error) {
        const status = error.message === 'not_authorized' ? 403 : 400
        return json({ error: 'Einladung konnte nicht erstellt werden.' }, status, origin)
      }

      const invitation = data?.[0]
      if (!invitation?.invitation_token) {
        return json({ error: 'Einladung konnte nicht erstellt werden.' }, 500, origin)
      }

      return json({
        invitationId: invitation.invitation_id,
        token: invitation.invitation_token,
        expiresAt: invitation.invitation_expires_at,
      }, 200, origin)
    }

    if (action === 'accept') {
      const token = String(body.token || '').trim()
      if (token.length < 32 || token.length > 512 || /\s/.test(token)) {
        return json({ error: 'Einladung ist nicht verfügbar.' }, 400, origin)
      }

      const { data, error } = await ctx.supabaseAdmin.rpc(
        'edge_accept_household_invitation',
        {
          p_actor_id: actorId,
          p_actor_email: String(actorEmail).toLowerCase(),
          p_token: token,
        },
      )

      if (error || !data?.[0]) {
        return json({ error: 'Einladung ist nicht verfügbar.' }, 400, origin)
      }

      return json({
        householdId: data[0].accepted_household_id,
        role: data[0].accepted_role,
      }, 200, origin)
    }

    if (action === 'revoke') {
      const invitationId = String(body.invitationId || '').trim()
      if (!invitationId) {
        return json({ error: 'Ungültige Einladung.' }, 400, origin)
      }

      const { data, error } = await ctx.supabaseAdmin.rpc(
        'edge_revoke_household_invitation',
        {
          p_actor_id: actorId,
          p_invitation_id: invitationId,
        },
      )

      if (error) {
        return json({ error: 'Einladung konnte nicht widerrufen werden.' }, 400, origin)
      }

      return json({ revoked: data === true }, 200, origin)
    }

    return json({ error: 'Unbekannte Aktion.' }, 400, origin)
  },
)

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin')
  if (origin && !allowedOrigins.has(origin)) {
    return json({ error: 'Origin nicht erlaubt.' }, 403, origin)
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Methode nicht erlaubt.' }, 405, origin)
  }

  return authenticatedHandler(req)
})
