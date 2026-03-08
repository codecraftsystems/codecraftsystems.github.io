'use strict';

function repairTruncatedJSON(raw) {
  const text = String(raw || '').trim();
  const start = text.indexOf('{');
  if (start === -1) return null;

  const sliced = text.slice(start);
  const openCurly = (sliced.match(/\{/g) || []).length;
  const closeCurly = (sliced.match(/\}/g) || []).length;
  const openSquare = (sliced.match(/\[/g) || []).length;
  const closeSquare = (sliced.match(/\]/g) || []).length;

  let repaired = sliced;
  if (closeSquare < openSquare) repaired += ']'.repeat(openSquare - closeSquare);
  if (closeCurly < openCurly) repaired += '}'.repeat(openCurly - closeCurly);

  return repaired;
}

async function callBackupEndpoint(profile) {
  const skills = (profile.skills || '').split(',').map(s => s.trim()).filter(Boolean).join(', ');

  const promptBuldel = `Developer:\nName: ${profile.name}\nTitle: ${profile.title}\nSkills: ${skills}\nExp: ${profile.experience_years || 0}y\nLocation: ${profile.location || 'Remote'}\n\n⚠️ CRITICAL: Return COMPLETE JSON. 5 jobs. End with }.\n\nFORMAT:\n{\n  "jobs": [\n    {\n      "role": "Senior Laravel Developer",\n      "company": "Tech Solutions",\n      "location": "Surat, India",\n      "match_score": 95,\n      "tags": ["Laravel","Vue.js"],\n      "matched_skills": ["Laravel"],\n      "url": "https://linkedin.com/jobs/view/...",\n      "apply_url": "https://linkedin.com/search",\n      "days_ago": 2\n    }\n  ],\n  "strategy": "**Step 1:** ...\\n**Step 2:** ...\\n**Step 3:** ...\\n**Step 4:** ...\\n**Step 5:** ..."\n}\n\n✅ CHECK: { } match. [ ] match. Last char }. 5 complete jobs.\n\nGenerate 5 REAL jobs for this developer.`;

  const response = await fetch('https://ai.buldel.com/cloud-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: promptBuldel })
  });

  if (!response.ok) {
    let errBody = null;
    try { errBody = await response.json(); } catch (e) {}
    throw new Error(errBody?.error?.message || `Backup API HTTP ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Unexpected backup API response format');

  const clean = String(content).replace(/```json/gi, '').replace(/```/g, '').trim();
  let jsonText = (typeof extractJsonObject === 'function') ? extractJsonObject(clean) : null;
  if (!jsonText) jsonText = repairTruncatedJSON(clean);
  if (!jsonText) throw new Error('AI response JSON invalid');

  const parsed = JSON.parse(jsonText);
  if (!Array.isArray(parsed.jobs) || parsed.jobs.length === 0) {
    throw new Error('Invalid job data from backup API');
  }

  return parsed;
}

window.callBackupEndpoint = callBackupEndpoint;
