// Supabase CDN already index.html me load hona chahiye

const supabaseClient = supabase.createClient(
  'https://xpqsntlvukcwihhoyxqo.supabase.co',
  'sb_publishable_VT_3gtH3o331GhQ27KR76w_k5o7ZtZq'
);

// Export to global scope
window.supabaseClient = supabaseClient;