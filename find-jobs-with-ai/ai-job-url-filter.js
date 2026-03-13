'use strict';

const CLOUD_AI_URL = 'https://ai.buldel.com/cloud-ai';
const JOB_SEARCH_URL = 'https://ai.buldel.com/job-search';
const CLOUD_CHAT_URL = 'https://ai.buldel.com/cloud/chat';

let aiRunning = false;


/* ─────────── STEP UI ─────────── */

function setAiStep(n){

  const steps = ["aiStep1","aiStep2","aiStep3","aiStep4"];

  steps.forEach((id,i)=>{
    const el = document.getElementById(id);
    if(!el) return;

    if(i < n) el.className="loading-step done";
    else if(i === n) el.className="loading-step active";
    else el.className="loading-step";
  });

}


/* ─────────── CREATE JOB CARD ─────────── */

function createJobCard(url){

  const domain = new URL(url).hostname.replace("www.","");

  return `
  <div class="job-card">

    <div>

      <div class="job-role">${domain}</div>

      <div class="job-company">
        🌐 ${domain}
      </div>

      <div class="job-url">
        ${url}
      </div>

      <div class="job-actions">

        <a class="job-link-btn" href="${url}" target="_blank">
          View Job Page
        </a>

        <a class="job-link-btn apply" href="${url}" target="_blank">
          ⚡ Apply Now
        </a>

      </div>

    </div>

  </div>
  `;

}


/* ─────────── MAIN RUNNER ─────────── */

async function runAiUrlSearch(){

  if(aiRunning) return;

  const btn = document.getElementById("aiUrlBtn");

  btn.disabled = true;
  btn.innerHTML = `<span class="spin-ico"></span> Finding Jobs`;

  aiRunning = true;


  if (!session){
    window.location.href='../auth/?next='+encodeURIComponent('/find-jobs-with-ai/');
    return;
  }

  if (!profile){
    window.location.href='../submit-profile/';
    return;
  }


  const missing = getMissingFields(profile);

  if (missing.length){
    setStatus('err','Profile incomplete','Please complete your profile first.');
    renderMissing(missing);
    return;
  }


  const listDirect = document.getElementById("directUrls");
  const listBoards = document.getElementById("boardUrls");

  const directSection = document.getElementById("directSection");
  const boardSection = document.getElementById("boardSection");

  const section = document.getElementById("aiUrlResults");


  section.classList.add("on");

  document.getElementById("aiProcess").style.display="block";

  /* hide result sections while searching */

  if(directSection) directSection.style.display="none";
  if(boardSection) boardSection.style.display="none";


  listDirect.innerHTML="";
  listBoards.innerHTML="";


  try{

  /* STEP 1 */

  setAiStep(0);


  /* ─────────── AI KEYWORD ─────────── */

  const prompt = `You are a job discovery assistant.

Based on the professional profile below, generate ONE short search phrase (3–6 words) that helps find the LATEST or TODAY jobs posted directly on company career pages or company hiring websites.

The phrase MUST include the professional's location.

STRICT RULES:
- Do NOT target job boards such as LinkedIn, Indeed, Naukri, Glassdoor, Monster, or similar sites.
- The search phrase should help discover jobs directly on company career pages or startup hiring pages.
- Prefer keywords like today, latest, recent, hiring, careers, join team so search engines return fresh job postings.
- Focus on the person's role, core skills, experience level, and location.
- Each time you generate a phrase, vary the wording so results are not always identical.

Return ONLY the search phrase
No explanation
No punctuation

Current Date: ${new Date().toLocaleDateString('en-GB')}

Professional Profile:
Name: ${profile.name || ''}
Title: ${profile.title || ''}
Primary Role: ${profile.experience?.[0]?.role || ''}
Skills: ${(profile.skills || '').split(',').slice(0,6).join(' ')}
Experience: ${profile.experience_years || 0} years
Location: ${profile.location || 'India'}
Profile Summary: ${(profile.bio || '').substring(0,300)}
`;

  setAiStep(1);

  const resAI = await fetch(CLOUD_AI_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({prompt})
  });

  if(!resAI.ok) throw new Error("AI keyword generation failed");

  const aiData = await resAI.json();

  let keyword =
    aiData?.choices?.[0]?.message?.content ||
    aiData?.content ||
    aiData?.result ||
    `${profile.title} ${profile.location}`;


  keyword = keyword
  .replace(/["()]/g,'')
  .replace(/\bAND\b|\bOR\b/gi,'')
  .trim();


  const searchQuery = encodeURIComponent(keyword);


  /* ─────────── JOB SEARCH ─────────── */

  setAiStep(2);

  const api = `${JOB_SEARCH_URL}?q=${searchQuery}&pages=10&categories=jobs`;

  const res = await fetch(api);

  if(!res.ok) throw new Error("Job search API failed");

  const data = await res.json();


  if(!data.results || data.results.length===0){

    listDirect.innerHTML=`<div class="job-card">No jobs found</div>`;
    return;

  }


  /* ─────────── COLLECT URLS ─────────── */

  const urls=[];
  const domains=new Set();

  data.results.forEach(job=>{

    try{

      const url=job.url;
      if(!url) return;

      const domain=new URL(url).hostname;

      if(!domains.has(domain)){
        domains.add(domain);
        urls.push(url);
      }

    }catch(e){}

  });


  if(urls.length===0){

    listDirect.innerHTML=`<div class="job-card">No job URLs found</div>`;
    return;

  }


  /* ─────────── AI FILTER ─────────── */

  setAiStep(3);

  const promptFilter = `Filter the following URLs and categorize them into

Direct Apply Company Career Pages
Job Boards

Return lists

${urls.join('\n')}
`;


  const resFilter = await fetch(CLOUD_CHAT_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({prompt:promptFilter})
  });

  if(!resFilter.ok) throw new Error("AI URL classification failed");

  const filterData = await resFilter.json();
  const text = filterData.response || "";


  const direct=[];
  const boards=[];
  let mode="";


  text.split('\n').forEach(line=>{

    const l=line.toLowerCase();

    if(l.includes("direct")){mode="direct";return;}
    if(l.includes("job board")){mode="boards";return;}

    const urlMatch=line.match(/https?:\/\/[^\s]+/);

    if(!urlMatch) return;

    const url=urlMatch[0];

    if(mode==="direct") direct.push(url);
    if(mode==="boards") boards.push(url);

  });


  listDirect.innerHTML="";
  listBoards.innerHTML="";


  /* SHOW DIRECT ONLY IF EXISTS */

  if(direct.length){

    if(directSection) directSection.style.display="block";

    direct.forEach(url=>{
      listDirect.innerHTML += createJobCard(url);
    });

  }


  /* SHOW BOARDS ONLY IF EXISTS */

  if(boards.length){

    if(boardSection) boardSection.style.display="block";

    boards.forEach(url=>{
      listBoards.innerHTML += createJobCard(url);
    });

  }


  document.getElementById("aiUrlCount").innerText =
  `${direct.length + boards.length} found`;


  /* hide progress */

  document.getElementById("aiProcess").style.display = "none";


  }
  catch(e){

    console.error(e);

    listDirect.innerHTML=`<div class="job-card">Error loading jobs</div>`;

  }

  finally{

    aiRunning=false;

    btn.disabled=false;

    btn.innerHTML="🤖 AI URL Finder";

  }

}


/* ─────────── ENABLE BUTTON ─────────── */

window.enableAiUrlBtn=function(){

  const btn=document.getElementById("aiUrlBtn");

  if(!btn) return;

  btn.disabled=false;
  btn.style.opacity="1";
  btn.style.cursor="pointer";

  btn.onclick=runAiUrlSearch;

};