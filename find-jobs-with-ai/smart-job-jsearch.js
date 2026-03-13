'use strict';

/* ─────────── API CONFIG ─────────── */

const JSEARCH_API = "https://ai.buldel.com/jsearch";
const CLOUD_AI = "https://ai.buldel.com/cloud-ai";
const JSEARCH_CHAT_URL = "https://ai.buldel.com/cloud/chat";

let jsearchRunning = false;


/* ─────────── STEP UI ─────────── */

function setJsearchStep(n){

const steps=["aiStep1","aiStep2","aiStep3","aiStep4"];

steps.forEach((id,i)=>{

const el=document.getElementById(id);
if(!el) return;

if(i<n) el.className="loading-step done";
else if(i===n) el.className="loading-step active";
else el.className="loading-step";

});

}


/* ─────────── JOB CARD ─────────── */

function createJsearchCard(url){

const domain=new URL(url).hostname.replace("www.","");

return `
<div class="job-card">

<div>

<div class="job-role">${domain}</div>

<div class="job-company">🌐 ${domain}</div>

<div class="job-url">${url}</div>

<div class="job-actions">

<a class="job-link-btn"
href="${url}"
target="_blank">
View Job Page
</a>

<a class="job-link-btn apply"
href="${url}"
target="_blank">
⚡ Apply Now
</a>

</div>

</div>

</div>
`;

}


/* ─────────── AI KEYWORD ─────────── */

async function generateKeyword(profile){

  const prompt = `You are a job search keyword generator.

Based on the professional profile below, generate ONE concise job search keyword phrase (2-4 words) that can be used directly in the JSearch API.

RULES:
- Focus on job role + key skill + location
- Keep it short and natural for job search
- Do NOT include job boards (LinkedIn, Indeed, Naukri, Glassdoor, etc.)
- Avoid words like today, latest, hiring websites
- Only generate a keyword phrase suitable for job search
- Include the candidate's location
- Vary wording each time

Return ONLY the keyword phrase
No explanation
No punctuation

Professional Profile:
Name: ${profile.name || ''}
Title: ${profile.title || ''}
Primary Role: ${profile.experience?.[0]?.role || ''}
Skills: ${(profile.skills || '').split(',').slice(0,6).join(' ')}
Experience: ${profile.experience_years || 0} years
Location: ${profile.location || 'India'}
Summary: ${(profile.bio || '').substring(0,300)}
`;
const res=await fetch(CLOUD_AI,{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({prompt})
});

if(!res.ok) throw new Error("AI keyword error");

const data=await res.json();

let keyword=
data?.choices?.[0]?.message?.content ||
data?.content ||
data?.result ||
`${profile.title} ${profile.location}`;

keyword=keyword.replace(/["']/g,'').trim();

return keyword;

}


/* ─────────── JSEARCH API ─────────── */

async function fetchJsearch(keyword){

const q=encodeURIComponent(keyword);

const url=`${JSEARCH_API}?query=${q}&page=1&num_pages=3&country=in&date_posted=month`;

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
const step4=document.getElementById("aiStep4");

if(step1) step1.innerHTML=`<span class="ls-ico">1</span> Reading your developer profile`;
if(step2) step2.innerHTML=`<span class="ls-ico">2</span> AI generating search keyword`;
if(step3) step3.innerHTML=`<span class="ls-ico">3</span> Fetching jobs from job sources`;
if(step4) step4.innerHTML=`<span class="ls-ico">4</span> AI refining job URLs`;

if(jsearchRunning) return;

jsearchRunning=true;

const btn=document.getElementById("smartJobBtn");

btn.disabled=true;
btn.innerHTML=`<span class="spin-ico"></span> Searching`;

const listDirect=document.getElementById("directUrls");
const listBoards=document.getElementById("boardUrls");

const directSection=document.getElementById("directSection");
const boardSection=document.getElementById("boardSection");

const section=document.getElementById("aiUrlResults");

section.classList.add("on");

document.getElementById("aiProcess").style.display="block";

listDirect.innerHTML="";
listBoards.innerHTML="";

directSection.style.display="none";
boardSection.style.display="none";

try{

/* STEP 1 */

setJsearchStep(0);


/* STEP 2 → cloud-ai */

setJsearchStep(1);

const keyword=await generateKeyword(profile);

console.log("KEYWORD:",keyword);


/* STEP 3 → jsearch */

setJsearchStep(2);

const jobs=await fetchJsearch(keyword);


/* COLLECT URLS */

const urls=[];
const domains=new Set();

jobs.forEach(job=>{

const url=job.apply_link || job.url;

if(!url) return;

try{

const domain=new URL(url).hostname;

if(!domains.has(domain)){
domains.add(domain);
urls.push(url);
}

}catch(e){}

});

if(urls.length===0){

directSection.style.display="block";

listDirect.innerHTML=`
<div class="job-card">
⚠️ Jobs not found. Please try again after some time.
</div>`;

return;

}


/* STEP 4 → cloud chat */

setJsearchStep(3);

const promptFilter=`Filter the following URLs and categorize them into

Direct Apply Company Career Pages
Job Boards

Return lists

${urls.join('\n')}
`;

const resFilter=await fetch(JSEARCH_CHAT_URL,{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({prompt:promptFilter})
});

if(!resFilter.ok) throw new Error("AI filter failed");

const filterData=await resFilter.json();

const text=filterData.response || "";


/* PARSE AI RESULT */

const direct=[];
const boards=[];

let mode="";

text.split('\n').forEach(line=>{

const l=line.toLowerCase();

if(l.includes("direct")){mode="direct";return;}
if(l.includes("job board")){mode="boards";return;}

const m=line.match(/https?:\/\/[^\s]+/);

if(!m) return;

if(mode==="direct") direct.push(m[0]);
if(mode==="boards") boards.push(m[0]);

});


if(direct.length){

directSection.style.display="block";

direct.forEach(url=>{
listDirect.innerHTML+=createJsearchCard(url);
});

}

if(boards.length){

boardSection.style.display="block";

boards.forEach(url=>{
listBoards.innerHTML+=createJsearchCard(url);
});

}

document.getElementById("aiUrlCount").innerText=
`${direct.length + boards.length} found`;

}
catch(e){

console.error(e);

directSection.style.display="block";

if(e.message==="TOKEN_LIMIT"){

listDirect.innerHTML=`
<div class="job-card">
⚠️ Job search service is temporarily busy.<br>
Please try again after some time.
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