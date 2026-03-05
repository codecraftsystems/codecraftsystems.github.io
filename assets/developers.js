(function () {
  const SUPABASE_URL = window.SUPABASE_URL || 'https://YOUR-PROJECT.supabase.co';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

  function createClient() {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error('Supabase client library failed to load.');
    }
    if (SUPABASE_URL.includes('YOUR-PROJECT') || SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')) {
      throw new Error('Configure SUPABASE_URL and SUPABASE_ANON_KEY in assets/supabase-config.js');
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  function slugify(input) {
    return String(input || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.devDirectory = { createClient, slugify, escapeHtml };
})();
