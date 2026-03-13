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

function markJobViewed(url){

const viewed = getViewedJobs();

viewed[url] = Date.now();

localStorage.setItem("viewedJobs", JSON.stringify(viewed));

/* update UI instantly */

const card = document.querySelector(`[data-job="${url}"]`);

if(card){

card.classList.add("job-viewed");

const viewBtn = card.querySelector(".view-btn");
const applyBtn = card.querySelector(".apply-btn");

if(viewBtn) viewBtn.innerHTML="👁 Viewed";
if(applyBtn) applyBtn.innerHTML="✓ Seen";

}

}


/* ─────────── JOB CARD ─────────── */

function createJsearchCard(job){

const url = job.apply_link || job.url || "";

const viewed = getViewedJobs();

const isViewed = viewed[url];

return `
<div class="job-card ${isViewed ? 'job-viewed':''}" data-job="${url}">

<div class="job-role">${job.title || 'Developer'}</div>

<div class="job-company">
🏢 ${job.company || 'Unknown Company'}
</div>

<div class="job-location">
📍 ${job.location || 'Location not specified'}
</div>

<div class="job-posted">
⏱ ${job.posted || ''}
</div>

<div class="job-url">
${url}
</div>

<div class="job-actions">

<a class="job-link-btn view-btn"
href="${url}"
target="_blank"
onclick="markJobViewed('${url}')">
${isViewed ? "👁 Viewed" : "View Job"}
</a>

<a class="job-link-btn apply apply-btn"
href="${url}"
target="_blank"
onclick="markJobViewed('${url}')">
${isViewed ? "✓ Seen" : "⚡ Apply Now"}
</a>

</div>

</div>
`;

}


/* ─────────── AI KEYWORD ─────────── */

async function generateKeyword(profile){

const lastKeyword = localStorage.getItem("lastJobKeyword") || "";

let keyword = "";
let country = "IN";

const prompt = `Generate ONE short job search keyword phrase.

Rules:
- Maximum 3 words
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

const url=`${JSEARCH_API}?query=${q}&page=1&num_pages=3&country=${country}&date_posted=month`;

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

const step1=document.getElementById("aiStep1");
const step2=document.getElementById("aiStep2");
const step3=document.getElementById("aiStep3");

if(step1) step1.innerHTML=`<span class="ls-ico">1</span> Reading your developer profile`;
if(step2) step2.innerHTML=`<span class="ls-ico">2</span> AI generating search keyword`;
if(step3) step3.innerHTML=`<span class="ls-ico">3</span> Fetching jobs from job sources`;

if(jsearchRunning) return;

jsearchRunning=true;

const btn=document.getElementById("smartJobBtn");

btn.disabled=true;
btn.innerHTML=`<span class="spin-ico"></span> Searching`;

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

directSection.style.display="block";

jobs.forEach(job=>{
listDirect.innerHTML += createJsearchCard(job);
});

document.getElementById("aiUrlCount").innerText =
`${jobs.length} jobs found`;

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

btn.disabled=false;
btn.innerHTML="⚡ Smart Job Search";

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