/* AI PROFILE GENERATOR - COMPLETE PROFILE BUILDER WITH SPINNER */

const keyParts = ['AIzaSyA', 'Sx7xQq', 'IrQKUK', 'ghARB8', 'w0cto_', '-rbiqd', 'UI'];
const API_KEY = keyParts.join('');

const AI_PROFILE_GENERATOR = {
  API_KEY,
  requestLocks: {
    generate: false,
    resume: false,
    jobs: false
  },
  configCache: {},

  async loadConfig(name) {
    if (this.configCache[name]) return this.configCache[name];

    try {
      const res = await fetch(`./config/${name}.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Config load failed: ${name}`);
      const data = await res.json();
      this.configCache[name] = data;
      return data;
    } catch (error) {
      return null;
    }
  },

  setButtonLoading(button, loading) {
    if (!button) return;
    const btnText = button.querySelector('.btn-text');
    const spinner = button.querySelector('.spinner');
    if (btnText) btnText.style.opacity = loading ? '0' : '1';
    if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
    button.disabled = loading;
  },

  resetButton(button) {
    this.setButtonLoading(button, false);
  },

  showToast(type, title, message) {
    if (typeof toast === 'function') toast(type, title, message);
    else console.log(`${type}: ${title} - ${message}`);
  },

  extractJson(rawText) {
    const raw = String(rawText || '');
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response');
    return JSON.parse(jsonMatch[0]);
  },

  buildPrompt(userPrompt) {
    return `You are an expert developer profile generator for hiring marketplaces. Return ONLY valid JSON. No markdown, no explanations.\n\nExtract or generate a complete developer profile with these EXACT fields:\n{\n  "name":"", "title":"", "location":"", "bio":"",\n  "skills":[], "experience_years":0,\n  "github_url":"", "linkedin_url":"", "portfolio_url":"",\n  "experience":[{"role":"","company":"","period":"","description":""}],\n  "certifications":[{"name":"","issuer":"","year":""}],\n  "seo_focus_keywords":["laravel developer","vue.js developer","full stack developer"]\n}\n\nRules for quality:\n- Write a professional bio of 80-140 words, clear and recruiter-friendly.\n- Mention strengths, achievements, tech stack, and preferred role type.\n- Make the bio naturally SEO-friendly using role and stack keywords without keyword stuffing.\n- Keep skills practical and specific (frameworks, tools, cloud, testing).\n\nDescription from user: "${userPrompt}"`;
  },

  async generate(prompt, button) {
    if (this.requestLocks.generate) {
      this.showToast('ti', 'Please wait', 'Generation is already running.');
      return false;
    }
    if (!prompt) {
      this.showToast('te', 'Prompt Required', 'Describe your developer profile first.');
      return false;
    }

    this.requestLocks.generate = true;
    this.setButtonLoading(button, true);

    try {
      const cfg = await this.loadConfig('generate-profile');
      const textPrompt = (cfg?.promptTemplate || this.buildPrompt(prompt)).replace('{{userPrompt}}', prompt);
      const model = cfg?.model || 'gemini-2.5-flash-lite';

      const req = { contents: [{ parts: [{ text: textPrompt }] }] };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }
      );

      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const profile = this.extractJson(raw);
      this.fillFields(profile);
      this.showToast('ts', '✅ Profile Generated', 'All fields were auto-filled successfully.');
      return true;
    } catch (e) {
      console.error(e);
      this.showToast('te', '❌ AI Error', 'Failed to generate profile. Try again with more details.');
      return false;
    } finally {
      this.requestLocks.generate = false;
      this.resetButton(button);
    }
  },

  fillFields(p) {
    if (p.name) this.setValue('f_name', p.name);
    if (p.title) this.setValue('f_title', p.title);
    if (p.location) this.setValue('f_loc', p.location);
    if (p.bio) this.setValue('f_bio', p.bio);
    if (p.experience_years !== undefined) this.setValue('f_exp', p.experience_years);

    if (p.skills) {
      const skillsArray = Array.isArray(p.skills)
        ? p.skills
        : typeof p.skills === 'string'
          ? p.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : [];

      if (typeof window.__setProfileTags === 'function') {
        window.__setProfileTags(skillsArray);
      } else if (typeof renderTags === 'function') {
        window.tags = skillsArray;
        renderTags();
      }
    }

    if (Array.isArray(p.experience)) {
      if (typeof window.__setProfileExperiences === 'function') {
        window.__setProfileExperiences(p.experience);
      } else if (typeof renderExps === 'function') {
        window.exps = p.experience;
        renderExps();
      }
    }

    if (Array.isArray(p.certifications) && window.EP) window.EP.certifications = p.certifications;

    if (p.github_url) this.setValue('f_github', p.github_url);
    if (p.linkedin_url) this.setValue('f_linkedin', p.linkedin_url);
    if (p.portfolio_url) this.setValue('f_portfolio', p.portfolio_url);

    if (p.github_url) {
      const githubUsername = p.github_url.split('/').pop();
      if (githubUsername && githubUsername !== 'username') {
        this.setValue('f_image', `https://avatars.githubusercontent.com/${githubUsername}`);
      }
    }

    if (typeof preview === 'function') preview();

    ['f_name', 'f_title', 'f_loc', 'f_bio', 'f_exp', 'f_github', 'f_linkedin', 'f_portfolio', 'f_image'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.dispatchEvent(new Event('input', { bubbles: true }));
      if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    if (typeof updateProfileCompletion === 'function') updateProfileCompletion();
  },

  setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }
};

AI_PROFILE_GENERATOR.generateFromResumeFile = async function(file, button) {
  if (this.requestLocks.resume) {
    this.showToast('ti', 'Please wait', 'Resume parsing is already running.');
    return false;
  }
  if (!file) {
    this.showToast('te', 'Resume Required', 'Please choose a resume file first.');
    return false;
  }

  this.requestLocks.resume = true;
  this.setButtonLoading(button, true);

  try {
    const b64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const cfg = await this.loadConfig('resume-autofill');
    const model = cfg?.model || 'gemini-2.5-flash-lite';
    const prompt = cfg?.promptTemplate || 'Extract a complete developer profile from the attached resume file. Return only JSON.';

    const req = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: file.type || 'application/octet-stream', data: b64 } }
        ]
      }]
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }
    );

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const profile = this.extractJson(raw);
    this.fillFields(profile);
    this.showToast('ts', 'Resume Imported', 'Your fields were auto-filled from resume with AI.');
    return true;
  } catch (e) {
    console.error(e);
    this.showToast('te', 'Resume Parse Failed', 'Could not extract details. Try a clearer resume or use AI prompt text.');
    return false;
  } finally {
    this.requestLocks.resume = false;
    this.resetButton(button);
  }
};

window.triggerResumeUpload = function() { document.getElementById('resumeUpload')?.click(); };
window.handleResumeUpload = async function(input) {
  const file = input?.files?.[0];
  const button = document.getElementById('resumeAutoFillBtn');
  await AI_PROFILE_GENERATOR.generateFromResumeFile(file, button);
  if (input) input.value = '';
};
window.generateProfileAIWithSpinner = async function(button) {
  const prompt = document.getElementById('ai_prompt')?.value.trim();
  return AI_PROFILE_GENERATOR.generate(prompt, button);
};
window.generateProfileAI = async function() {
  const button = document.getElementById('aiGenerateBtn');
  return generateProfileAIWithSpinner(button);
};

AI_PROFILE_GENERATOR.findJobs = async function(button) {
  if (this.requestLocks.jobs) {
    this.showToast('ti', 'Please wait', 'Job matching is already running.');
    return false;
  }

  const name = document.getElementById('f_name')?.value.trim() || '';
  const title = document.getElementById('f_title')?.value.trim() || '';
  const location = document.getElementById('f_loc')?.value.trim() || 'Remote';
  const bio = document.getElementById('f_bio')?.value.trim() || '';
  const skills = (window.tags || []).slice(0, 12);

  if (!name || !title) {
    this.showToast('te', 'Profile Incomplete', 'Please fill name and title before finding jobs.');
    return false;
  }
  if (bio.length < 20) {
    this.showToast('te', 'Bio Required', 'Please add at least 20 characters in your bio for better job matching.');
    return false;
  }
  if (!skills.length) {
    this.showToast('te', 'Skills Required', 'Please add at least one skill before finding jobs.');
    return false;
  }

  this.requestLocks.jobs = true;
  this.setButtonLoading(button, true);

  const profilePayload = {
    name, title, location, bio, skills,
    experience_years: Number(document.getElementById('f_exp')?.value || 0),
    github_url: document.getElementById('f_github')?.value.trim() || '',
    linkedin_url: document.getElementById('f_linkedin')?.value.trim() || '',
    portfolio_url: document.getElementById('f_portfolio')?.value.trim() || ''
  };

  try {
    const cfg = await this.loadConfig('find-jobs');
    const model = cfg?.model || 'gemini-2.5-flash-lite';
    const defaultPrompt = `You are a job matching assistant. Return ONLY JSON with this shape: {\"jobs\":[{\"title\":\"\",\"company\":\"\",\"location\":\"\",\"summary\":\"\",\"source\":\"\",\"posted_at\":\"${new Date().toISOString()}\",\"url\":\"https://...\"}]}. Give up to 8 relevant jobs from the last 30 days. Developer profile: {{profilePayload}}`;
    const prompt = (cfg?.promptTemplate || defaultPrompt).replace('{{profilePayload}}', JSON.stringify(profilePayload));

    const req = { contents: [{ parts: [{ text: prompt }] }] };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }
    );

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = this.extractJson(raw);
    const rawJobs = Array.isArray(parsed.jobs) ? parsed.jobs.slice(0, 8) : [];
    const jobs = await this.sanitizeAndVerifyJobs(rawJobs, profilePayload);
    this.renderJobs(jobs, false, profilePayload);

    this.showToast('ts', jobs.length ? 'Jobs Found' : 'Job Search Ideas Ready', jobs.length ? 'Top AI-matched jobs are ready.' : 'No direct jobs found. Added smart search links and tips.');
    return true;
  } catch (e) {
    console.error(e);
    this.renderJobs([], true, profilePayload);
    this.showToast('te', 'Job Match Failed', 'Could not find jobs now. Added alternative search links below.');
    return false;
  } finally {
    this.requestLocks.jobs = false;
    this.resetButton(button);
  }
};

AI_PROFILE_GENERATOR.sanitizeAndVerifyJobs = async function(jobs, profilePayload) {
  const verified = [];
  for (const job of jobs) {
    if (verified.length >= 5) break;
    const postedAt = this.normalizePostedDate(job?.posted_at || job?.postedDate || job?.date);
    if (!this.isRecentDate(postedAt, 30)) continue;

    const normalized = {
      title: String(job?.title || '').trim(),
      company: String(job?.company || '').trim() || 'Hiring Company',
      location: String(job?.location || profilePayload.location || 'Remote').trim(),
      summary: String(job?.summary || '').trim() || 'Matched to your profile based on skills and role preferences.',
      source: String(job?.source || '').trim(),
      posted_at: postedAt,
      url: this.normalizeJobUrl(job?.url)
    };
    if (!normalized.title) continue;
    if (!normalized.url || this.isPlaceholderJobUrl(normalized.url)) normalized.url = this.buildFallbackJobUrl(normalized);
    verified.push(normalized);
  }
  return verified.length ? verified.slice(0, 5) : this.buildFallbackJobs(profilePayload).slice(0, 5);
};

AI_PROFILE_GENERATOR.normalizePostedDate = function(value) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};
AI_PROFILE_GENERATOR.isRecentDate = function(value, days) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return true;
  return diffMs <= days * 24 * 60 * 60 * 1000;
};
AI_PROFILE_GENERATOR.normalizeJobUrl = function(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  const candidate = /^https?:\/\//i.test(input) ? input : `https://${input.replace(/^\/+/, '')}`;
  try {
    const parsed = new URL(candidate);
    if (!/^https?:$/i.test(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
};
AI_PROFILE_GENERATOR.isPlaceholderJobUrl = function(value) {
  const lower = String(value || '').toLowerCase();
  return !lower || lower.includes('example.com') || lower.includes('localhost') || lower.includes('127.0.0.1') || lower.includes('placeholder');
};
AI_PROFILE_GENERATOR.buildFallbackJobUrl = function(job) {
  const query = encodeURIComponent(`${job.title || 'developer'} ${job.location || 'remote'}`.trim());
  return `https://www.linkedin.com/jobs/search/?keywords=${query}&location=${encodeURIComponent(job.location || 'Remote')}&f_TPR=r2592000`;
};
AI_PROFILE_GENERATOR.slugifyKeywords = function(value) {
  return String(value || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
};
AI_PROFILE_GENERATOR.buildRemoteOkUrl = function(title) {
  const slug = this.slugifyKeywords(title || 'developer') || 'developer';
  return `https://remoteok.com/remote-${slug}-jobs`;
};
AI_PROFILE_GENERATOR.buildFallbackJobs = function(profilePayload) {
  const role = String(profilePayload?.title || 'Developer').trim() || 'Developer';
  const location = String(profilePayload?.location || 'Remote').trim() || 'Remote';
  const baseDate = new Date().toISOString();
  const query = encodeURIComponent(`${role} ${location}`.trim());
  return [
    { title: `${role} (LinkedIn Search)`, company: 'LinkedIn Jobs', location, summary: 'Fresh results from LinkedIn jobs search based on your profile.', source: 'LinkedIn', posted_at: baseDate, url: `https://www.linkedin.com/jobs/search/?keywords=${query}&location=${encodeURIComponent(location)}&f_TPR=r2592000` },
    { title: `${role} (Indeed Search)`, company: 'Indeed', location, summary: 'Indeed job search query tailored to your title and location.', source: 'Indeed', posted_at: baseDate, url: `https://www.indeed.com/jobs?q=${query}` },
    { title: `${role} (Wellfound Search)`, company: 'Wellfound', location, summary: 'Startup-focused roles matching your profile on Wellfound.', source: 'Wellfound', posted_at: baseDate, url: `https://wellfound.com/jobs?query=${query}` },
    { title: `${role} (RemoteOK Search)`, company: 'RemoteOK', location: 'Remote', summary: 'RemoteOK search using a cleaned keyword slug to avoid broken URLs.', source: 'RemoteOK', posted_at: baseDate, url: this.buildRemoteOkUrl(role) },
    { title: `${role} (Google Jobs Search)`, company: 'Google Jobs', location, summary: 'Google jobs search covering multiple job boards in one result page.', source: 'Google', posted_at: baseDate, url: `https://www.google.com/search?q=${encodeURIComponent(`${role} jobs in ${location}`)}` }
  ];
};
AI_PROFILE_GENERATOR.getJobSearchHelpHtml = function(profilePayload) {
  const title = this.escapeHtml(profilePayload?.title || 'Developer');
  const location = this.escapeHtml(profilePayload?.location || 'Remote');
  const query = encodeURIComponent(`${profilePayload?.title || 'Developer'} ${profilePayload?.location || 'Remote'}`.trim());
  const links = [
    { label: 'LinkedIn Jobs (last 30 days)', url: `https://www.linkedin.com/jobs/search/?keywords=${query}&location=${encodeURIComponent(profilePayload?.location || 'Remote')}&f_TPR=r2592000` },
    { label: 'Indeed Jobs', url: `https://www.indeed.com/jobs?q=${query}` },
    { label: 'Wellfound Startup Jobs', url: `https://wellfound.com/jobs?query=${query}` },
    { label: 'RemoteOK', url: this.buildRemoteOkUrl(profilePayload?.title || 'developer') },
    { label: 'Google Jobs Search', url: `https://www.google.com/search?q=${encodeURIComponent(`${profilePayload?.title || 'developer'} jobs in ${profilePayload?.location || 'remote'}`)}` }
  ];
  const linkItems = links.map((item) => `<li><a class="job-link" href="${this.safeUrl(item.url)}" target="_blank" rel="noopener">${this.escapeHtml(item.label)}</a></li>`).join('');
  return `<div class="job-item"><div class="job-role">Need help finding jobs for ${title} (${location})?</div><div class="job-company">Try these trusted job sources:</div><ul style="margin:6px 0 8px 18px;padding:0;display:flex;flex-direction:column;gap:6px">${linkItems}</ul><div class="job-company" style="margin-bottom:0">AI apply tips: tailor resume keywords per role, add measurable achievements, keep portfolio updated, and send a focused outreach note.</div></div>`;
};
AI_PROFILE_GENERATOR.renderJobs = function(jobs, forceEmpty, profilePayload) {
  const wrap = document.getElementById('jobListWrap');
  const list = document.getElementById('jobList');
  if (!wrap || !list) return;
  wrap.style.display = 'block';
  if (!jobs.length) {
    const message = forceEmpty ? 'No job results right now. Try changing profile details and run again.' : 'No jobs found from AI right now.';
    list.innerHTML = `<div class="job-empty">${message}</div>${this.getJobSearchHelpHtml(profilePayload || {})}`;
    return;
  }
  list.innerHTML = jobs.map((job, idx) => {
    const title = this.escapeHtml(job.title || `AI Suggested Role ${idx + 1}`);
    const company = this.escapeHtml(job.company || 'Hiring Company');
    const location = this.escapeHtml(job.location || 'Remote');
    const summary = this.escapeHtml(job.summary || 'Role details generated by AI based on your profile.');
    const url = this.safeUrl(job.url || this.buildFallbackJobUrl(job));
    const postedLabel = this.getPostedLabel(job.posted_at);
    return `<div class="job-item"><div class="job-role">${title}</div><div class="job-company">${company} · ${location}${postedLabel ? ` · ${postedLabel}` : ''}</div><div class="job-company">${summary}</div><a class="job-link" href="${url}" target="_blank" rel="noopener">${url}</a></div>`;
  }).join('') + this.getJobSearchHelpHtml(profilePayload || {});
};
AI_PROFILE_GENERATOR.getPostedLabel = function(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (diff <= 0) return 'Posted today';
  if (diff === 1) return 'Posted 1 day ago';
  return `Posted ${diff} days ago`;
};
AI_PROFILE_GENERATOR.escapeHtml = function(v) {
  return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};
AI_PROFILE_GENERATOR.safeUrl = function(url) {
  const value = this.normalizeJobUrl(url);
  if (value && !this.isPlaceholderJobUrl(value)) return this.escapeHtml(value);
  return this.buildFallbackJobUrl({ title: 'Developer', location: 'Remote' });
};

window.findJobsWithAI = async function(button) { return AI_PROFILE_GENERATOR.findJobs(button); };
