import {createClient} from '@supabase/supabase-js';
const url='https://kryxhpklrugceiwlrofm.supabase.co';
// Public browser key. NEVER put a service_role or secret key here.
const key='sb_publishable_vi3R-KjIYhgIFGnpVi5pyw_Sz-6szyv';
export const supabase=createClient(url,key,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
export async function sendLoginLink(email){return supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin+window.location.pathname}})}
export async function signOut(){return supabase.auth.signOut()}
