'use strict';

window.CLOUD_AI_URL = window.CLOUD_AI_URL || 'https://ai.buldel.com/cloud-ai';
window.JOB_SEARCH_AI_URL = window.JOB_SEARCH_AI_URL || 'https://ai.buldel.com/job-search-ai';


function locationPriority(jobLocation, profileLocation) {

  const j = String(jobLocation || '').toLowerCase();
  const p = String(profileLocation || '').toLowerCase();

  if (!j) return 3;

  if (p && (j.includes(p) || p.includes(j))) return 0;

  if (j.includes('remote') || j.includes('anywhere')) return 2;

  return 1;

}



/* ─────────── pageno: 1, 2, 3, 4, 5 ... forever ─────────── */
let _smartPageNo = 0;

/* ─────────── Enable Smart button — called by index.js boot() ─────────── */
// window.enableSmartJobBtn = function () {
//   const btn = document.getElementById('smartJobBtn');
//   if (!btn) return;
//   btn.disabled = false;
//   btn.style.opacity = '1';
//   btn.style.cursor = 'pointer';
//   btn.onclick = runSmartJobSearch;
//   document.getElementById('smartBtnLabel').innerHTML = '⚡ Smart Job Search';
// };

/* ─────────── Set Smart Button State ─────────── */
function setSmartBtn(label, disabled, loading) {
  const btn = document.getElementById('smartJobBtn');
  const lbl = document.getElementById('smartBtnLabel');
  if (!btn || !lbl) return;
  btn.disabled = disabled;
  btn.style.opacity = disabled ? '0.6' : '1';
  btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
  lbl.innerHTML = loading ? `<span class="spin-ico"></span> ${esc(label)}` : label;
}

/* ─────────── Step 1: Ask cloud-ai for search keyword ─────────── */
async function getJobKeyword(p) {
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
Name: ${p.name || ''}
Title: ${p.title || ''}
Primary Role: ${p.experience?.[0]?.role || ''}
Skills: ${(p.skills || '').split(',').slice(0,6).join(' ')}
Experience: ${p.experience_years || 0} years
Location: ${p.location || 'India'}
Profile Summary: ${(p.bio || '').substring(0,300)}
`;

  const res = await fetch(CLOUD_AI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error(`cloud-ai error: HTTP ${res.status}`);
  const data = await res.json();
  const keyword = (
    data?.choices?.[0]?.message?.content || data?.content || data?.result || ''
  ).trim().replace(/["""'']/g, '').toLowerCase();
  if (!keyword) throw new Error('cloud-ai returned empty keyword');
  return keyword;
}

/* ─────────── Step 2: Fetch jobs ─────────── */
async function fetchJobsFromAI(keyword, location, pageno) {
  
  const q = encodeURIComponent(`${keyword}`);
  const url = `${JOB_SEARCH_AI_URL}?q=${q}&pages=1&pageno=${pageno}&categories=jobs`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`job-search-ai error: HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.success) throw new Error('job-search-ai returned unsuccessful response');
  return data;
}

/* ─────────── Step 3: Parse job_boards into job cards ─────────── */
function parseDaysAgo(str) {
  if (!str) return null;
  const s = String(str).toLowerCase();
  if (s.includes('today') || s.includes('0d') || s.includes('just')) return 0;
  const m = s.match(/(\d+)\s*(d|day|days)/);
  if (m) return parseInt(m[1], 10);
  const w = s.match(/(\d+)\s*(w|week|weeks)/);
  if (w) return parseInt(w[1], 10) * 7;
  return null;
}

function parseJobBoardResults(data, profileObj) {
  const boards = data?.jobs?.job_boards || [];
  const allJobs = [];
  for (const board of boards) {
    for (const item of (board.urls || [])) {
      const daysAgo = parseDaysAgo(item.posted_date);
      allJobs.push({
        role: item.title || profileObj.title || 'Developer',
        company: item.company || board.display_name || 'Company',
        location: item.location || profileObj.location || 'India',
        match_score: item.score || Math.floor(70 + Math.random() * 25),
        tags: item.skills || [],
        matched_skills: (item.skills || []).slice(0, 2),
        posted_days_ago: Number.isFinite(daysAgo) ? daysAgo : null,
        url: item.url || item.apply_url || '#',
        apply_url: item.apply_url || item.url || '#',
      });
    }
  }
  allJobs.sort((a, b) => {
    const locA = locationPriority(a.location, profileObj.location);
    const locB = locationPriority(b.location, profileObj.location);
    if (locA !== locB) return locA - locB;
    return (b.match_score || 0) - (a.match_score || 0);
  });
  return allJobs.slice(0, 20);
}

/* ─────────── Main Smart Search Runner ─────────── */
let smartSearchRunning = false;
let _cachedKeyword = null;

async function runSmartJobSearch() {
  if (smartSearchRunning) return;
  if (!session) { window.location.href = '../auth/?next=' + encodeURIComponent('/find-jobs-with-ai/'); return; }
  if (!profile) { window.location.href = '../submit-profile/'; return; }

  const missing = getMissingFields(profile);
  if (missing.length) {
    setStatus('err', 'Profile incomplete', 'Please <a href="../submit-profile/">complete your profile</a> first.');
    renderMissing(missing);
    return;
  }

  // increment pageno every click: 1, 2, 3, 4, 5 ...
  _smartPageNo += 1;
  const pageno = _smartPageNo;

  smartSearchRunning = true;
  setSmartBtn('Finding jobs…', true, true);
  setStatus('info', '🤖 Smart Search running…', 'Scanning job boards for you');

  if (pageno === 1) {
    document.getElementById('resultsSection').classList.remove('on');
    document.getElementById('tipsCard').classList.remove('on');
    document.getElementById('missingWrap').classList.remove('on');
    document.getElementById('rateBanner').classList.remove('on');
  }

  const finishLoading = showLoadingSteps();

  try {
    // keyword: generate once, reuse forever
    if (!_cachedKeyword) {
      setStatus('info', 'AI is analyzing your profile…', 'Finding the best job matches for you');
      _cachedKeyword = await getJobKeyword(profile);
    }

    setStatus('info', 'Scanning job boards…', 'Finding latest openings matching your skills');
    const rawData = await fetchJobsFromAI(_cachedKeyword, profile.location, pageno);
    finishLoading();

    const jobs = parseJobBoardResults(rawData, profile);

    if (jobs.length) {
      renderJobs(jobs);
      setStatus('ok', `${jobs.length} jobs found!`, `Matched to your profile · ${new Date().toLocaleTimeString()}`);
      toast('ts', 'Jobs Found!', `${jobs.length} fresh matches for you`);
    } else {
      setStatus('warn', 'No new matches found', 'Try clicking again to search more.');
      toast('ti', 'No Results', 'Click again to find more jobs.');
    }

    setSmartBtn('🔍 Find More Jobs', false, false);

  } catch (e) {
    finishLoading();
    // roll back pageno so user retries same page
    _smartPageNo -= 1;

    const msg = e.message || '';
    if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate') || msg.includes('429')) {
      setStatus('rate', 'Rate limit reached', 'Please try again after some time.');
      toast('tw', 'Rate Limit', 'Please try again after some time.', 6000);
    } else {
      setStatus('err', 'Search failed', '⚠️ Technical error. Please try after some time.');
      toast('te', 'Technical Error', 'Please try after some time.');
    }
    setSmartBtn(_smartPageNo === 0 ? '⚡ Smart Job Search' : '🔍 Find More Jobs', false, false);
  } finally {
    smartSearchRunning = false;
  }
}