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
return `You are an expert developer profile writer for a developer hiring platform.

Return ONLY valid JSON (no markdown, no explanations).

Schema:
{
"name": "",
"title": "",
"location": "",
"bio": "",
"skills": [],
"experience_years": 0,
"github_url": "",
"linkedin_url": "",
"portfolio_url": "",
"experience": [{"role":"","company":"","period":"","description":""}],
"certifications": [{"name":"","issuer":"","year":""}],
"seo_focus_keywords": []
}

BIO RULES:
- Write a strong professional developer bio.
- 120–200 words.
- Mention technologies, experience, projects, and type of work.
- Make it recruiter friendly.
- Do NOT make it generic.
- Write in natural professional tone.

SKILLS RULES:
- 8–12 real technical skills.

EXPERIENCE:
- Use realistic descriptions from user input.

User description:
"${userPrompt}"
`;
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
   if (p.name && !document.getElementById('f_name')?.value.trim()) {
  this.setValue('f_name', p.name);
}
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

AI_PROFILE_GENERATOR.generateFromResumeFile = async function(file, button){

  if(this.requestLocks.resume){
    this.showToast('ti','Please wait','Resume parsing already running.');
    return false;
  }

  if(!file){
    this.showToast('te','Resume Required','Please choose a file.');
    return false;
  }

  /* block video */
  if(file.type.startsWith("video/")){
    this.showToast('te','Invalid File','Video files not allowed.');
    return false;
  }

  this.requestLocks.resume = true;
  this.setButtonLoading(button,true);

  try{

    let resumeText = "";

    const ext = file.name.split('.').pop().toLowerCase();

    /* TXT / MD / JSON / CSV */
    if(ext === "txt" || ext === "md" || ext === "json" || ext === "csv"){
      resumeText = await file.text();
    }

    /* PDF */
    else if(ext === "pdf"){

      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(new Uint8Array(buffer)).promise;

      for(let i=1;i<=pdf.numPages;i++){

        const page = await pdf.getPage(i);
        const txt = await page.getTextContent();

        const pageText = txt.items.map(item=>item.str).join(" ");
        resumeText += pageText + "\n\n";

      }

    }

    /* DOCX */
    else if(ext === "docx"){

      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({arrayBuffer:buffer});

      resumeText = result.value;

    }

    /* DOC fallback */
   else if(ext === "doc"){

  const buffer = await file.arrayBuffer();

  /* try docx parser first */
  try{
    const result = await mammoth.extractRawText({arrayBuffer:buffer});
    resumeText = result.value;
  }
  catch{

    /* fallback: binary text extraction */
    const decoder = new TextDecoder("latin1");
    const raw = decoder.decode(buffer);

    resumeText = raw
      .replace(/[^\x20-\x7E\n]/g," ")
      .replace(/\s+/g," ")
      .trim();

  }

}


    else{
      this.showToast('te','Unsupported file','Upload PDF, DOCX, TXT etc.');
      return false;
    }

    if(!resumeText || resumeText.length < 50){
      this.showToast('te','Resume Read Failed','File text could not be extracted.');
      return false;
    }

    /* limit text for AI cost */
    resumeText = resumeText.slice(0,2500);

    const cfg = await this.loadConfig('resume-autofill');

   const basePrompt =
cfg?.promptTemplate ||
`You are an expert resume parser.

Read the resume text and generate a complete developer profile.

Return ONLY JSON using this schema:
{
"name": "",
"title": "",
"location": "",
"bio": "",
"skills": [],
"experience_years": 0,
"github_url": "",
"linkedin_url": "",
"portfolio_url": "",
"experience": [{"role":"","company":"","period":"","description":""}],
"certifications": [{"name":"","issuer":"","year":""}],
"seo_focus_keywords": []
}

Rules:
- Leave "name" empty.
- Bio must be 120–200 words.
- Bio should summarize the developer's experience, technologies, and projects.
- Mention key tech stacks.
- Make it recruiter friendly.
- Extract real experience details from the resume.

Skills:
- Extract top technical skills from resume.

Experience:
- Convert resume work history into readable descriptions.
`;


    const prompt = `${basePrompt}

RESUME TEXT:
${resumeText}`;

    const raw = await this.callAi(prompt);

    const profile = this.extractJson(raw);

    this.fillFields(profile);

    this.showToast(
      'ts',
      'Resume Imported',
      'Profile fields auto-filled successfully.'
    );

    return true;

  }
  catch(e){

    console.error(e);

    this.showToast(
      'te',
      'Resume Parse Failed',
      e?.message || 'AI extraction failed.'
    );

    return false;

  }
  finally{

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
