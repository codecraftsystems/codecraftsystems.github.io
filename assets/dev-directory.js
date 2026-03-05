(function(){
  const FALLBACK_AVATAR = 'https://api.dicebear.com/8.x/bottts/svg?seed=laravel-vue-developer';
  const cfg = window.APP_CONFIG || {};
  const supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  const q = (s,root=document)=>root.querySelector(s);
  const slugify = (str='') => str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-');
  const esc = (s='') => String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const session = {
    get(){ try{return JSON.parse(localStorage.getItem('dev_auth')||'null')}catch{return null}},
    set(v){localStorage.setItem('dev_auth',JSON.stringify(v))},
    clear(){localStorage.removeItem('dev_auth')}
  };

  async function loadDevelopers({openOnly=false}={}){
    const grid = q('#developersGrid'); if(!grid) return;
    grid.innerHTML = '<p class="muted">Loading developers…</p>';
    let query = supabase.from('developers').select('*').order('open_to_work',{ascending:false}).order('created_at',{ascending:false});
    if(openOnly) query = query.eq('open_to_work', true);
    const {data,error} = await query;
    if(error){grid.innerHTML = `<p class="muted">${esc(error.message)}</p>`; return;}
    renderCards(data||[]);
    q('#searchInput')?.addEventListener('input', e=>{
      const t=e.target.value.toLowerCase();
      renderCards((data||[]).filter(d=>[d.name,d.title,d.skills].join(' ').toLowerCase().includes(t)));
    });

    function renderCards(items){
      if(!items.length){grid.innerHTML='<p class="muted">No profiles yet.</p>'; return;}
      grid.innerHTML = items.map(d=>`<article class="card"><div class="card-top"><img class="avatar" src="${esc(d.profile_image||FALLBACK_AVATAR)}" onerror="this.src='${FALLBACK_AVATAR}'" alt="${esc(d.name)}"/><div><h3 class="name">${esc(d.name)}</h3><p class="title">${esc(d.title||'Laravel & Vue.js Developer')}</p></div></div><p class="skills">${esc(d.skills||'')||'Skills not added yet.'}</p><p class="muted">Experience: ${Number(d.experience_years||0)} years</p>${d.open_to_work?'<span class="badge ok">Open to Work</span>':''}<a class="btn" href="/developer/${esc(d.slug||slugify(d.name))}">View Profile</a></article>`).join('');
    }
  }

  async function loadProfile(){
    const root = q('#profileRoot'); if(!root) return;
    const pathSlug = location.pathname.split('/').filter(Boolean)[1];
    const querySlug = new URLSearchParams(location.search).get('slug');
    const slug = pathSlug || querySlug;
    if(!slug){root.innerHTML='<p class="muted">Developer slug missing.</p>';return;}
    const {data,error} = await supabase.from('developers').select('*').eq('slug',slug).single();
    if(error||!data){root.innerHTML='<p class="muted">Profile not found.</p>'; return;}
    document.title = `${data.name} | ${data.title||'Developer'} | CodeCraft Systems`;
    q('meta[name="description"]')?.setAttribute('content',(data.bio||`${data.name} - ${data.title||'Laravel & Vue.js Developer'}`).slice(0,160));
    q('link[rel="canonical"]')?.setAttribute('href', `${cfg.SITE_URL}/developer/${data.slug}`);
    root.innerHTML = `<section class="panel profile"><img class="avatar" src="${esc(data.profile_image||FALLBACK_AVATAR)}" onerror="this.src='${FALLBACK_AVATAR}'" alt="${esc(data.name)}"><div class="meta"><h1>${esc(data.name)}</h1><p class="muted">${esc(data.title||'Laravel & Vue.js Developer')}</p>${data.open_to_work?'<span class="badge ok">Open to Work</span>':''}<p>${esc(data.bio||'No bio yet.')}</p><p><strong>Skills:</strong> ${esc(data.skills||'N/A')}</p><p><strong>Experience:</strong> ${Number(data.experience_years||0)} years</p><div class="links">${data.github_url?`<a class="btn secondary" href="${esc(data.github_url)}" target="_blank">GitHub</a>`:''}${data.linkedin_url?`<a class="btn secondary" href="${esc(data.linkedin_url)}" target="_blank">LinkedIn</a>`:''}${data.portfolio_url?`<a class="btn secondary" href="${esc(data.portfolio_url)}" target="_blank">Portfolio</a>`:''}</div></div></section>`;
  }

  function authPage(){
    const form = q('#authForm'); if(!form) return;
    const verifyBox=q('#verifyBox'); let email='';
    form.addEventListener('submit', async e=>{
      e.preventDefault();
      email=q('#email').value.trim().toLowerCase();
      const otp=(Math.floor(100000+Math.random()*900000)).toString();
      const expiresAt=new Date(Date.now()+10*60*1000).toISOString();
      const {error:dbErr}=await supabase.from('email_otps').insert({email,otp,expires_at:expiresAt,used:false});
      if(dbErr) return alert(dbErr.message);
      const payload={sender:{name:cfg.FROM_NAME,email:cfg.FROM_EMAIL},to:[{email}],subject:'Your CodeCraft OTP',htmlContent:`<p>Your OTP is <b>${otp}</b>. Valid for 10 minutes.</p>`};
      const resp=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'Content-Type':'application/json','api-key':cfg.BREVO_API_KEY},body:JSON.stringify(payload)});
      if(!resp.ok) return alert('Brevo email failed. Please verify API key/domain.');
      verifyBox.classList.remove('hidden');
      alert('OTP sent successfully.');
    });

    q('#verifyBtn')?.addEventListener('click', async ()=>{
      const otp=q('#otp').value.trim();
      const {data,error}=await supabase.from('email_otps').select('*').eq('email',email).eq('otp',otp).eq('used',false).order('created_at',{ascending:false}).limit(1);
      if(error||!data?.length) return alert('Invalid OTP');
      const row=data[0]; if(new Date(row.expires_at)<new Date()) return alert('OTP expired');
      await supabase.from('email_otps').update({used:true}).eq('id',row.id);
      session.set({email,loggedInAt:new Date().toISOString()});
      location.href='/submit-profile/';
    });
  }

  function submitPage(){
    const form=q('#profileForm'); if(!form) return;
    const current=session.get();
    q('#authState').textContent = current?`Logged in as ${current.email}`:'Not logged in';
    q('#logoutBtn')?.addEventListener('click',()=>{session.clear();location.reload();});
    if(!current){q('#formWrap').innerHTML='<p class="muted">Please <a href="/auth/">login with OTP</a> first.</p>';return;}

    (async()=>{
      const {data}=await supabase.from('developers').select('*').eq('email',current.email).maybeSingle();
      if(data){['name','title','skills','experience_years','github_url','linkedin_url','portfolio_url','bio','profile_image'].forEach(k=>{if(q(`#${k}`)&&data[k]!=null) q(`#${k}`).value=data[k];}); q('#open_to_work').checked=!!data.open_to_work;}
    })();

    form.addEventListener('submit', async e=>{
      e.preventDefault();
      const name=q('#name').value.trim();
      if(name.length<2) return alert('Name is required');
      const payload={
        email: current.email,
        name,
        slug: slugify(`${name} ${q('#title').value||''}`),
        title:q('#title').value.trim(),
        skills:q('#skills').value.trim(),
        experience_years:Number(q('#experience_years').value||0),
        github_url:q('#github_url').value.trim(),
        linkedin_url:q('#linkedin_url').value.trim(),
        portfolio_url:q('#portfolio_url').value.trim(),
        bio:q('#bio').value.trim(),
        profile_image:q('#profile_image').value.trim(),
        open_to_work:q('#open_to_work').checked
      };
      const {error}=await supabase.from('developers').upsert(payload,{onConflict:'email'});
      if(error) return alert(error.message);
      q('#saved').classList.remove('hidden');
    });
  }

  window.DevDirectory = {loadDevelopers,loadProfile,authPage,submitPage};
})();
