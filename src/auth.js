import {createClient} from '@supabase/supabase-js';
import {parseLoginLink} from './auth-link.js';
import {supabaseConfig, supabaseConfigured} from './runtime-config.js';

const authOptions = {
  detectSessionInUrl: true,
  persistSession: true,
  autoRefreshToken: true,
};
const unavailableMessage = 'Supabase ist für diese Umgebung nicht konfiguriert.';

function unavailableResult() {
  return {data: null, error: new Error(unavailableMessage)};
}

function unavailableQuery() {
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    limit: () => query,
    single: () => query,
    maybeSingle: () => query,
    insert: () => Promise.resolve(unavailableResult()),
    update: () => query,
    delete: () => query,
    upsert: () => Promise.resolve(unavailableResult()),
    then: (resolve, reject) => Promise.resolve(unavailableResult()).then(resolve, reject),
  };
  return query;
}

function createUnavailableSupabase() {
  const unavailableAuth = {
    async getUser() {
      return {data: {user: null}, error: null};
    },
    onAuthStateChange() {
      return {data: {subscription: {unsubscribe() {}}}};
    },
    async signInWithOtp() {
      return unavailableResult();
    },
    async verifyOtp() {
      return unavailableResult();
    },
    async exchangeCodeForSession() {
      return unavailableResult();
    },
    async setSession() {
      return unavailableResult();
    },
    async signOut() {
      return {error: null};
    },
  };

  return {
    auth: unavailableAuth,
    functions: {
      async invoke() {
        return unavailableResult();
      },
    },
    from: () => unavailableQuery(),
  };
}

// Der Publishable Key ist für den Browser bestimmt, wird aber ausschließlich aus
// der Build-Konfiguration gelesen. Service-Role- und Secret-Schlüssel gehören nie in
// Clientcode.
export const supabase = supabaseConfigured
  ? createClient(supabaseConfig.url, supabaseConfig.publishableKey, {auth: authOptions})
  : createUnavailableSupabase();
export async function sendLoginLink(email){return supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin+window.location.pathname+window.location.search}})}
export async function verifyLoginCode(email, token){return supabase.auth.verifyOtp({email,token,type:'email'})}
export async function verifyLoginLink(value){
  const parsed=parseLoginLink(value);
  if (!parsed) return {data:{session:null,user:null},error:new Error('Ungültiger oder nicht unterstützter Anmeldelink.')};
  if (parsed.kind==='token_hash') return supabase.auth.verifyOtp({token_hash:parsed.value,type:'email'});
  if (parsed.kind==='code') return supabase.auth.exchangeCodeForSession(parsed.value);
  return supabase.auth.setSession({access_token:parsed.accessToken,refresh_token:parsed.refreshToken});
}
export async function signOut(){return supabase.auth.signOut()}

