'use strict';

/* ─────────── API CONFIG ─────────── */

const JSEARCH_API = "https://ai.buldel.com/jsearch";
const CLOUD_AI = "https://ai.buldel.com/cloud-ai";

let jsearchRunning = false;


/* ─────────── STEP UI ─────────── */

function setJsearchStep(n){

const steps=["aiStep1","aiStep2","aiStep3"];

steps.forEach((id,i)=>{

const el=document.getElementById(id);
if(!el) return;

if(i<n) el.className="loading-step done";
else if(i===n) el.className="loading-step active";
else el.className="loading-step";

});

}


/* ─────────── VIEWED JOB STORAGE ─────────── */

function getViewedJobs(){

let data = localStorage.getItem("viewedJobs");

if(!data) return {};

try{

const parsed = JSON.parse(data);
const now = Date.now();
const week = 7 * 24 * 60 * 60 * 1000;

const cleaned = {};

for(const url in parsed){

if(now - parsed[url] < week){
cleaned[url] = parsed[url];
}

}

localStorage.setItem("viewedJobs", JSON.stringify(cleaned));

return cleaned;

}catch{

return {};

}

}


/* ─────────── MARK JOB VIEWED ─────────── */
 function markJobViewed(url) {
  const viewed = getViewedJobs();
  viewed[url] = Date.now();
  localStorage.setItem("viewedJobs", JSON.stringify(viewed));

  const card = document.querySelector(`[data-job="${url}"]`);
  if (card) {
    card.classList.add("jc-seen");

    // ← updated selectors for new HTML
    const btns = card.querySelectorAll(".jc-btn");
    if (btns[0]) btns[0].textContent = "👁 Viewed";
    if (btns[1]) btns[1].textContent = "✓ Seen";

    // badge update
    const badge = card.querySelector(".jc-viewed-badge");
    if (badge) badge.textContent = "Viewed";
  }
}

 function createJsearchCard(job) {
  const url = job.apply_link || job.url || "";
  const viewed = getViewedJobs();
  const isViewed = !!viewed[url];
  const safeUrl = url.replace(/'/g, "\\'");
  const displayUrl = url.replace(/^https?:\/\//i, "");

  return `
<div class="jc ${isViewed ? 'jc-seen' : ''}" data-job="${url}">

  <div class="jc-top">
    <p class="jc-title">${job.title || 'Developer'}</p>
    <span class="jc-viewed-badge">${isViewed ? 'Viewed' : 'New'}</span>
  </div>

  <div class="jc-meta">
    <span><span class="jc-meta-icon">🏢</span>${job.company || 'Unknown Company'}</span>
    <span><span class="jc-meta-icon">📍</span>${job.location || 'Location not specified'}</span>
    ${job.posted ? `<span><span class="jc-meta-icon">🕐</span>${job.posted}</span>` : ''}
  </div>

  ${url ? `<div class="jc-url">${displayUrl}</div>` : ''}

  <div class="jc-divider"></div>

  <div class="jc-actions">
    <a class="jc-btn ${isViewed ? 'seen' : ''}"
       href="${url}" target="_blank"
       onclick="markJobViewed('${safeUrl}')">
      ${isViewed ? '👁 Viewed' : 'View Job'}
    </a>
    <a class="jc-btn primary ${isViewed ? 'seen' : ''}"
       href="${url}" target="_blank"
       onclick="markJobViewed('${safeUrl}')">
      ${isViewed ? '✓ Seen' : '⚡ Apply Now'}
    </a>
  </div>

</div>`;
}


/* ─────────── AI KEYWORD ─────────── */

async function generateKeyword(profile){

const lastKeyword = localStorage.getItem("lastJobKeyword") || "";

let keyword = "";
let country = "IN";

const prompt = `Generate ONE short job search keyword phrase.

Rules:
- Maximum (2 - 4) words
- Focus on role + main skill
- Slightly vary wording each time
- Do NOT repeat previous keyword: "${lastKeyword}"

Return JSON only:

{
"keyword":"job search phrase",
"country":"country code"
}

Profile:
Title: ${profile.title || ''}
Skills: ${(profile.skills || '').split(',').slice(0,4).join(' ')}
Location: ${profile.location || 'India'}
`;

const res = await fetch(CLOUD_AI,{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({prompt})
});

if(!res.ok) throw new Error("AI keyword error");

const data = await res.json();

let text =
data?.choices?.[0]?.message?.content ||
data?.content ||
data?.result ||
"";

try{

const parsed = JSON.parse(text);

keyword = parsed.keyword || profile.title;
country = parsed.country || "IN";

}catch(e){

console.warn("AI parse failed");

keyword = profile.title;

}

/* cleanup */

keyword = keyword.replace(/["']/g,'').trim();

/* limit 3 words */

keyword = keyword.split(" ").slice(0,3).join(" ");

/* prevent repeat */

if(keyword.toLowerCase() === lastKeyword.toLowerCase()){

const variants = [
`${profile.title} Developer`,
`${profile.title} Engineer`,
`${profile.title} Specialist`,
`${profile.title} Remote`
];

keyword = variants[Math.floor(Math.random()*variants.length)];

keyword = keyword.split(" ").slice(0,3).join(" ");

}

/* save keyword */

localStorage.setItem("lastJobKeyword",keyword);

return {keyword,country};

}


/* ─────────── JSEARCH API ─────────── */

async function fetchJsearch(keyword,country){

const q = encodeURIComponent(keyword);

const url=`${JSEARCH_API}?query=${q}&page=1&num_pages=2&country=${country}&date_posted=month`;

const res=await fetch(url);

if(!res.ok) throw new Error("JSearch failed");

const data=await res.json();

console.log("JSEARCH RAW:",data);

if(data.error==="All tokens exhausted"){
throw new Error("TOKEN_LIMIT");
}

if(!data.success){
throw new Error("Technical issue");
}

return data.jobs || [];

}


/* ─────────── RUN SMART SEARCH ─────────── */

async function runJsearchJobs(){
if(window.isJobButtonsCooldownActive && window.isJobButtonsCooldownActive()){
  toast('tw','Please wait','Cooldown is active for 3 minutes.',3000);
  return;
}
lockJobButtons("smartJobBtn");
const step1=document.getElementById("aiStep1");
const step2=document.getElementById("aiStep2");
const step3=document.getElementById("aiStep3");

if(step1) step1.innerHTML=`<span class="ls-ico">1</span> Reading your developer profile`;
if(step2) step2.innerHTML=`<span class="ls-ico">2</span> AI generating search keyword`;
if(step3) step3.innerHTML=`<span class="ls-ico">3</span> Fetching jobs from job sources`;

if(jsearchRunning) return;

jsearchRunning=true;
if(window.startJobButtonsCooldown) window.startJobButtonsCooldown(180);

const btn=document.getElementById("smartJobBtn");

const listDirect=document.getElementById("directUrls");
const directSection=document.getElementById("directSection");

const section=document.getElementById("aiUrlResults");

section.classList.add("on");

document.getElementById("aiProcess").style.display="block";

listDirect.innerHTML="";
directSection.style.display="none";

try{

/* STEP 1 */

setJsearchStep(0);

/* STEP 2 */

setJsearchStep(1);

const {keyword,country} = await generateKeyword(profile);

console.log("KEYWORD:",keyword);
console.log("COUNTRY:",country);

/* STEP 3 */

setJsearchStep(2);

const jobs = await fetchJsearch(keyword,country);

if(jobs.length===0){

directSection.style.display="block";

listDirect.innerHTML=`
<div class="job-card">
⚠️ Jobs not found. Please try again later.
</div>`;

return;

}

/* SHOW JOBS */ 

directSection.style.display = "block";

const sorted = jobs.sort((a, b) => {
  const parseAge = s => {
    if (!s) return 9999;
    const n = parseInt(s);
    if (s.includes('hour'))  return n / 24;
    if (s.includes('day'))   return n;
    if (s.includes('week'))  return n * 7;
    if (s.includes('month')) return n * 30;
    return 9999;
  };
  return parseAge(a.posted) - parseAge(b.posted);
});

listDirect.innerHTML = sorted.map(job => createJsearchCard(job)).join('');

document.getElementById("aiUrlCount").innerText = `${jobs.length} jobs found`;

}
catch(e){

console.error(e);

directSection.style.display="block";

if(e.message==="TOKEN_LIMIT"){

listDirect.innerHTML=`
<div class="job-card">
⚠️ Job search service is temporarily busy.
</div>`;

}else{

listDirect.innerHTML=`
<div class="job-card">
⚠️ Technical issue. Please try again later.
</div>`;

}

}
finally{

jsearchRunning=false;

document.getElementById("aiProcess").style.display="none";

const cooldownActive = window.isJobButtonsCooldownActive && window.isJobButtonsCooldownActive();
if(!cooldownActive){
  unlockJobButtons();
  btn.disabled=false;
  btn.innerHTML="⚡ Smart Job Search";
}

}

}


/* ─────────── ENABLE BUTTON ─────────── */

window.enableSmartJobBtn=function(){

const btn=document.getElementById("smartJobBtn");

if(!btn) return;

btn.disabled=false;
btn.style.opacity="1";
btn.style.cursor="pointer";

btn.onclick=runJsearchJobs;

};

 
