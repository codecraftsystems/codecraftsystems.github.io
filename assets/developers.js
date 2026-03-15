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

  function getSession() {
    try {
      const raw = localStorage.getItem('cc_session');
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.email || !s.user_id || !s.loginAt) return null;
      return s;
    } catch (error) {
      return null;
    }
  }

  const developerSlugCache = new Map();

  async function fetchDeveloperSlug(client, session) {
    const cacheKey = `${session.email}::${session.user_id}`;
    if (developerSlugCache.has(cacheKey)) return developerSlugCache.get(cacheKey);

    const request = client
      .from('developers')
      .select('slug')
      .eq('email', session.email)
      .eq('user_id', session.user_id)
      .maybeSingle()
      .then(({ data }) => (data && data.slug ? data.slug : ''))
      .catch(() => '');

    developerSlugCache.set(cacheKey, request);
    return request;
  }

  async function applyTalentNav(options = {}) {
    const session = options.session || getSession();
    if (!session) return null;

    const addSelector = options.addSelector || '[data-nav-add-profile]';
    const viewSelector = options.viewSelector || '[data-nav-view-profile]';
    const hideWhenLoggedSelector = options.hideWhenLoggedSelector || '[data-hide-when-logged]';
    const profilePathPrefix = options.profilePathPrefix || '../developer/?slug=';

    let slug = options.slug || (options.profile && options.profile.slug) || session.slug || '';

    if (!slug) {
      try {
        const client = createClient();
        slug = await fetchDeveloperSlug(client, session);
      } catch (error) {
        // no-op: keep graceful fallback
      }
    }

    const addLinks = document.querySelectorAll(addSelector);
    addLinks.forEach((el) => {
      el.style.display = 'none';
      if (el.closest('li')) el.closest('li').style.display = 'none';
    });

    if (slug) {
      const viewLinks = document.querySelectorAll(viewSelector);
      viewLinks.forEach((el) => {
        el.href = profilePathPrefix + encodeURIComponent(slug);
        el.style.display = '';
        if (el.closest('li')) el.closest('li').style.display = '';
      });
    }

    document.querySelectorAll(hideWhenLoggedSelector).forEach((el) => {
      el.style.display = 'none';
    });

    return { session, slug };
  }

  window.devDirectory = {
    createClient,
    slugify,
    escapeHtml,
    asset,
    isValidHttpUrl,
    normalizeImageUrl,
    isValidEmail,
    DEFAULT_PROFILE_IMAGE,
    getSession,
    applyTalentNav
  };
})();
