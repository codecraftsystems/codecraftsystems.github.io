/* AI PROFILE GENERATOR - CODECRAFT SYSTEMS */

const AI_PROFILE_GENERATOR = {

  API_URL: 'https://ai.buldel.com/cloud-ai',

  requestLocks: {
    generate: false,
    resume: false
  },

  configCache: {},


  /* ---------------- CONFIG LOADER ---------------- */

  async loadConfig(name){

    if(this.configCache[name]) return this.configCache[name];

    try{
      const res = await fetch(`./config/${name}.json`,{cache:'no-store'});
      if(!res.ok) throw new Error("config load failed");

      const data = await res.json();
      this.configCache[name] = data;

      return data;

    }catch{
      return null;
    }

  },


  /* ---------------- BUTTON STATE ---------------- */

  setButtonLoading(button,loading){

    if(!button) return;

    const text = button.querySelector(".btn-text");
    const spinner = button.querySelector(".spinner");

    if(text) text.style.opacity = loading ? "0" : "1";
    if(spinner) spinner.style.display = loading ? "inline-block" : "none";

    button.disabled = loading;

  },

  resetButton(button){
    this.setButtonLoading(button,false);
  },


  /* ---------------- TOAST ---------------- */

  showToast(type,title,msg){

    if(typeof toast === "function"){
      toast(type,title,msg);
    }

  },


  /* ---------------- JSON EXTRACT ---------------- */

  extractJson(raw){

    const txt = String(raw || "");

    const match = txt.match(/\{[\s\S]*\}/);

    if(!match) throw new Error("AI returned invalid JSON");

    return JSON.parse(match[0]);

  },


  getAiContent(data){

    return String(
      data?.choices?.[0]?.message?.content || ""
    ).trim();

  },


  /* ---------------- AI CALL ---------------- */

  async callAi(prompt){

    const res = await fetch(this.API_URL,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({prompt})
    });

    const data = await res.json();

    if(!res.ok){
      throw new Error(data?.error?.message || "AI request failed");
    }

    const content = this.getAiContent(data);

    if(!content){
      throw new Error("AI response empty");
    }

    return content;

  },


  /* ---------------- PROMPT BUILDER ---------------- */

  buildPrompt(userPrompt){

return `You are an expert developer profile writer.

Return ONLY valid JSON.

Schema:

{
"name":"",
"title":"",
"location":"",
"bio":"",
"skills":[],
"experience_years":0,
"github_url":"",
"linkedin_url":"",
"portfolio_url":"",
"experience":[
{
"role":"",
"company":"",
"period":"",
"description":""
}
],
"certifications":[{"name":"","issuer":"","year":""}],
"seo_focus_keywords":[]
}

Rules:

- Bio 1000-2000 words
- Extract real technologies
- Experience must use role, company, period, description
- Do NOT use title or start_date fields

User description:

"${userPrompt}"

`;

  },


  /* ---------------- PROFILE GENERATE ---------------- */

  async generate(prompt,button){

    if(this.requestLocks.generate){
      this.showToast("ti","Please wait","Generation already running");
      return;
    }

    if(!prompt){
      this.showToast("te","Prompt required","Describe yourself first");
      return;
    }

    this.requestLocks.generate = true;
    this.setButtonLoading(button,true);

    try{

      const cfg = await this.loadConfig("generate-profile");


      const today = new Date();
      const currentDate = today.toISOString().split('T')[0];
      const currentYear = today.getFullYear();


      const textPrompt =
  (cfg?.promptTemplate || this.buildPrompt(prompt))
    .replace("{{userPrompt}}", prompt)
    .replace("{{currentDate}}", currentDate)
    .replace("{{currentYear}}", currentYear);

      const raw = await this.callAi(textPrompt);

      const profile = this.extractJson(raw);

      this.fillFields(profile);

      this.showToast(
        "ts",
        "Profile Generated",
        "Fields auto filled"
      );

    }catch(e){

      console.error(e);

      this.showToast(
        "te",
        "AI Error",
        e.message || "Generation failed"
      );

    }
    finally{

      this.requestLocks.generate = false;
      this.resetButton(button);

    }

  },


  /* ---------------- FIELD FILL ---------------- */

  fillFields(p){

    if(p.name && !document.getElementById("f_name")?.value.trim()){
      this.setValue("f_name",p.name);
    }

    if(p.title) this.setValue("f_title",p.title);
    if(p.location) this.setValue("f_loc",p.location);
    if(p.bio) this.setValue("f_bio",p.bio);
    if(p.experience_years !== undefined)
      this.setValue("f_exp",p.experience_years);


    /* SKILLS */

    if(p.skills){

      const arr = Array.isArray(p.skills)
        ? p.skills
        : p.skills.split(",").map(s=>s.trim());

      if(typeof window.__setProfileTags === "function"){
        window.__setProfileTags(arr);
      }

    }


    /* EXPERIENCE NORMALIZATION */

    if(Array.isArray(p.experience) &&
       typeof window.__setProfileExperiences === "function"){

      const normalized = p.experience.map(e=>({

        role: e.role || e.title || "",

        company: e.company || "",

        period:
          e.period ||
          ((e.start_date || "") +
          (e.end_date ? " — " + e.end_date : "")),

        description:
          e.description ||
          (Array.isArray(e.responsibilities)
            ? e.responsibilities.join(", ")
            : "")

      }));

      window.__setProfileExperiences(normalized);

    }


    /* LINKS */

    if(p.github_url) this.setValue("f_github",p.github_url);
    if(p.linkedin_url) this.setValue("f_linkedin",p.linkedin_url);
    if(p.portfolio_url) this.setValue("f_portfolio",p.portfolio_url);


    if(typeof preview === "function") preview();


    if(typeof updateProfileCompletion === "function")
      updateProfileCompletion();

  },


  setValue(id,val){

    const el = document.getElementById(id);

    if(el) el.value = val;

  }

};



/* ---------------- RESUME PARSER ---------------- */

AI_PROFILE_GENERATOR.generateFromResumeFile =
async function(file,button){

  if(this.requestLocks.resume){
    this.showToast("ti","Please wait","Resume parsing running");
    return;
  }

  if(!file){
    this.showToast("te","Resume required","Select a file");
    return;
  }

  this.requestLocks.resume = true;
  this.setButtonLoading(button,true);

  try{

    let text = "";

    const ext = file.name.split(".").pop().toLowerCase();


    /* TXT */

    if(["txt","md","csv","json"].includes(ext)){

      text = await file.text();

    }


    /* PDF */

    else if(ext==="pdf"){

      const buf = await file.arrayBuffer();

      const pdf = await pdfjsLib
        .getDocument(new Uint8Array(buf))
        .promise;

      for(let i=1;i<=pdf.numPages;i++){

        const page = await pdf.getPage(i);

        const t = await page.getTextContent();

        text += t.items.map(x=>x.str).join(" ")+"\n";

      }

    }


    /* DOCX */

    else if(ext==="docx"){

      const buf = await file.arrayBuffer();

      const result = await mammoth.extractRawText({
        arrayBuffer:buf
      });

      text = result.value;

    }


    else{

      this.showToast(
        "te",
        "Unsupported file",
        "Use PDF DOCX TXT"
      );

      return;

    }


    if(!text || text.length < 40){
      throw new Error("Resume text extraction failed");
    }


    text = text.slice(0,2500);


    const today = new Date();
const currentDate = today.toISOString().split("T")[0];
const currentYear = today.getFullYear();

const prompt = `

Today's date is ${currentDate}.
Current year is ${currentYear}.
Use this date when calculating experience_years.

Parse the resume and generate a developer profile.

Return JSON only.

{
"name":"",
"title":"",
"location":"",
"bio":"",
"skills":[],
"experience_years":0,
"github_url":"",
"linkedin_url":"",
"portfolio_url":"",
"experience":[
{
"role":"",
"company":"",
"period":"",
"description":""
}
]
}

Resume:

Rules:
- The "bio" field must be between 600 and 2000 words.
- Format the bio in 4–8 paragraphs.
- Use newline characters (\\n\\n) between paragraphs so it displays properly in a textarea.
- Do not return anything outside the JSON.
- If some information is missing, return "" or [].
- When calculating experience_years, always use the provided current year.

${text}

`;


    const raw = await this.callAi(prompt);

    const profile = this.extractJson(raw);

    this.fillFields(profile);

    this.showToast(
      "ts",
      "Resume imported",
      "Profile auto filled"
    );

  }
  catch(e){

    console.error(e);

    this.showToast(
      "te",
      "Resume parse failed",
      e.message || "AI extraction failed"
    );

  }
  finally{

    this.requestLocks.resume = false;
    this.resetButton(button);

  }

};



/* ---------------- UI HELPERS ---------------- */

window.triggerResumeUpload = function(){

  document.getElementById("resumeUpload")?.click();

};

window.handleResumeUpload = async function(input){

  const file = input?.files?.[0];

  const btn = document.getElementById("resumeAutoFillBtn");

  await AI_PROFILE_GENERATOR.generateFromResumeFile(file,btn);

  if(input) input.value="";

};

window.generateProfileAIWithSpinner = async function(button){

  let prompt =
    document.getElementById("ai_prompt")?.value.trim();

  const today = new Date();
  const currentDate = today.toISOString().split("T")[0];
  const currentYear = today.getFullYear();

  prompt = `
Today's date is ${currentDate}.
Current year is ${currentYear}.

User description:
${prompt}
`;

  return AI_PROFILE_GENERATOR.generate(prompt,button);

};

window.generateProfileAI = async function(){

  const btn = document.getElementById("aiGenerateBtn");

  return generateProfileAIWithSpinner(btn);

};