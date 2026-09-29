import {createClient} from '@supabase/supabase-js';
import {parseLoginLink} from './auth-link.js';
const url='https://kryxhpklrugceiwlrofm.supabase.co';
// Public browser key. NEVER put a service_role or secret key here.
const key='sb_publishable_vi3R-KjIYhgIFGnpVi5pyw_Sz-6szyv';
export const supabase=createClient(url,key,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
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
