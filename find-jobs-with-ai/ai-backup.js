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
function getEnhancedPrompt(profile) {
  const { primarySkill, secondarySkill, city, isIndia, isRemote, exp, level } = profile;
  
  return `You are a job search assistant. Return ONLY a valid JSON with 5 REALISTIC jobs.

CONTEXT:
- Role: ${primarySkill} ${secondarySkill} Developer
- Experience: ${exp} years (${level} level)
- Location: ${city}${isIndia ? ', India' : ''}
- Job Type: ${isRemote ? 'Remote' : 'On-site/Hybrid'}

REQUIREMENTS:
1. Return COMPLETE JSON (don't cut off mid-response)
2. Include 5 jobs minimum
3. All fields must be filled
4. Use REAL company names (not "Example" or "Test")
5. URLs must be working job portals

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
- Complete all 5 jobs before finishing

Generate jobs now:`;
}

// Try AI search with enhanced prompt
async function tryAISearch(profile) {
  const prompt = getEnhancedPrompt(profile);
  
  console.log('📤 Sending enhanced prompt to AI...');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for complete response

    const response = await fetch("https://ai.buldel.com/cloud-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt,
        temperature: 0.7,
        max_tokens: 2000, // Increased token limit for complete response
        top_p: 0.9
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Check if we got a valid response
    if (data?.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content;
      
      // Check if response was cut off (finish_reason = "length")
      const finishReason = data.choices[0]?.finish_reason;
      const isIncomplete = finishReason === "length" || content.includes('...') || content.length < 500;
      
      if (isIncomplete) {
        console.log('⚠️ AI response incomplete (finish_reason: length)');
        const partialResult = parseAIResponse(content, profile);
        if (partialResult) {
          partialResult._incomplete = true;
          return partialResult;
        }
        return null;
      }
      
      return parseAIResponse(content, profile);
    }
    
    return null;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('⏱️ AI request timed out');
    } else {
      console.log('⚠️ AI request failed:', error.message);
    }
    return null;
  }
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
    // Clean the content - remove markdown code blocks if present
    let cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Find JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      // Try to fix truncated JSON
      console.log('⚠️ JSON parse failed, attempting to fix...');
      const fixedJson = fixTruncatedJson(jsonMatch[0]);
      parsed = JSON.parse(fixedJson);
    }
    
    if (parsed.jobs && Array.isArray(parsed.jobs) && parsed.jobs.length > 0) {
      // Validate and fix each job
      parsed.jobs = parsed.jobs.map(job => validateAndFixJob(job, profile));
      return parsed;
    }
    
    return null;
  } catch (e) {
    console.log('⚠️ Failed to parse AI response:', e.message);
    return null;
  }
}

// Fix truncated JSON
function fixTruncatedJson(truncated) {
  // Count opening and closing braces
  const openBraces = (truncated.match(/\{/g) || []).length;
  const closeBraces = (truncated.match(/\}/g) || []).length;
  
  // If we have more opens than closes, add missing closing braces
  if (openBraces > closeBraces) {
    truncated += '}'.repeat(openBraces - closeBraces);
  }
  
  // Check if last job is cut off
  if (truncated.includes('"jobs":') && !truncated.trim().endsWith(']}')) {
    // Add closing for jobs array and main object
    truncated += ']}';
  }
  
  return truncated;
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
  
  // Generate proper URLs
  fixedJob.url = generateSmartUrl(fixedJob, profile);
  fixedJob.apply_url = fixedJob.url;
  
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
  const primarySkill = profile.primarySkill.toLowerCase();
  const role = (job.role || '').toLowerCase();
  const searchTerms = encodeURIComponent(`${primarySkill} ${role} developer`);
  const city = profile.city ? encodeURIComponent(profile.city) : '';
  
  // India-specific URLs with proper formatting
  if (profile.isIndia) {
    const platforms = [
      `https://www.naukri.com/${primarySkill}-jobs-in-${profile.city?.toLowerCase().replace(/\s+/g, '-') || 'india'}`,
      `https://www.indeed.co.in/jobs?q=${searchTerms}&l=${city}%2C+India`,
      `https://in.linkedin.com/jobs/${primarySkill}-developer-jobs-${profile.city?.toLowerCase().replace(/\s+/g, '-')}`,
      `https://www.timesjobs.com/candidate/job-search.html?txtKeywords=${searchTerms}&txtLocation=${city}`,
      `https://www.monsterindia.com/search/${primarySkill}-jobs-in-${profile.city?.toLowerCase().replace(/\s+/g, '-') || 'india'}`
    ];
    return platforms[Math.floor(Math.random() * platforms.length)];
  }
  
  // Remote URLs
  if (profile.isRemote) {
    const platforms = [
      `https://remoteok.com/remote-${primarySkill}-jobs`,
      `https://weworkremotely.com/remote-jobs/search?term=${searchTerms}`,
      `https://remotive.com/remote-jobs/${primarySkill}`,
      `https://wellfound.com/role/${primarySkill}-developer?remote=true`,
      `https://www.linkedin.com/jobs/search/?keywords=${searchTerms}&f_WT=2`
    ];
    return platforms[Math.floor(Math.random() * platforms.length)];
  }
  
  // International URLs
  const platforms = [
    `https://www.linkedin.com/jobs/search/?keywords=${searchTerms}&location=${city}`,
    `https://www.indeed.com/jobs?q=${searchTerms}&l=${city}`,
    `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${searchTerms}&locKeyword=${city}`,
    `https://www.careerbuilder.com/jobs?keywords=${searchTerms}&location=${city}`,
    `https://www.dice.com/jobs?q=${searchTerms}&l=${city}`
  ];
  return platforms[Math.floor(Math.random() * platforms.length)];
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
  strategy += "**🎯 This Week's Goals (${currentDate})**\n";
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