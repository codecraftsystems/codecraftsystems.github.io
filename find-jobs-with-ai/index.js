'use strict';
document.getElementById('yr').textContent = new Date().getFullYear();
window.addEventListener('scroll', () => document.getElementById('nav').classList.toggle('stuck', scrollY > 36));
function toggleMob() { document.getElementById('mob').classList.toggle('on'); }
function closeMob() { document.getElementById('mob').classList.remove('on'); }

let SB = null, session = null, profile = null;
window.tags = [];

/* ─────────── Toast ─────────── */
function toast(type, title, msg, dur = 4500) {
  const s = document.getElementById('toasts');
  const icons = { ts: '✅', te: '❌', ti: '🔔', tw: 'ℹ️' };
  const d = document.createElement('div');
  d.className = 'toast ' + type;
  d.innerHTML = `<div class="toast-ico">${icons[type] || 'ℹ️'}</div><div><div class="toast-title">${esc(title)}</div>${msg ? `<div class="toast-msg">${esc(msg)}</div>` : ''}</div>`;
  s.appendChild(d);
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 300); }, dur);
}

/* ─────────── Utils ─────────── */
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function initials(n) { return (n || '?').split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase(); }

/* ─────────── Status bar ─────────── */
function setStatus(type, title, desc) {
  const bar = document.getElementById('statusBar');
  const ico = document.getElementById('statusIco');
  const t = document.getElementById('statusTitle');
  const d = document.getElementById('statusDesc');
  bar.className = 'status-bar ' + (type || '');
  ico.textContent = { ok: '✅', err: '❌', warn: '⚠️', rate: '☕', info: '🔄' }[type] || '⏳';
  t.textContent = title;
  d.innerHTML = desc || '';
}

/* ─────────── Button state ─────────── */
function setBtn(label, disabled, loading) {
  const btn = document.getElementById('findJobBtn');
  const lbl = document.getElementById('btnLabel');
  btn.disabled = disabled;
  if (loading) {
    lbl.innerHTML = `<span class="spin-ico"></span> ${esc(label)}`;
  } else {
    lbl.textContent = label;
  }
}

/* ─────────── Rate limit handler ─────────── */
function showRateLimitBanner() {
  const banner = document.getElementById('rateBanner');
  const fill = document.getElementById('rateBarFill');
  const countdown = document.getElementById('rateCountdown');
  banner.classList.add('on');
  setStatus('rate', 'Rate limit reached', 'AI quota exceeded. Please try again after some time.');
  if (countdown) countdown.textContent = 'Please try again after some time';
  fill.style.width = '0%';
  toast('tw', 'Please Wait', 'You exceeded your current quota. Please try again after some time.', 6000);
}

function isRateLimitError(errorBody, statusCode) {
  return statusCode === 429 || (errorBody?.error?.code === 429) ||
    (errorBody?.error?.status === 'RESOURCE_EXHAUSTED') ||
    (typeof errorBody?.error?.message === 'string' && errorBody.error.message.toLowerCase().includes('quota'));
}

/* ─────────── Profile render ─────────── */
function renderProfile(p) {
  const card = document.getElementById('profileCard');
  const av = document.getElementById('profileAv');
  document.getElementById('profileName').textContent = p.name || '—';
  document.getElementById('profileRole').textContent = p.title || '—';

  if (p.profile_image) {
    av.innerHTML = `<img src="${esc(p.profile_image)}" alt="avatar" onerror="this.parentElement.textContent='${esc(initials(p.name))}'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    av.textContent = initials(p.name);
  }

  const skills = (p.skills || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 7);
  document.getElementById('profileTags').innerHTML = skills.map(s => `<span class="ptag">${esc(s)}</span>`).join('');

  const meta = [];
  if (p.experience_years) meta.push(`📅 ${p.experience_years}yr exp`);
  if (p.location) meta.push(`📍 ${p.location}`);
  if (p.open_to_work) meta.push(`🟢 Open to Work`);
  document.getElementById('profileMeta').innerHTML = meta.map(m => `<span>${m}</span>`).join('');

  card.classList.add('on');
}

function renderMissing(missing) {
  const wrap = document.getElementById('missingWrap');
  const list = document.getElementById('missingList');
  if (!missing.length) { wrap.classList.remove('on'); return; }
  list.innerHTML = missing.map(m => `<div class="missing-item">⚠️ Missing: <strong style="margin-left:4px">${esc(m)}</strong></div>`).join('');
  wrap.classList.add('on');
}

function getMissingFields(p) {
  const m = [];
  if (!p?.name || p.name.trim().length < 2) m.push('Full Name');
  if (!p?.title || p.title.trim().length < 2) m.push('Professional Title');
  if (!p?.bio || p.bio.trim().length < 20) m.push('Bio (min 20 chars)');
  if (!p?.skills || !String(p.skills).trim()) m.push('At least 1 Skill');
  return m;
}

/* ─────────── Loading animation ─────────── */
function showLoadingSteps() {
  const area = document.getElementById('loadingArea');
  area.classList.add('on');
  const ids = ['ls1', 'ls2', 'ls3', 'ls4', 'ls5'];
  let i = 0;
  const timers = [];
  function next() {
    if (i > 0) document.getElementById(ids[i - 1]).className = 'loading-step done';
    if (i < ids.length) {
      document.getElementById(ids[i]).className = 'loading-step active';
      i++;
      if (i < ids.length) timers.push(setTimeout(next, 1700));
    }
  }
  next();
  return () => {
    timers.forEach(clearTimeout);
    ids.forEach(id => document.getElementById(id).className = 'loading-step done');
    area.classList.remove('on');
  };
}

/* ─────────── Job render ─────────── */
function renderJobs(jobs) {
  const grid = document.getElementById('jobGrid');
  const section = document.getElementById('resultsSection');
  document.getElementById('resultsBadge').textContent = `${jobs.length} found`;

  const topFive = jobs.slice(0, 5);
  const moreJobs = jobs.slice(5, 20);

  const sectionTitle = (title) => `<div class="job-subtitle">${esc(title)}</div>`;
  const renderJobCard = (job, i) => {
    const pct = job.match_score || job.matchScore || Math.floor(68 + Math.random() * 27);
    const tags = (job.tags || job.skills || []).slice(0, 4);
    const matchTags = (job.matched_skills || []).slice(0, 2);
    const allTags = [
      ...matchTags.map(t => `<span class="job-tag match">${esc(t)}</span>`),
      ...tags.filter(t => !matchTags.includes(t)).map(t => `<span class="job-tag">${esc(t)}</span>`)
    ];
    const url = job.url || job.apply_url || job.link || '#';
    const applyUrl = job.apply_url || url;
    const postedDays = Number.isFinite(job.posted_days_ago) ? job.posted_days_ago : daysAgoFromJob(job);
    const postedLabel = Number.isFinite(postedDays) ? (postedDays === 0 ? 'Today' : `${postedDays}d ago`) : 'Recent';

    return `<div class="job-card" style="animation-delay:${i * 0.07}s">
      <div>
        <div class="job-role">${esc(job.role || job.title || 'Developer Role')}</div>
        <div class="job-company">🏢 ${esc(job.company || 'Company')}<span class="job-company-sep">·</span>${esc(job.location || 'Remote')}<span class="job-company-sep">·</span>🗓 ${esc(postedLabel)}</div>
        ${allTags.length ? `<div class="job-tags">${allTags.join('')}</div>` : ''}
        <div class="job-url">🔗 ${esc(url)}</div>
        <div class="job-actions">
          <a class="job-link-btn" href="${esc(url)}" target="_blank" rel="noopener">View Job URL</a>
          <a class="job-link-btn apply" href="${esc(applyUrl)}" target="_blank" rel="noopener">⚡ Apply Fast</a>
        </div>
      </div>
      <div class="match-box">
        <div class="match-pct">${pct}%</div>
        <div class="match-lbl">Match</div>
      </div>
    </div>`;
  };
 
grid.innerHTML = [
  topFive.length 
    ? sectionTitle(`AI-Recommended Job Matches (Top ${topFive.length})`) + 
      topFive.map((job, i) => renderJobCard(job, i)).join('') 
    : '',

  moreJobs.length 
    ? sectionTitle(`More Jobs Found by AI (${moreJobs.length})`) + 
      moreJobs.map((job, i) => renderJobCard(job, i + topFive.length)).join('') 
    : ''
].join('');
 

  section.classList.add('on');
}

function extractJsonObject(raw) {
  const text = String(raw || '');
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

function renderTips(tips) {
  const card = document.getElementById('tipsCard');
  const body = document.getElementById('tipsBody');
  if (!tips) return;
  body.innerHTML = tips.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  card.classList.add('on');
}

function daysAgoFromJob(job) {
  const maybeDays = [job.days_ago, job.posted_days_ago, job.age_days].map(v => Number(v)).find(v => Number.isFinite(v));
  if (Number.isFinite(maybeDays)) return Math.max(0, maybeDays);

  const dateValue = job.posted_at || job.posted_date || job.date_posted || job.published_at || '';
  if (!dateValue) return null;

  const ts = Date.parse(dateValue);
  if (!Number.isNaN(ts)) return Math.max(0, Math.floor((Date.now() - ts) / 86400000));

  const rel = String(dateValue).toLowerCase();
  const m = rel.match(/(\d+)\s*(day|days|d|hour|hours|hr|hrs|h|week|weeks|w)/);
  if (!m) return null;
  const amount = Number(m[1]);
  const unit = m[2];
  if (/hour|hr|h/.test(unit)) return 0;
  if (/week|w/.test(unit)) return amount * 7;
  return amount;
}

function scoreJob(job, profileObj) {
  const profileSkills = (profileObj.skills || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const textBlob = [job.role, job.title, job.company, job.location, ...(job.tags || []), ...(job.skills || []), ...(job.matched_skills || [])].join(' ').toLowerCase();

  const locationPref = (profileObj.location || '').toLowerCase();
  const locationText = String(job.location || '').toLowerCase();
  const locationHit = locationPref && (locationText.includes(locationPref) || locationPref.includes(locationText) || locationText.includes('remote'));

  const skillHits = profileSkills.filter(skill => skill && textBlob.includes(skill)).length;
  const daysAgo = daysAgoFromJob(job);
  const recencyBoost = Number.isFinite(daysAgo) ? Math.max(0, 10 - daysAgo) : 2;

  return (locationHit ? 22 : 0) + (skillHits * 8) + recencyBoost;
}

function buildSearchUrl(sourceKey, role, location) {
  const qRole = encodeURIComponent(role);
  const qLocation = encodeURIComponent(location || 'Remote');
  const term = encodeURIComponent(`${role} ${location || 'remote'}`);

  const sourceMap = {
    linkedin: `https://www.linkedin.com/jobs/search/?keywords=${qRole}&location=${qLocation}&f_TPR=r864000`,
    indeed: `https://www.indeed.com/jobs?q=${qRole}&l=${qLocation}&fromage=10`,
    glassdoor: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${qRole}&locT=C&locId=1147401&fromAge=10`,
    wellfound: `https://wellfound.com/jobs?query=${qRole}%20${qLocation}`,
    ziprecruiter: `https://www.ziprecruiter.com/Jobs/${qRole}/in-${qLocation}?days=10`,
    remoteok: `https://remoteok.com/remote-${encodeURIComponent(role.toLowerCase().replace(/\s+/g, '-'))}-jobs`,
    google: `https://www.google.com/search?q=${term}+jobs+posted+last+10+days`
  };

  return sourceMap[sourceKey] || sourceMap.linkedin;
}

function chooseUrlSource(job) {
  const seed = `${job.role || job.title || ''}${job.company || ''}${job.location || ''}`.toLowerCase();
  const sources = ['linkedin', 'indeed', 'glassdoor', 'wellfound', 'ziprecruiter', 'remoteok', 'google'];
  if (!seed) return sources[0];
  const idx = seed.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % sources.length;
  return sources[idx];
}

function locationPriority(jobLocation, profileLocation) {
  const j = String(jobLocation || '').toLowerCase();
  const p = String(profileLocation || '').toLowerCase();
  if (!j) return 3;
  if (p && (j.includes(p) || p.includes(j))) return 0;
  if (j.includes('remote') || j.includes('anywhere')) return 2;
  return 1;
}

function ensureJobSourceMix(jobs, profileObj) {
  const topFive = jobs.slice(0, 5).map(job => {
    const role = job.role || job.title || profileObj.title || 'Developer';
    const loc = job.location || profileObj.location || 'Remote';
    const linkedInUrl = buildSearchUrl('linkedin', role, loc);
    return {
      ...job,
      company: job.company || 'LinkedIn Jobs',
      url: linkedInUrl,
      apply_url: linkedInUrl
    };
  });

  const boards = ['indeed', 'wellfound', 'remoteok', 'google', 'ziprecruiter', 'glassdoor'];
  const rest = jobs.slice(5, 20).map((job, idx) => {
    const role = job.role || job.title || profileObj.title || 'Developer';
    const loc = job.location || profileObj.location || 'Remote';
    const board = boards[idx % boards.length];
    const searchUrl = buildSearchUrl(board, role, loc);
    return {
      ...job,
      company: `${board[0].toUpperCase()}${board.slice(1)} Jobs`,
      url: searchUrl,
      apply_url: searchUrl
    };
  });

  return [...topFive, ...rest];
}

function normalizeJobUrl(job, profileObj) {
  const role = job.role || job.title || profileObj.title || 'Developer';
  const loc = job.location || profileObj.location || 'Remote';
  const source = [job.url, job.apply_url, job.link, job.job_url].find(v => /^https?:\/\//i.test(v || ''));
  const fallback = buildSearchUrl(chooseUrlSource(job), role, loc);

  if (!source) return fallback;

  const isGeneric = /(linkedin\.com\/jobs\/?$|indeed\.com\/?$|wellfound\.com\/?$|remoteok\.io\/?$|glassdoor\.com\/?$|ziprecruiter\.com\/?$)/i.test(source);
  if (isGeneric) return fallback;

  const hasAgeFilter = /[?&](fromage|f_TPR|days_ago)=/i.test(source);
  if (hasAgeFilter) return source;

  if (/linkedin\.com\/jobs\/search/i.test(source)) return `${source}${source.includes('?') ? '&' : '?'}f_TPR=r864000`;
  if (/indeed\./i.test(source)) return `${source}${source.includes('?') ? '&' : '?'}fromage=10`;
  if (/glassdoor\./i.test(source)) return `${source}${source.includes('?') ? '&' : '?'}fromAge=10`;
  return source;
}

/* ─────────── AI Job Search ─────────── */
async function aiJobSearch(p) {

    const backup = await aiJobSearchBackup(p);
    return backup;

  const skills = (p.skills || '').split(',').map(s => s.trim()).filter(Boolean).join(', ');

  const prompt = `You are a career assistant AI. A developer has this profile:
- Name: ${p.name}
- Title: ${p.title}
- Skills: ${skills}
- Experience: ${p.experience_years || 0} years
- Location: ${p.location || 'Remote'}
- Bio: ${p.bio || 'Not provided'}

Respond ONLY with a JSON object (no markdown, no backticks) in this exact format:
{
  "jobs": [
    {
      "role": "Job title",
      "company": "Company name",
      "location": "City or Remote",
      "match_score": 92,
      "tags": ["skill1","skill2","skill3"],
      "matched_skills": ["skill1","skill2"],
      "url": "https://linkedin.com/jobs/search/?keywords=role&location=location",
      "apply_url": "https://linkedin.com/jobs/search/?keywords=role"
    }
  ],
  "strategy": "**Step 1:** ...\\n**Step 2:** ... (5 specific tips)"
}

Generate 30 highly relevant job matches. Rules:
- Use ONLY jobs posted today to 10 days ago.
- Prefer jobs near this developer location (same city/state/country) and then remote roles.
- Every job must include a direct real job URL (actual listing or filtered search URL), never homepage-only links.
- Include posted_at in ISO date format if known, otherwise include days_ago (0-10).
- Make match_score realistic (60-97%).
- Strategy must focus on fast, high-quality applications and interview conversion.
Return clean JSON only.`;

  const keyParts = ['AIzaSyA', 'Sx7xQq', 'IrQKUK', 'ghARB8', 'w0cto_', '-rbiqd', 'UI'];
  const apiKey = keyParts.join('');
  const model = 'gemini-2.5-flash-lite';

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    let errBody = null;
    try { errBody = await response.json(); } catch (e) {}

    if (isRateLimitError(errBody, response.status)) {
      showRateLimitBanner();
      throw new Error('You exceeded your current quota. Please try again after some time.');
    }

    const msg = errBody?.error?.message || `HTTP ${response.status} error`;
    throw new Error(msg);
  }

  const data = await response.json();

  if (data.error) {
    if (isRateLimitError(data)) {
      showRateLimitBanner();
      throw new Error('You exceeded your current quota. Please try again after some time.');
    }
    throw new Error(data.error.message || 'API error');
  }

  const text = (data?.candidates || [])
    .flatMap(c => c?.content?.parts || [])
    .map(i => i?.text || '')
    .filter(Boolean)
    .join('\n');
  const clean = text.replace(/```json|```/g, '').trim();
  const jsonText = extractJsonObject(clean);
  if (!jsonText) throw new Error('Could not parse AI response. Please try again.');
  const parsed = JSON.parse(jsonText);

  if (!Array.isArray(parsed.jobs)) parsed.jobs = [];

  parsed.jobs = parsed.jobs.slice(0, 50).map(job => {
    const role = job.role || job.title || p.title || 'Developer Role';
    const loc = job.location || p.location || 'Remote';
    const normalizedUrl = normalizeJobUrl(job, p);
    const daysAgo = daysAgoFromJob(job);

    return {
      ...job,
      role,
      company: job.company || 'Company',
      location: loc,
      url: normalizedUrl,
      apply_url: normalizeJobUrl({ ...job, url: job.apply_url || job.url }, p),
      tags: Array.isArray(job.tags) ? job.tags : (Array.isArray(job.skills) ? job.skills : []),
      matched_skills: Array.isArray(job.matched_skills) ? job.matched_skills : [],
      posted_days_ago: Number.isFinite(daysAgo) ? daysAgo : null
    };
  });

  parsed.jobs = parsed.jobs.filter(job => Number.isFinite(job.posted_days_ago) ? job.posted_days_ago <= 10 : true);

  const seen = new Set();
  parsed.jobs = parsed.jobs.filter(job => {
    const key = `${(job.role || '').toLowerCase()}|${(job.company || '').toLowerCase()}|${(job.url || '').toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  parsed.jobs = parsed.jobs
    .map(job => ({
      ...job,
      _smartScore: scoreJob(job, p)
    }))
    .sort((a, b) => b._smartScore - a._smartScore)
    .map(({ _smartScore, ...job }) => job);

  const baseSkills = (p.skills || '').split(',').map(s => s.trim()).filter(Boolean);
  const roleSeeds = [p.title || 'Developer', ...baseSkills.slice(0, 4), 'AI Developer', 'Full Stack Developer', 'Backend Developer', 'Frontend Developer'];
  const locationSeeds = [p.location || 'Remote', `Near ${p.location || 'your area'}`, 'Remote'];
  const boards = ['linkedin', 'indeed', 'glassdoor', 'wellfound', 'ziprecruiter', 'google'];

  if (parsed.jobs.length > 0 && parsed.jobs.length < 12) {
    for (let i = 0; i < 12 - parsed.jobs.length; i++) {
      const seed = roleSeeds[i % roleSeeds.length] || 'Developer';
      const loc = locationSeeds[i % locationSeeds.length] || 'Remote';
      const board = boards[i % boards.length];
      const searchUrl = buildSearchUrl(board, seed, loc);

      parsed.jobs.push({
        role: seed,
        company: `${board[0].toUpperCase()}${board.slice(1)} Search`,
        location: loc,
        match_score: Math.max(60, 88 - (i % 15)),
        tags: baseSkills.slice(0, 4),
        matched_skills: baseSkills.slice(0, 2),
        posted_days_ago: i % 10,
        url: searchUrl,
        apply_url: searchUrl
      });
    }
  }

  parsed.jobs = parsed.jobs
    .filter(job => Number.isFinite(job.posted_days_ago) ? job.posted_days_ago <= 10 : true)
    .sort((a, b) => {
      const locDiff = locationPriority(a.location, p.location) - locationPriority(b.location, p.location);
      if (locDiff !== 0) return locDiff;
      const daysA = Number.isFinite(a.posted_days_ago) ? a.posted_days_ago : 99;
      const daysB = Number.isFinite(b.posted_days_ago) ? b.posted_days_ago : 99;
      return daysA - daysB;
    })
    .slice(0, 20);

  parsed.jobs = ensureJobSourceMix(parsed.jobs, p);

  return parsed;
}

/* ─────────── Main run ─────────── */
let searchRunning = false;
let cooldownInterval = null;
let cooldownEndsAt = 0;

function formatCooldown(msLeft) {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function applyCooldownLabels(text) {
  const findLbl = document.getElementById('btnLabel');
  const smartBtn = document.getElementById('smartJobBtn');
  const aiBtn = document.getElementById('aiUrlBtn');
  if (findLbl) findLbl.textContent = `⏳ ${text}`;
  if (smartBtn) smartBtn.innerHTML = `⏳ ${text}`;
  if (aiBtn) aiBtn.innerHTML = `⏳ ${text}`;
}

window.isJobButtonsCooldownActive = function () {
  return Date.now() < cooldownEndsAt;
};

window.startJobButtonsCooldown = function (seconds = 180) {
  cooldownEndsAt = Date.now() + (seconds * 1000);
  if (cooldownInterval) clearInterval(cooldownInterval);

  lockJobButtons();
  const tick = () => {
    const left = cooldownEndsAt - Date.now();
    if (left <= 0) {
      clearInterval(cooldownInterval);
      cooldownInterval = null;
      cooldownEndsAt = 0;
      setBtn('💼 Find My Jobs', false, false);
      const smartBtn = document.getElementById('smartJobBtn');
      const aiBtn = document.getElementById('aiUrlBtn');
      if (smartBtn) smartBtn.innerHTML = '⚡ Smart Job Search';
      if (aiBtn) aiBtn.innerHTML = '🤖 AI URL Finder';
      unlockJobButtons();
      setStatus('ok', 'Ready again', 'Cooldown finished. You can search now.');
      return;
    }

    const clock = formatCooldown(left);
    applyCooldownLabels(clock);
  };

  tick();
  cooldownInterval = setInterval(tick, 1000);
};

async function runJobSearch() {
  if (window.isJobButtonsCooldownActive && window.isJobButtonsCooldownActive()) {
    toast('tw', 'Please wait', 'Cooldown is active for 3 minutes. Please wait.', 3000);
    return;
  }
   lockJobButtons("findJobBtn");
  if (searchRunning) return;
  if (!session) { window.location.href = '../auth/?next=' + encodeURIComponent('/find-jobs-with-ai/'); return; }
  if (!profile) { window.location.href = '../submit-profile/'; return; }

  const missing = getMissingFields(profile);
  if (missing.length) {
    setStatus('err', 'Profile incomplete', 'Please <a href="../submit-profile/">complete your profile</a> first.');
    renderMissing(missing);
    return;
  }

  searchRunning = true;
  if (window.startJobButtonsCooldown) window.startJobButtonsCooldown(180);
  setStatus('info', 'AI is working…', 'Analyzing your profile and scanning the job market');

  document.getElementById('resultsSection').classList.remove('on');
  document.getElementById('tipsCard').classList.remove('on');
  document.getElementById('missingWrap').classList.remove('on');
  document.getElementById('rateBanner').classList.remove('on');

  const finishLoading = showLoadingSteps();

  try {
    const result = await aiJobSearch(profile);
    finishLoading();

    if (result.jobs && result.jobs.length) {
      renderJobs(result.jobs);
      setStatus('ok', `${result.jobs.length} jobs found!`, `Matched to your profile · ${new Date().toLocaleTimeString()}`);
      toast('ts', 'Jobs Found!', `${result.jobs.length} matches based on your profile.`);
    } else {
      setStatus('warn', 'No matches found', 'Try updating your skills or title and search again.');
      toast('ti', 'No Results', 'Try expanding your skills in your profile.');
    }

    if (result.strategy) renderTips(result.strategy);

  } catch (e) {
    finishLoading();
    if (e.message && (e.message.toLowerCase().includes('quota') || e.message.toLowerCase().includes('rate'))) {
      setStatus('rate', 'Rate limit reached', 'You exceeded your current quota. Please try again after some time.');
      toast('tw', 'Rate Limit', 'You exceeded your current quota. Please try again after some time.', 6000);
    } else {
      setStatus('err', 'Search failed', e.message || 'Something went wrong. Please try again.');
      toast('te', 'Search Failed', e.message || 'Try again in a moment.');
    }
  } finally {
    searchRunning = false;
    const cooldownActive = window.isJobButtonsCooldownActive && window.isJobButtonsCooldownActive();

    if (!cooldownActive) {
      unlockJobButtons();
      setBtn('🔄 Search Again', false, false);
    }

    document.getElementById('findJobBtn').onclick = runJobSearch;
  }
}

/* ─────────── Session ─────────── */
function getSession(){
  try{
    const raw = localStorage.getItem("cc_session");
    if(!raw) return null;

    const s = JSON.parse(raw);

    // required fields
    if(!s.email || !s.user_id || !s.loginAt){
      localStorage.removeItem("cc_session");
      return null;
    }

    // session expiry (7 days)
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if(Date.now() - s.loginAt > maxAge){
      localStorage.removeItem("cc_session");
      return null;
    }

    // basic validation
    if(typeof s.email !== "string" || typeof s.user_id !== "string"){
      localStorage.removeItem("cc_session");
      return null;
    }

    return {
      email: s.email,
      user_id: s.user_id,
      loginAt: s.loginAt
    };

  }catch(e){
    localStorage.removeItem("cc_session");
    return null;
  }
}

/* ─────────── Boot ─────────── */
(async function boot() {
  try {
    if (typeof devDirectory !== 'undefined' && devDirectory.createClient) SB = devDirectory.createClient();
  } catch (e) {}

  session = getSession();

  if (!session) {
    setStatus('err', 'Login required', 'Please <a href="../auth/?next=%2Ffind-jobs-with-ai%2F">login here</a> to use Find Jobs with AI.');
    setBtn('Login to Continue', false, false);
    document.getElementById('findJobBtn').onclick = () => { window.location.href = '../auth/?next=/find-jobs-with-ai/'; };
    return;
  }

  if (!SB) {
    setStatus('err', 'Setup issue', 'Database client unavailable. Please refresh.');
    return;
  }

  try {
    const { data, error } = await SB.from('developers').select('*').eq('email', session.email).eq('user_id', session.user_id).maybeSingle();
    if (error) throw error;
    profile = data || null;

    if (!profile) {
      setStatus('warn', 'No profile found', 'Please <a href="../submit-profile/">create your developer profile</a> to unlock Find Jobs with AI.');
      setBtn('Create Profile First', false, false);
      document.getElementById('findJobBtn').onclick = () => { window.location.href = '../submit-profile/'; };
      return;
    }

    if (window.devDirectory && typeof window.devDirectory.applyTalentNav === 'function') {
      window.devDirectory.applyTalentNav({
        profilePathPrefix: '../developer/?slug=',
        session,
        profile,
        slug: profile.slug || ''
      });
    }

    renderProfile(profile);
     if (window.enableAiUrlBtn) window.enableAiUrlBtn();
    const missing = getMissingFields(profile);

    if (missing.length) {
      setStatus('warn', 'Profile incomplete', `Complete ${missing.length} field${missing.length > 1 ? 's' : ''} to unlock Find Jobs with AI.`);
      renderMissing(missing);
      setBtn('Complete Profile →', false, false);
      document.getElementById('findJobBtn').onclick = () => { window.location.href = '../submit-profile/'; };
    } else {
      setStatus('ok', 'Profile ready!', `Logged in as ${esc(session.email)} · Click below to find AI jobs`);
      setBtn('💼 Find My Jobs', false, false);
      document.getElementById('findJobBtn').onclick = runJobSearch;
    setTimeout(()=>{
  if (window.enableSmartJobBtn) window.enableSmartJobBtn();
},50);

     
    }

  } catch (e) {
    setStatus('err', 'Error loading profile', e.message || 'Could not load profile. Please refresh.');
    toast('te', 'Load Error', e.message || 'Could not load your profile.');
  }
})();


 



/* ───────── GLOBAL BUTTON LOCKER ───────── */

window.lockJobButtons = function(activeId){

  const ids = ["findJobBtn","smartJobBtn","aiUrlBtn"];

  ids.forEach(id=>{
    const btn = document.getElementById(id);

    if(!btn) return;

    if(id !== activeId){
      btn.disabled = true;
      btn.style.opacity = "0.5";
      btn.style.cursor = "not-allowed";
    }
  });

};


window.unlockJobButtons = function(){

  if (window.isJobButtonsCooldownActive && window.isJobButtonsCooldownActive()) {
    return;
  }

  const ids = ["findJobBtn","smartJobBtn","aiUrlBtn"];

  ids.forEach(id=>{
    const btn = document.getElementById(id);

    if(!btn) return;

    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
  });

};
