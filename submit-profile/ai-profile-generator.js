/* AI PROFILE GENERATOR - FAST PROFILE BUILDER */

const AI_PROFILE_GENERATOR = {
  API_URL: 'https://ai.buldel.com/cloud-ai',
  requestLocks: {
    generate: false,
    resume: false
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
    } catch {
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
  },

  extractJson(rawText) {
    const raw = String(rawText || '');
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response JSON');
    return JSON.parse(jsonMatch[0]);
  },

  getAiContent(data) {
    return String(data?.choices?.[0]?.message?.content || '').trim();
  },

  async callAi(prompt) {
    const res = await fetch(this.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || 'AI request failed.');
    }
    const content = this.getAiContent(data);
    if (!content) throw new Error('AI response was empty.');
    return content;
  },

  buildPrompt(userPrompt) {
    return `You are an expert developer profile generator. Return ONLY valid JSON (no markdown, no extra text).\n\nUse this exact schema:\n{\n  "name": "",\n  "title": "",\n  "location": "",\n  "bio": "",\n  "skills": [],\n  "experience_years": 0,\n  "github_url": "",\n  "linkedin_url": "",\n  "portfolio_url": "",\n  "experience": [{"role":"","company":"","period":"","description":""}],\n  "certifications": [{"name":"","issuer":"","year":""}],\n  "seo_focus_keywords": []\n}\n\nGuidelines:\n- Bio should be 80-140 words and recruiter-friendly.\n- Keep skills practical and specific.\n- Experience should be realistic and readable.\n\nUser input: "${userPrompt}"`;
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
      const raw = await this.callAi(textPrompt);
      const profile = this.extractJson(raw);
      this.fillFields(profile);
      this.showToast('ts', '✅ Profile Generated', 'All fields were auto-filled successfully.');
      return true;
    } catch (e) {
      console.error(e);
      this.showToast('te', '❌ AI Error', e?.message || 'Failed to generate profile.');
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
      }
    }

    if (Array.isArray(p.experience) && typeof window.__setProfileExperiences === 'function') {
      window.__setProfileExperiences(p.experience);
    }

    if (Array.isArray(p.certifications) && window.EP) window.EP.certifications = p.certifications;

    if (p.github_url) this.setValue('f_github', p.github_url);
    if (p.linkedin_url) this.setValue('f_linkedin', p.linkedin_url);
    if (p.portfolio_url) this.setValue('f_portfolio', p.portfolio_url);

    if (typeof preview === 'function') preview();

    ['f_name', 'f_title', 'f_loc', 'f_bio', 'f_exp', 'f_github', 'f_linkedin', 'f_portfolio', 'f_image'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
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
    const canReadText = /^text\//.test(file.type) || /\.(txt|md|json|csv)$/i.test(file.name || '');
    if (!canReadText) {
      this.showToast('ti', 'Quick Tip', 'For PDF/DOC, paste details in AI box for fastest results.');
      return false;
    }

    const resumeText = await file.text();
    const cfg = await this.loadConfig('resume-autofill');
    const basePrompt = cfg?.promptTemplate || 'Extract a complete developer profile from this resume text. Return only JSON.';
    const prompt = `${basePrompt}\n\nRESUME TEXT:\n${resumeText.slice(0, 20000)}`;

    const raw = await this.callAi(prompt);
    const profile = this.extractJson(raw);
    this.fillFields(profile);
    this.showToast('ts', 'Resume Imported', 'Your fields were auto-filled from resume text with AI.');
    return true;
  } catch (e) {
    console.error(e);
    this.showToast('te', 'Resume Parse Failed', e?.message || 'Could not extract details. Use AI prompt text instead.');
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
