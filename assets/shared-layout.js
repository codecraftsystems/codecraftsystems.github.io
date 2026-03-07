(function(){
  function prefix(){
    var seg=location.pathname.split('/').filter(Boolean);
    return seg.length<=1?'./':'../';
  }
  function toRelative(url,p){return url.replace(/^\//,p);}

  function headerTemplate(p){
    return '<header class="cc-header" data-cc-header><div class="cc-header-inner">'
      +'<a class="cc-brand" href="'+toRelative('/',p)+'">Code<span>Craft</span></a>'
      +'<button class="cc-menu-btn" type="button" aria-label="Toggle menu" aria-expanded="false" data-cc-menu-toggle><span></span><span></span><span></span></button>'
      +'<nav class="cc-nav" data-cc-nav>'
      +'<a href="'+toRelative('/',p)+'" data-nav-key="home">Home</a>'
      +'<a href="'+toRelative('/#services',p)+'" data-nav-key="services">Services</a>'
      +'<a href="'+toRelative('/developers/',p)+'" data-nav-key="developers">Developers</a>'
      +'<a href="'+toRelative('/find-jobs-with-ai/',p)+'" data-nav-key="jobs">Find Jobs with AI</a>'
      +'<a href="'+toRelative('/blog/',p)+'" data-nav-key="blog">Blog</a>'
      +'<a href="'+toRelative('/auth/',p)+'" class="cc-cta" data-nav-key="auth">Sign In</a>'
      +'</nav></div></header>';
  }

  function footerTemplate(p){
    return '<footer class="cc-footer" data-cc-footer><div class="cc-footer-inner">'
      +'<div class="cc-footer-brand">Code<span>Craft</span></div>'
      +'<p class="cc-footer-copy">© <span data-cc-year></span> CodeCraft Systems · All rights reserved.</p>'
      +'<nav class="cc-footer-links" aria-label="Footer links">'
      +'<a href="'+toRelative('/',p)+'">Home</a><a href="'+toRelative('/#services',p)+'">Services</a><a href="'+toRelative('/find-jobs-with-ai/',p)+'">Find Jobs with AI</a><a href="'+toRelative('/blog/',p)+'">Blog</a><a href="'+toRelative('/#contact',p)+'">Contact</a>'
      +'</nav></div></footer>';
  }

  function markActive(root){
    var path=location.pathname;
    var key='home';
    if(path.indexOf('/services/')===0) key='services';
    else if(path.indexOf('/developers')===0) key='developers';
    else if(path.indexOf('/find-jobs-with-ai')===0) key='jobs';
    else if(path.indexOf('/blog')===0) key='blog';
    else if(path.indexOf('/auth')===0) key='auth';
    var a=root.querySelector('[data-nav-key="'+key+'"]');
    if(a) a.classList.add('active');
  }

  document.addEventListener('DOMContentLoaded',function(){
    var p=prefix();
    var h=document.querySelector('[data-shared-header]');
    var f=document.querySelector('[data-shared-footer]');
    if(h) h.innerHTML=headerTemplate(p);
    if(f) f.innerHTML=footerTemplate(p);

    var root=document.querySelector('[data-cc-header]');
    if(root){
      markActive(root);
      var btn=root.querySelector('[data-cc-menu-toggle]');
      var nav=root.querySelector('[data-cc-nav]');
      if(btn&&nav){
        btn.addEventListener('click',function(){
          nav.classList.toggle('open');
          btn.setAttribute('aria-expanded', String(nav.classList.contains('open')));
        });
      }
    }

    document.querySelectorAll('[data-cc-year]').forEach(function(n){n.textContent=new Date().getFullYear();});
  });
})();
