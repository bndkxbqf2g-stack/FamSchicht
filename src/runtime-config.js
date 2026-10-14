const viteEnv = import.meta.env || {};

function readEnv(name) {
  return String(viteEnv[name] || '').trim();
}

export const supabaseConfig = Object.freeze({
  url: readEnv('VITE_SUPABASE_URL'),
  publishableKey: readEnv('VITE_SUPABASE_PUBLISHABLE_KEY'),
});

export const supabaseConfigured = Boolean(
  supabaseConfig.url && supabaseConfig.publishableKey,
);

