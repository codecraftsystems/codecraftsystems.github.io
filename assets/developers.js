(function () {
  const SUPABASE_URL = window.SUPABASE_URL || 'https://xpqsntlvukcwihhoyxqo.supabase.co';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_VT_3gtH3o331GhQ27KR76w_k5o7ZtZq';
  const DEFAULT_PROFILE_IMAGE = 'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=800&q=80';
  

  function createClient() {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error('Supabase library failed to load.');
    }
    if (SUPABASE_URL.includes('YOUR-PROJECT') || SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')) {
      throw new Error('Add real values in assets/supabase-config.js');
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  function slugify(input) {
    return String(input || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function asset(pathFromRoot) {
    const clean = pathFromRoot.replace(/^\/+/, '');
    const depth = (window.location.pathname.match(/\//g) || []).length - 1;
    const prefix = depth <= 0 ? './' : '../'.repeat(depth);
    return prefix + clean;
  }

  function isValidHttpUrl(value) {
    if (!value) return false;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  function normalizeImageUrl(value) {
    const trimmed = String(value || '').trim();
    return isValidHttpUrl(trimmed) ? trimmed : DEFAULT_PROFILE_IMAGE;
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || '').trim());
  }

  window.devDirectory = {
    createClient,
    slugify,
    escapeHtml,
    asset,
    isValidHttpUrl,
    normalizeImageUrl,
    isValidEmail,
    DEFAULT_PROFILE_IMAGE
  };
})();
