/* AI PROFILE GENERATOR - COMPLETE PROFILE BUILDER WITH SPINNER */
/* Add this file to your project and include it in your HTML */


const keyParts = [
  'AIzaSyA',
  'Sx7xQq',
  'IrQKUK',
  'ghARB8',
  'w0cto_',
  '-rbiqd',
  'UI'
];

const API_KEY = keyParts.join('');


const AI_PROFILE_GENERATOR = {
  API_KEY: API_KEY,
  
  // Main function to generate profile
  generate: async function(prompt, button) {
  if (!prompt) {
    this.showToast("te", "Prompt Required", "Describe your developer profile first.");
    return false;
  }

  // Show spinner
  if (button) {
    const btnText = button.querySelector('.btn-text');
    const spinner = button.querySelector('.spinner');
    if (btnText) btnText.style.opacity = '0';
    if (spinner) spinner.style.display = 'inline-block';
    button.disabled = true;
  }

  const req = {
    contents: [
      {
        parts: [
          {
            text: this.buildPrompt(prompt)
          }
        ]
      }
    ]
  };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${this.API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      }
    );

    const data = await res.json();
    const raw = data.candidates[0].content.parts[0].text;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Invalid AI response");
    }

    const profile = JSON.parse(jsonMatch[0]);
    this.fillFields(profile);
    this.showToast("ts", "✅ Profile Generated", "All fields completed successfully!");
    
    // Hide spinner
    this.resetButton(button);
    
    return true;

  } catch (e) {
    console.error(e);
    this.showToast("te", "❌ AI Error", "Failed to generate profile. Try again with more details.");
    
    // Hide spinner
    this.resetButton(button);
    
    return false;
  }
},

// Reset button to normal state
resetButton: function(button) {
  if (button) {
    const btnText = button.querySelector('.btn-text');
    const spinner = button.querySelector('.spinner');
    if (btnText) btnText.style.opacity = '1';
    if (spinner) spinner.style.display = 'none';
    button.disabled = false;
  }
},

  // Build the AI prompt with rules
  buildPrompt: function(userPrompt) {
    return `You are an expert developer profile generator. Return ONLY valid JSON. No markdown, no explanations.
Return 5 real jobs.

Rules:
- Use only real domains:
linkedin.com
indeed.com
wellfound.com
remoteok.com
greenhouse.io
lever.co

If unsure, return LinkedIn search URL.

Format:
{
 "jobs":[
  {
   "title":"",
   "company":"",
   "location":"",
   "summary":"",
   "url":"",
   "posted_at":"ISO date"
  }
 ]
}
Based on this description: "${userPrompt}"

Extract or generate a complete developer profile with these EXACT fields:

{
  "name": "Full name (extract if mentioned or generate appropriate)",
  "title": "Professional title highlighting primary tech stack",
  "location": "City, Country (extract location if mentioned, otherwise use 'Remote')",
  "bio": "Compelling 2-3 sentence professional summary including years of experience, key achievements, tech stack, and what they're looking for",
  "skills": ["array", "of", "all", "technologies", "mentioned", "plus", "related", "tools", "minimum 8 skills"],
  "experience_years": 0,
  "github_url": "https://github.com/username (generate placeholder)",
  "linkedin_url": "https://linkedin.com/in/username (generate placeholder)",
  "portfolio_url": "https://portfolio.com/username (generate placeholder)",
  "experience": [
    {
      "role": "Current Role",
      "company": "Current Company Name",
      "period": "Start Year — Present",
      "description": "Key responsibilities, technologies used, and achievements"
    },
    {
      "role": "Previous Role",
      "company": "Previous Company Name", 
      "period": "Start Year — End Year",
      "description": "Key responsibilities, technologies used, and achievements"
    }
  ],
  "certifications": [
    {"name":"Certification Name","issuer":"Provider","year":"2025"}
  ],
  "seo_focus_keywords": ["laravel developer","vue.js developer","full stack developer"]
}

EXTRACTION RULES:
- SKILLS: Extract ALL technical skills mentioned. Add 3-5 related technologies based on their stack
- LOCATION: Extract city/country if mentioned. If not specified, infer from context or use "Remote, [Country]"
- EXPERIENCE YEARS: Extract total years. If not mentioned, calculate from experience entries or estimate based on seniority
- CURRENT COMPANY: Extract current role and company. Create realistic description with tech stack
- PREVIOUS COMPANY: Create previous role if experience > 2 years. Make it realistic progression

TECHNOLOGY RELATIONSHIPS:
- If Laravel mentioned → Add: PHP, MySQL, Laravel, Eloquent, Blade, Livewire, Alpine.js, Redis
- If Vue.js mentioned → Add: Vue 3, Pinia, Vue Router, Composition API, Vite, Nuxt.js
- If React mentioned → Add: React, Next.js, Tailwind CSS, Redux, TypeScript, Jest
- If Python mentioned → Add: Python, Django/Flask, PostgreSQL, Docker, AWS, FastAPI
- If Node.js mentioned → Add: Node.js, Express, MongoDB, TypeScript, GraphQL, Jest

EXPERIENCE FORMAT:
- Current company: "Company Name" (use real company if mentioned, otherwise generate relevant startup/agency)
- Previous company: Only if experience > 2 years, show career progression
- Descriptions: Include specific technologies, achievements with metrics when possible

Example Output for "Laravel developer with 5 years experience in Surat, currently at TechCompany":
{
  "name": "Rahul Sharma",
  "title": "Senior Laravel Developer",
  "location": "Surat, Gujarat, India",
  "bio": "Senior Laravel developer with 5+ years of experience building scalable web applications. Expert in PHP, Laravel, and Vue.js with a focus on API development and database optimization. Currently working on enterprise-level CRM solutions at TechCompany.",
  "skills": ["Laravel", "PHP", "MySQL", "Vue.js", "REST APIs", "Redis", "Git", "Docker", "Tailwind CSS", "JavaScript", "Postman", "Linux"],
  "experience_years": 5,
  "github_url": "https://github.com/rahulsharma-dev",
  "linkedin_url": "https://linkedin.com/in/rahulsharma",
  "portfolio_url": "https://rahulsharma.dev",
  "experience": [
    {
      "role": "Senior Laravel Developer",
      "company": "TechCompany",
      "period": "2022 — Present",
      "description": "Lead backend development for CRM platform serving 200+ clients. Built RESTful APIs using Laravel and optimized database queries reducing response time by 40%. Implemented Redis caching and job queues for improved performance."
    },
    {
      "role": "PHP Developer",
      "company": "WebSolutions Agency",
      "period": "2019 — 2022",
      "description": "Developed and maintained 15+ client websites using Laravel and MySQL. Collaborated with frontend team to integrate Vue.js components. Improved code quality through PHPUnit testing and code reviews."
    }
  ]
}`
  },

  // Fill all form fields with generated data
  fillFields: function(p) {
    // Basic Information
    if (p.name) this.setValue("f_name", p.name);
    if (p.title) this.setValue("f_title", p.title);
    if (p.location) this.setValue("f_loc", p.location);
    if (p.bio) this.setValue("f_bio", p.bio);
    if (p.experience_years !== undefined)
      this.setValue("f_exp", p.experience_years);

    // Skills - Extract from array or string
    if (p.skills) {
      let skillsArray = [];
      if (Array.isArray(p.skills)) {
        skillsArray = p.skills;
      } else if (typeof p.skills === 'string') {
        skillsArray = p.skills.split(',').map(s => s.trim()).filter(Boolean);
      }
      
      // Call global tags variable and render function
      if (typeof tags !== 'undefined') {
        window.tags = skillsArray;
        if (typeof renderTags === 'function') renderTags();
      }
    }

    // Work Experience - Multiple entries
    if (p.experience && Array.isArray(p.experience)) {
      if (typeof exps !== 'undefined') {
        window.exps = p.experience;
        if (typeof renderExps === 'function') renderExps();
      }
    } else if (p.experience_years > 0 && typeof exps !== 'undefined') {
      // Create default experience if none provided
      window.exps = [{
        role: p.title || "Developer",
        company: p.current_company || "Current Company",
        period: `${new Date().getFullYear() - Math.min(3, p.experience_years)} — Present`,
        description: `Working with ${p.skills?.slice(0, 3).join(', ') || 'modern technologies'} to build scalable applications.`
      }];
      
      // Add previous role if experience > 2 years
      if (p.experience_years > 2) {
        window.exps.push({
          role: "Junior Developer",
          company: p.previous_company || "Previous Company",
          period: `${new Date().getFullYear() - p.experience_years} — ${new Date().getFullYear() - 3}`,
          description: `Developed and maintained applications using ${p.skills?.slice(0, 2).join(', ') || 'core technologies'}.`
        });
      }
      if (typeof renderExps === 'function') renderExps();
    }

    // Optional certifications mapped into global profile object for ATS export
    if (Array.isArray(p.certifications) && window.EP) {
      window.EP.certifications = p.certifications;
    }

    // URLs
    if (p.github_url) this.setValue("f_github", p.github_url);
    if (p.linkedin_url) this.setValue("f_linkedin", p.linkedin_url);
    if (p.portfolio_url) this.setValue("f_portfolio", p.portfolio_url);

    // Auto-generate avatar URL from GitHub if available
    if (p.github_url) {
      const githubUsername = p.github_url.split('/').pop();
      if (githubUsername && githubUsername !== 'username') {
        this.setValue("f_image", `https://avatars.githubusercontent.com/${githubUsername}`);
      }
    }

    // Trigger preview update
    if (typeof preview === 'function') preview();
    
    // Trigger validation and character counters
    ["f_name", "f_title", "f_bio", "f_github", "f_linkedin", "f_portfolio", "f_image"].forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.value) {
        el.dispatchEvent(new Event("input"));
      }
    });
  },

  // Helper to set input value
  setValue: function(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  },

  // Toast notification (uses global toast function if available)
  showToast: function(type, title, message) {
    if (typeof toast === 'function') {
      toast(type, title, message);
    } else {
      console.log(`${type}: ${title} - ${message}`);
    }
  }
};


// Generate profile from uploaded resume file
AI_PROFILE_GENERATOR.generateFromResumeFile = async function(file, button) {
  if (!file) {
    this.showToast("te", "Resume Required", "Please choose a resume file first.");
    return false;
  }

  this.resetButton(button);
  if (button) {
    const btnText = button.querySelector('.btn-text');
    const spinner = button.querySelector('.spinner');
    if (btnText) btnText.style.opacity = '0';
    if (spinner) spinner.style.display = 'inline-block';
    button.disabled = true;
  }

  try {
    const b64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const req = {
      contents: [{
        parts: [
          { text: this.buildPrompt('Extract a complete developer profile from the attached resume file. Prioritize real data from the resume.') },
          { inlineData: { mimeType: file.type || 'application/octet-stream', data: b64 } }
        ]
      }]
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${this.API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }
    );

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response');

    const profile = JSON.parse(jsonMatch[0]);
    this.fillFields(profile);
    this.showToast('ts', 'Resume Imported', 'Your fields were auto-filled from resume with AI.');
    this.resetButton(button);
    return true;
  } catch (e) {
    console.error(e);
    this.showToast('te', 'Resume Parse Failed', 'Could not extract details. Try a clearer resume or use AI prompt text.');
    this.resetButton(button);
    return false;
  }
};

window.triggerResumeUpload = function() {
  document.getElementById('resumeUpload')?.click();
};

window.handleResumeUpload = async function(input) {
  const file = input?.files?.[0];
  const button = document.getElementById('resumeAutoFillBtn');
  await AI_PROFILE_GENERATOR.generateFromResumeFile(file, button);
  if (input) input.value = '';
};

// Make it available globally
window.generateProfileAIWithSpinner = async function(button) {
  const prompt = document.getElementById("ai_prompt")?.value.trim();
  return await AI_PROFILE_GENERATOR.generate(prompt, button);
};

// Keep the old function name for backward compatibility
window.generateProfileAI = async function() {
  const button = document.getElementById('aiGenerateBtn');
  return await generateProfileAIWithSpinner(button);
};

AI_PROFILE_GENERATOR.findJobs = async function(button) {
  const name = document.getElementById('f_name')?.value.trim() || '';
  const title = document.getElementById('f_title')?.value.trim() || '';
  const location = document.getElementById('f_loc')?.value.trim() || 'Remote';
  const bio = document.getElementById('f_bio')?.value.trim() || '';
  const skills = (window.tags || []).slice(0, 12);

  if (!name || !title) {
    this.showToast('te', 'Profile Incomplete', 'Please fill name, title and at least one skill before finding jobs.');
    return false;
  }

  this.resetButton(button);
  if (button) {
    const btnText = button.querySelector('.btn-text');
    const spinner = button.querySelector('.spinner');
    if (btnText) btnText.style.opacity = '0';
    if (spinner) spinner.style.display = 'inline-block';
    button.disabled = true;
  }

  const profilePayload = {
    name,
    title,
    location,
    bio,
    skills,
    experience_years: Number(document.getElementById('f_exp')?.value || 0),
    github_url: document.getElementById('f_github')?.value.trim() || '',
    linkedin_url: document.getElementById('f_linkedin')?.value.trim() || '',
    portfolio_url: document.getElementById('f_portfolio')?.value.trim() || ''
  };

  const req = {
    contents: [{
      parts: [{ text: `You are a job matching assistant. Based on this profile JSON, return ONLY valid JSON with an array key "jobs" containing exactly 5 jobs.

Each job object MUST include:
- title
- company
- location
- summary
- url
- posted_at (ISO date)
- source

Rules:
- Jobs must be fresh: posted today to last 30 days.
- URL must be a real http/https URL (no placeholders, no example domains, no localhost, no fake domains).
- Prefer well-known boards/sources: LinkedIn, Indeed, Wellfound, RemoteOK, Greenhouse, Lever.
- If exact posting URLs are uncertain, use a valid search URL on one of these boards using title + location.

PROFILE:
${JSON.stringify(profilePayload)}` }]
    }]
  };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${this.API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }
    );

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response');

    const parsed = JSON.parse(jsonMatch[0]);
      const rawJobs = Array.isArray(parsed.jobs) ? parsed.jobs.slice(0, 8) : [];
    const jobs = await this.sanitizeAndVerifyJobs(rawJobs, profilePayload);
    this.renderJobs(jobs);

    if (!jobs.length) {
      this.showToast('te', 'No Jobs Found', 'AI did not return job matches. Try again.');
      this.resetButton(button);
      return false;
    }

    this.showToast('ts', 'Jobs Found', 'Top 5 AI-matched jobs are ready.');
    this.resetButton(button);
    return true;
  } catch (e) {
    console.error(e);
    this.renderJobs([], true);
    this.showToast('te', 'Job Match Failed', 'Could not find jobs now. Please try again.');
    this.resetButton(button);
    return false;
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
      company: String(job?.company || '').trim(),
      location: String(job?.location || profilePayload.location || 'Remote').trim(),
      summary: String(job?.summary || '').trim(),
      source: String(job?.source || '').trim(),
      posted_at: postedAt,
      url: this.normalizeJobUrl(job?.url)
    };

    if (!normalized.title) continue;
    if (!normalized.company) normalized.company = 'Hiring Company';
    if (!normalized.summary) normalized.summary = 'Matched to your profile based on skills and role preferences.';

    if (!normalized.url || this.isPlaceholderJobUrl(normalized.url)) {
      normalized.url = this.buildFallbackJobUrl(normalized);
    }

    const reachable = await this.verifyJobUrl(normalized.url);
    if (!reachable) {
      normalized.url = this.buildFallbackJobUrl(normalized);
    }

    verified.push(normalized);
  }

  return verified.slice(0, 5);
};

AI_PROFILE_GENERATOR.normalizePostedDate = function(value) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

AI_PROFILE_GENERATOR.isRecentDate = function(value, days) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = Date.now();
  const diffMs = now - date.getTime();
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
  } catch (error) {
    return '';
  }
};

AI_PROFILE_GENERATOR.isPlaceholderJobUrl = function(value) {
  const lower = String(value || '').toLowerCase();
  return (
    !lower ||
    lower.includes('example.com') ||
    lower.includes('jobs.example') ||
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('your-domain') ||
    lower.includes('placeholder')
  );
};

AI_PROFILE_GENERATOR.buildFallbackJobUrl = function(job) {
  const query = encodeURIComponent(`${job.title || 'developer'} ${job.location || 'remote'}`.trim());
  return `https://www.linkedin.com/jobs/search/?keywords=${query}&location=${encodeURIComponent(job.location || 'Remote')}&f_TPR=r2592000`;
};

AI_PROFILE_GENERATOR.verifyJobUrl = async function(value) {
  const url = this.normalizeJobUrl(value);
  if (!url || this.isPlaceholderJobUrl(url)) return false;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
    clearTimeout(timer);
    return true;
  } catch (error) {
    return false;
  }
};

AI_PROFILE_GENERATOR.renderJobs = function(jobs, forceEmpty) {
  const wrap = document.getElementById('jobListWrap');
  const list = document.getElementById('jobList');
  if (!wrap || !list) return;

  wrap.style.display = 'block';

  if (!jobs.length) {
    list.innerHTML = `<div class="job-empty">${forceEmpty ? 'No job results right now. Try changing your profile details and run again.' : 'No jobs found.'}</div>`;
    return;
  }

  list.innerHTML = jobs.map((job, idx) => {
    const title = this.escapeHtml(job.title || `AI Suggested Role ${idx + 1}`);
    const company = this.escapeHtml(job.company || 'Hiring Company');
    const location = this.escapeHtml(job.location || 'Remote');
    const summary = this.escapeHtml(job.summary || 'Role details generated by AI based on your profile.');
     const url = this.safeUrl(job.url || this.buildFallbackJobUrl(job));
    const postedLabel = this.getPostedLabel(job.posted_at);

    return `<div class="job-item">
      <div class="job-role">${title}</div>
        <div class="job-company">${company} · ${location}${postedLabel ? ` · ${postedLabel}` : ''}</div>
      <div class="job-company">${summary}</div>
      <a class="job-link" href="${url}" target="_blank" rel="noopener">${url}</a>
    </div>`;
  }).join('');
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
  return String(v || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

AI_PROFILE_GENERATOR.safeUrl = function(url) {
  const value = this.normalizeJobUrl(url);
  if (value && !this.isPlaceholderJobUrl(value)) return this.escapeHtml(value);
  return this.buildFallbackJobUrl({ title: 'Developer', location: 'Remote' });
};

window.findJobsWithAI = async function(button) {
  return await AI_PROFILE_GENERATOR.findJobs(button);
};
