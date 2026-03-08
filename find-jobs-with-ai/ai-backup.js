// ai-backup-optimized.js
// Optimized AI job search with intelligent response handling and URL generation

async function aiJobSearchBackup(profile) {
  console.log('🔍 Backup AI: Starting optimized job search for', profile.name);
  
  try {
    // Process profile data efficiently
    const processed = processProfileSmart(profile);
    
    // Try AI first with enhanced prompt for complete responses
    const aiResult = await tryAISearch(processed);
    if (aiResult && aiResult.jobs && aiResult.jobs.length >= 3) {
      // Validate and enhance all jobs with proper URLs
      aiResult.jobs = aiResult.jobs.map(job => enhanceJob(job, processed));
      return aiResult;
    }
    
    // If AI response is incomplete or has issues, fix it
    if (aiResult && aiResult.jobs && aiResult.jobs.length > 0) {
      console.log('⚠️ AI response incomplete, fixing jobs...');
      const fixedJobs = await fixIncompleteAIResponse(aiResult, processed);
      return fixedJobs;
    }
    
    // Fallback to smart generation
    console.log('⚠️ AI failed, using smart generation');
    return generateSmartJobs(processed);
    
  } catch (error) {
    console.error('❌ Backup AI error:', error);
    return generateSmartJobs(processProfileSmart(profile));
  }
}

// Enhanced prompt for complete responses
function getEnhancedPrompt(profile, options = {}) {
  const { primarySkill, secondarySkill, city, isIndia, isRemote, exp, level } = profile;
  const jobCount = Math.max(3, Math.min(8, options.jobCount || 5));
  const compactMode = Boolean(options.compactMode);
  const extraRules = compactMode
    ? '- Keep each value concise to avoid truncation\n- Prefer short role and company names\n'
    : '- Include realistic skills and salary ranges\n';
  
  return `You are a job search assistant. Return ONLY valid JSON with ${jobCount} realistic jobs.

CONTEXT:
- Role: ${primarySkill} ${secondarySkill} Developer
- Experience: ${exp} years (${level} level)
- Location: ${city}${isIndia ? ', India' : ''}
- Job Type: ${isRemote ? 'Remote' : 'On-site/Hybrid'}

REQUIREMENTS:
1. Return COMPLETE JSON (don't cut off mid-response)
2. Include exactly ${jobCount} jobs
3. All fields must be filled
4. Use REAL company names (not "Example" or "Test")
5. URLs must be working job portals
${extraRules}

JSON FORMAT:
{
  "jobs": [
    {
      "role": "exact job title",
      "company": "real company name",
      "location": "${city}${isIndia ? ', India' : ''} or Remote",
      "match_score": number between 75-98,
      "tags": ["skill1", "skill2", "skill3"],
      "matched_skills": ["skill1", "skill2"],
      "url": "https://linkedin.com/jobs/search/?keywords=${encodeURIComponent(primarySkill)}&location=${encodeURIComponent(city)}",
      "apply_url": "same as url",
      "days_ago": number between 1-14,
      "salary_range": "${isIndia ? '₹5,00,000 - ₹12,00,000 per year' : '$60,000 - $120,000 per year'}",
      "job_type": "${isRemote ? 'Remote' : 'Full-time'}"
    }
  ]
}

IMPORTANT: 
- Return ONLY the JSON, no other text
- Don't truncate the response
- Use real Indian companies if location is India
- Complete all ${jobCount} jobs before finishing

Generate jobs now:`;
}

function getContinuationPrompt(profile, existingJobs, targetCount) {
  const slimExisting = (existingJobs || []).map(job => ({
    role: job.role,
    company: job.company,
    location: job.location
  }));

  return `Continue the job list in JSON.
Return ONLY: {"jobs":[...]} with ${targetCount} NEW jobs.
Do not repeat these existing jobs: ${JSON.stringify(slimExisting)}

Context:
- Candidate skills: ${profile.topSkills.join(', ') || profile.primarySkill}
- Location preference: ${profile.location}
- Experience: ${profile.exp} years

Required fields per job:
role, company, location, match_score, tags, matched_skills, url, apply_url, days_ago, salary_range, job_type`;
}

// Try AI search with enhanced prompt
async function tryAISearch(profile) {
  console.log('📤 Sending enhanced prompt to AI...');

  try {
    // First try: full detailed response
    const firstAttempt = await requestAIPayload(getEnhancedPrompt(profile, { jobCount: 5 }), 2200);
    const firstParse = extractAIResponse(firstAttempt, profile);

    if (firstParse?.parsed?.jobs?.length >= 5 && !firstParse.incomplete) {
      return firstParse.parsed;
    }

    const partial = firstParse?.parsed || { jobs: [] };
    const haveCount = partial.jobs?.length || 0;

    // If truncated, request only missing jobs in compact mode for reliability.
    if (haveCount < 5) {
      const missing = 5 - haveCount;
      console.log(`⚠️ AI response incomplete, requesting ${missing} additional jobs...`);
      const continuationPrompt = getContinuationPrompt(profile, partial.jobs || [], missing);
      const continuationAttempt = await requestAIPayload(continuationPrompt, 1200, 0.5);
      const continuationParse = extractAIResponse(continuationAttempt, profile);
      if (continuationParse?.parsed?.jobs?.length) {
        const mergedJobs = mergeJobs(partial.jobs || [], continuationParse.parsed.jobs);
        return { jobs: mergedJobs.slice(0, 8), _incomplete: firstParse?.incomplete || continuationParse.incomplete };
      }
    }

    // Final fallback: smaller compact response to avoid token-length truncation
    const compactAttempt = await requestAIPayload(getEnhancedPrompt(profile, { jobCount: 4, compactMode: true }), 1000, 0.4);
    const compactParse = extractAIResponse(compactAttempt, profile);
    if (compactParse?.parsed?.jobs?.length) {
      compactParse.parsed._incomplete = compactParse.incomplete;
      return compactParse.parsed;
    }

    return partial.jobs?.length ? { ...partial, _incomplete: true } : null;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('⏱️ AI request timed out');
    } else {
      console.log('⚠️ AI request failed:', error.message);
    }
    return null;
  }
}

async function requestAIPayload(prompt, maxTokens = 1600, temperature = 0.7) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch("https://ai.buldel.com/cloud-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        temperature,
        max_tokens: maxTokens,
        top_p: 0.9
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractAIResponse(data, profile) {
  const content = data?.choices?.[0]?.message?.content || '';
  const finishReason = data?.choices?.[0]?.finish_reason;
  const incomplete = finishReason === 'length' || looksTruncated(content);
  const parsed = parseAIResponse(content, profile);
  return { parsed, incomplete, finishReason };
}

function looksTruncated(content) {
  if (!content || content.length < 120) return true;
  const trimmed = content.trim();
  if (trimmed.endsWith('...')) return true;
  const opens = (trimmed.match(/[\{\[]/g) || []).length;
  const closes = (trimmed.match(/[\}\]]/g) || []).length;
  return opens > closes;
}

// Fix incomplete AI response
async function fixIncompleteAIResponse(partialResult, profile) {
  const jobs = partialResult.jobs || [];
  const targetCount = 8; // We want 8 total jobs
  
  console.log(`🔧 Fixing incomplete response: ${jobs.length} jobs received, need ${targetCount}`);
  
  // Enhance existing jobs with proper URLs
  const enhancedJobs = jobs.map(job => enhanceJob(job, profile));
  
  // Generate additional jobs if needed
  if (enhancedJobs.length < targetCount) {
    const needed = targetCount - enhancedJobs.length;
    const smartJobs = generateSmartJobs(profile, needed).jobs;
    enhancedJobs.push(...smartJobs);
  }
  
  // Sort by match score
  enhancedJobs.sort((a, b) => b.match_score - a.match_score);
  
  // Generate strategy
  const strategy = generateSmartStrategy(profile, enhancedJobs[0]);
  
  return { 
    jobs: enhancedJobs.slice(0, targetCount), 
    strategy,
    note: "Some jobs were AI-generated, others were intelligently created based on your profile"
  };
}

// Parse AI response with better error handling
function parseAIResponse(content, profile) {
  try {
    if (!content) return null;

    // Sometimes assistant content itself contains the full API payload JSON.
    const envelope = tryParseJson(content);
    if (envelope?.choices?.[0]?.message?.content) {
      return parseAIResponse(envelope.choices[0].message.content, profile);
    }

    // Clean the content - remove markdown code blocks if present
    let cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Find JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const parsed = tryParseJson(jsonMatch[0]) || tryParseJson(fixTruncatedJson(jsonMatch[0]));
    
    if (parsed.jobs && Array.isArray(parsed.jobs) && parsed.jobs.length > 0) {
      // Validate and fix each job
      parsed.jobs = parsed.jobs.map(job => validateAndFixJob(job, profile));
      parsed.jobs = mergeJobs([], parsed.jobs);
      return parsed;
    }
    
    return null;
  } catch (e) {
    console.log('⚠️ Failed to parse AI response:', e.message);
    return null;
  }
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

// Fix truncated JSON
function fixTruncatedJson(truncated) {
  let output = String(truncated || '').trim();

  // Remove trailing comma before object/array close if present.
  output = output.replace(/,\s*([}\]])/g, '$1');

  // Count opening and closing braces
  const openBraces = (output.match(/\{/g) || []).length;
  const closeBraces = (output.match(/\}/g) || []).length;
  const openBrackets = (output.match(/\[/g) || []).length;
  const closeBrackets = (output.match(/\]/g) || []).length;
  
  // If we have more opens than closes, add missing closing braces
  if (openBraces > closeBraces) {
    output += '}'.repeat(openBraces - closeBraces);
  }
  if (openBrackets > closeBrackets) {
    output += ']'.repeat(openBrackets - closeBrackets);
  }
  
  // Ensure we close root object at least once.
  if (!output.endsWith('}')) {
    output += '}';
  }
  
  return output;
}

// Validate and fix individual job
function validateAndFixJob(job, profile) {
  const fixedJob = { ...job };
  
  // Required fields with defaults
  const defaults = {
    role: `${profile.level} Developer`,
    company: 'Tech Company',
    location: profile.isIndia ? `${profile.city}, India` : (profile.isRemote ? 'Remote' : profile.city),
    match_score: 85,
    tags: profile.topSkills,
    matched_skills: profile.topSkills.slice(0, 2),
    days_ago: Math.floor(Math.random() * 7) + 1,
    job_type: profile.isRemote ? 'Remote' : 'Full-time'
  };
  
  // Apply defaults for missing fields
  Object.keys(defaults).forEach(key => {
    if (!fixedJob[key]) {
      fixedJob[key] = defaults[key];
    }
  });
  
  // Keep AI URL if valid, otherwise generate smart URL.
  fixedJob.url = normalizeOrGenerateUrl(fixedJob.url, fixedJob, profile);
  fixedJob.apply_url = normalizeOrGenerateUrl(fixedJob.apply_url || fixedJob.url, fixedJob, profile);
  
  // Generate salary if missing
  if (!fixedJob.salary_range) {
    fixedJob.salary_range = profile.isIndia 
      ? generateIndianSalary(profile.exp, fixedJob.match_score)
      : generateSalaryRange(profile.exp, fixedJob.match_score);
  }
  
  return fixedJob;
}

// Enhance individual job with proper URLs
function enhanceJob(job, profile) {
  return validateAndFixJob(job, profile);
}

// Generate smart URL based on job and profile
function generateSmartUrl(job, profile) {
  const primarySkill = (profile.primarySkill || 'developer').toLowerCase();
  const role = (job.role || '').toLowerCase();
  const company = (job.company || '').trim();
  const searchTerms = encodeURIComponent(`${role || primarySkill} ${company}`.trim());
  const city = profile.city ? encodeURIComponent(profile.city) : '';
  
  // India-specific URLs with proper formatting
  if (profile.isIndia) {
    return `https://www.naukri.com/${primarySkill}-jobs-in-${profile.city?.toLowerCase().replace(/\s+/g, '-') || 'india'}`;
  }
  
  // Remote URLs
  if (profile.isRemote) {
    return `https://www.linkedin.com/jobs/search/?keywords=${searchTerms}&f_WT=2`;
  }
  
  // International URLs
  return `https://www.linkedin.com/jobs/search/?keywords=${searchTerms}&location=${city}`;
}

function normalizeOrGenerateUrl(candidateUrl, job, profile) {
  if (typeof candidateUrl === 'string' && /^https?:\/\//i.test(candidateUrl)) {
    return candidateUrl.trim();
  }
  return generateSmartUrl(job, profile);
}

function mergeJobs(baseJobs, incomingJobs) {
  const merged = [...(baseJobs || []), ...(incomingJobs || [])]
    .filter(Boolean)
    .map(job => ({ ...job, _sortScore: computeTalentScore(job) }));

  const seen = new Set();
  const unique = merged.filter(job => {
    const key = `${(job.role || '').toLowerCase()}|${(job.company || '').toLowerCase()}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => b._sortScore - a._sortScore);
  unique.forEach(job => delete job._sortScore);
  return unique;
}

function computeTalentScore(job) {
  const score = Number(job.match_score) || 0;
  const matched = Array.isArray(job.matched_skills) ? job.matched_skills.length * 2 : 0;
  const freshness = Math.max(0, 15 - (Number(job.days_ago) || 15));
  return score + matched + freshness;
}

// Generate smart jobs without AI
function generateSmartJobs(profile, count = 8) {
  const { primarySkill, secondarySkill, topSkills, isIndia, isRemote, city, exp, possibleTitles } = profile;
  
  // Company lists with real companies
  const indianCompanies = [
    'TCS', 'Infosys', 'Wipro', 'HCL Technologies', 'Tech Mahindra', 'Mindtree',
    'Cognizant', 'Accenture Solutions', 'Capgemini India', 'IBM India',
    'Microsoft India', 'Amazon Development Center', 'Flipkart', 'Paytm',
    'Razorpay Software', 'Freshworks Inc', 'PhonePe Pvt Ltd', 'Swiggy',
    'Zomato Media', 'Ola Cabs', 'OLX Group', 'Myntra Designs',
    'Urban Company', 'Unacademy', 'BYJU\'S', 'Dream11', 'Cred'
  ];
  
  const remoteCompanies = [
    'GitLab Inc', 'Automattic', 'Shopify', 'Stripe', 'Atlassian',
    'DigitalOcean', 'Canva', 'Spotify AB', 'HubSpot', 'Dropbox',
    'Zapier Inc', 'Buffer', 'Toptal LLC', 'InVisionApp', 'Doist',
    'Figma Inc', 'Airtable', 'Notion Labs', 'Linear', 'Vercel'
  ];
  
  const intlCompanies = [
    'Google LLC', 'Microsoft', 'Amazon Web Services', 'Meta Platforms',
    'Apple Inc', 'Netflix', 'Uber Technologies', 'Airbnb', 'X Corp',
    'Salesforce Inc', 'Oracle', 'Adobe Systems', 'Cisco Systems',
    'Intel Corporation', 'IBM Global', 'Dell Technologies', 'VMware'
  ];
  
  // Select company list
  let companies;
  if (isIndia) companies = indianCompanies;
  else if (isRemote) companies = remoteCompanies;
  else companies = intlCompanies;
  
  const jobs = [];
  const numJobs = count || 8;
  
  // Indian cities for location variety
  const indianCities = ['Bangalore', 'Mumbai', 'Pune', 'Hyderabad', 'Chennai', 'Delhi NCR', 'Gurgaon', 'Noida'];
  
  for (let i = 0; i < numJobs; i++) {
    // Determine job title
    const titleIndex = i % possibleTitles.length;
    const title = possibleTitles[titleIndex] || 
                  (i % 2 === 0 ? `${profile.level} ${primarySkill} Developer` : 'Software Engineer');
    
    // Select company (avoid duplicates)
    let company;
    do {
      company = companies[Math.floor(Math.random() * companies.length)];
    } while (jobs.some(j => j.company === company) && jobs.length < companies.length);
    
    // Determine if remote
    const jobRemote = isRemote || (isIndia ? Math.random() > 0.5 : Math.random() > 0.7);
    
    // Calculate matched skills
    const numMatched = Math.min(2 + Math.floor(Math.random() * 3), topSkills.length);
    const matchedSkills = [...topSkills].sort(() => 0.5 - Math.random()).slice(0, numMatched);
    
    // Calculate match score
    const matchScore = Math.min(98, 70 + (matchedSkills.length * 6) + (exp * 1.2));
    
    // Generate location
    let jobLocation;
    if (jobRemote) {
      jobLocation = 'Remote (Work from Home)';
    } else if (isIndia) {
      const cityIndex = Math.floor(Math.random() * indianCities.length);
      jobLocation = `${indianCities[cityIndex]}, India`;
    } else {
      jobLocation = city || 'Multiple Locations';
    }
    
    // Create job object with proper URLs
    const job = {
      role: title,
      company: company,
      location: jobLocation,
      match_score: Math.round(matchScore),
      tags: topSkills.slice(0, 3),
      matched_skills: matchedSkills,
      days_ago: Math.floor(Math.random() * 10) + 1,
      job_type: jobRemote ? 'Remote' : 'Full-time',
      salary_range: isIndia ? 
        generateIndianSalary(exp, matchScore) : 
        generateSalaryRange(exp, matchScore),
      posted_date: new Date(Date.now() - (Math.random() * 10 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      required_experience: `${Math.max(1, exp - 1)}-${exp + 2} years`
    };
    
    // Add URLs
    job.url = generateSmartUrl(job, profile);
    job.apply_url = job.url;
    
    jobs.push(job);
  }
  
  // Sort by match score
  jobs.sort((a, b) => b.match_score - a.match_score);
  
  // Generate strategy
  const strategy = generateSmartStrategy(profile, jobs[0]);
  
  return { jobs, strategy };
}

// Generate salary in INR
function generateIndianSalary(exp, matchScore) {
  const baseLPA = 4 + (exp * 1.5);
  const multiplier = 0.8 + (matchScore / 400);
  const min = Math.round(baseLPA * 0.8 * multiplier * 100) / 100;
  const max = Math.round(baseLPA * 1.4 * multiplier * 100) / 100;
  return `₹${min} - ₹${max} Lakhs per annum`;
}

// Generate salary in USD
function generateSalaryRange(exp, matchScore) {
  const base = 50000 + (exp * 12000);
  const min = Math.round(base * 0.85 / 1000) * 1000;
  const max = Math.round(base * 1.4 / 1000) * 1000;
  return `$${min.toLocaleString()} - $${max.toLocaleString()} per year`;
}

// Generate smart strategy
function generateSmartStrategy(profile, topJob) {
  const { name, skills, exp, level, isIndia, isRemote, primarySkill } = profile;
  const currentDate = new Date().toLocaleDateString('en-IN');
  
  let strategy = `🎯 **Personalized Job Search Strategy for ${name}**\n\n`;
  
  // Priority Application
  strategy += "**🔥 PRIORITY ACTION**\n";
  strategy += `• Apply immediately to: **${topJob?.role} at ${topJob?.company}** (${topJob?.match_score}% match)\n`;
  strategy += `• Direct link: ${topJob?.url}\n\n`;
  
  // Daily Action Plan
  strategy += "**📅 Daily Job Search Plan**\n";
  strategy += "• Morning (30 min): Apply to 3-5 new jobs\n";
  strategy += "• Afternoon (1 hour): Network on LinkedIn, connect with recruiters\n";
  strategy += "• Evening (1 hour): Practice coding, update applications\n\n";
  
  // Platform Recommendations
  strategy += "**💻 Best Job Platforms for You**\n";
  if (isIndia) {
    strategy += "• **Naukri.com** - Upload detailed profile, set job alerts\n";
    strategy += "• **LinkedIn Jobs India** - Follow companies, connect with HR\n";
    strategy += "• **Indeed India** - Quick apply with saved resume\n";
    strategy += "• **Hirist.com** - Specifically for tech jobs in India\n";
    strategy += "• **Cutshort.com** - Tech-focused platform\n";
  } else if (isRemote) {
    strategy += "• **RemoteOK** - Best for remote developer jobs\n";
    strategy += "• **WeWorkRemotely** - Quality remote positions\n";
    strategy += "• **FlexJobs** - Vetted remote opportunities\n";
    strategy += "• **LinkedIn (Remote filter)** - Use #Remote filter\n";
    strategy += "• **Arc.dev** - Remote dev jobs\n";
  } else {
    strategy += "• **LinkedIn Jobs** - Best for professional networking\n";
    strategy += "• **Glassdoor** - Company reviews and salaries\n";
    strategy += "• **BuiltIn** - Tech hubs and startups\n";
    strategy += "• **AngelList/Wellfound** - Startup jobs\n";
  }
  strategy += "\n";
  
  // Resume Optimization
  strategy += "**📝 Resume Optimization Tips**\n";
  strategy += `• Lead with your ${exp}+ years of ${primarySkill} experience\n`;
  strategy += "• Use action verbs: 'Developed', 'Architected', 'Optimized', 'Led'\n";
  strategy += "• Add metrics: 'Improved performance by X%', 'Reduced load time by Y%'\n";
  strategy += `• Include keywords: ${skills.slice(0, 5).join(', ')}\n`;
  strategy += "• Save as PDF with name: 'FirstName_LastName_Resume.pdf'\n\n";
  
  // Interview Preparation
  strategy += "**⚡ Quick Interview Prep**\n";
  strategy += `• Practice top ${skills[0]} interview questions\n`;
  strategy += "• Prepare STAR stories: Situation, Task, Action, Result\n";
  strategy += "• Research companies before interviews\n";
  strategy += "• Prepare 3-5 questions to ask interviewers\n\n";
  
  // Salary Negotiation
  strategy += "**💰 Salary Range for Your Profile**\n";
  if (isIndia) {
    const salary = generateIndianSalary(exp, 85);
    strategy += `• Expected range: ${salary}\n`;
    strategy += "• Negotiate based on skills and company size\n";
    strategy += "• Include benefits: PF, Medical, Bonus, Stock options\n";
  } else {
    const salary = generateSalaryRange(exp, 85);
    strategy += `• Expected range: ${salary}\n`;
    strategy += "• Factor in benefits: Health, 401k, PTO, Remote stipend\n";
  }
  strategy += "\n";
  
  // Networking Strategy
  strategy += "**🤝 Networking Action Plan**\n";
  strategy += "• Send 5 connection requests daily to tech recruiters\n";
  strategy += `• Join ${primarySkill} developer communities on LinkedIn\n`;
  strategy += "• Comment on industry posts to increase visibility\n";
  strategy += "• Attend virtual tech meetups and webinars\n\n";
  
  // Follow-up Strategy
  strategy += "**📧 Application Follow-up**\n";
  strategy += "• Wait 5-7 days after applying\n";
  strategy += "• Send polite follow-up email to recruiter\n";
  strategy += "• Connect with team members on LinkedIn\n";
  strategy += "• Keep applying while waiting for responses\n\n";
  
  // Weekly Goals
  strategy += `**🎯 This Week's Goals (${currentDate})**\n`;
  strategy += "• Apply to 20+ relevant positions\n";
  strategy += "• Update LinkedIn profile with recent projects\n";
  strategy += "• Complete 5 coding challenges on LeetCode\n";
  strategy += "• Reach out to 3 former colleagues for referrals\n";
  
  return strategy;
}

// Process profile smartly
function processProfileSmart(profile) {
  const skills = (profile.skills || '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // Determine primary and secondary skills
  const primarySkill = skills[0] || 'Developer';
  const secondarySkill = skills[1] || '';
  const topSkills = skills.slice(0, 5);
  
  // Determine location type
  const location = profile.location || 'Remote';
  const isIndia = location.toLowerCase().includes('india') || 
                  ['mumbai', 'delhi', 'bangalore', 'pune', 'hyderabad', 'chennai', 'kolkata', 'gurgaon', 'noida']
                  .some(city => location.toLowerCase().includes(city));
  const isRemote = location.toLowerCase().includes('remote');
  
  // Extract city
  let city = 'Remote';
  if (!isRemote) {
    const cityMatch = location.split(',')[0].trim();
    city = cityMatch || 'Remote';
  }
  
  // Determine experience level
  const exp = parseInt(profile.experience_years) || 0;
  const level = exp >= 8 ? 'Senior' : (exp >= 4 ? 'Mid-Level' : (exp >= 1 ? 'Junior' : 'Entry Level'));
  
  // Determine job titles based on skills
  const possibleTitles = [];
  
  // Check for specific frameworks/technologies
  const hasLaravel = skills.some(s => s.toLowerCase().includes('laravel'));
  const hasVue = skills.some(s => s.toLowerCase().includes('vue'));
  const hasReact = skills.some(s => s.toLowerCase().includes('react'));
  const hasNode = skills.some(s => s.toLowerCase().includes('node'));
  const hasPHP = skills.some(s => s.toLowerCase().includes('php'));
  const hasPython = skills.some(s => s.toLowerCase().includes('python'));
  
  if (hasLaravel && hasVue) {
    possibleTitles.push(`${level} Laravel + Vue.js Developer`);
  }
  if (hasReact && hasNode) {
    possibleTitles.push(`${level} MERN Stack Developer`);
  }
  if (hasPHP && hasLaravel) {
    possibleTitles.push(`${level} PHP/Laravel Developer`);
  }
  
  // Add generic titles based on skills
  possibleTitles.push(
    `${level} ${primarySkill} Developer`,
    `${level} Full Stack Developer`,
    `${level} Software Developer`,
    `${level} Software Engineer`
  );
  
  return {
    name: profile.name || 'Job Seeker',
    skills,
    topSkills,
    primarySkill,
    secondarySkill,
    location,
    isIndia,
    isRemote,
    city,
    exp,
    level,
    possibleTitles: [...new Set(possibleTitles)],
    original: profile
  };
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { aiJobSearchBackup };
}
