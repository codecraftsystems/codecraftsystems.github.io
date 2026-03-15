(function () {
  function depthFromPath() {
    var clean = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (!clean) return 0;
    return clean.split('/').length - 1;
  }

  function toRoot(path) {
    var prefix = '../'.repeat(depthFromPath());
    return prefix + path.replace(/^\//, '');
  }

  function headerHtml() {
    var links = [
      ['Home', 'index.html'],
      ['Services', 'services/cloud-deployment-devops.html'],
      ['Developers', 'developers/index.html'],
      ['Jobs', 'jobs/index.html'],
      ['AI Job Search', 'find-jobs-with-ai/index.html'],
      ['Blog', 'blog/index.html'],
      ['Submit Profile', 'submit-profile/index.html'],
      ['Contact', 'https://wa.me/919016135299', true]
    ];

    var navLinks = links.map(function (item) {
      return '<li><a ' + (item[2] ? 'target="_blank" rel="noopener" ' : '') + 'href="' + (item[2] ? item[1] : toRoot(item[1])) + '" class="' + (item[0] === 'Contact' ? 'ccs-nav-cta' : '') + '">' + item[0] + '</a></li>';
    }).join('');

    return '<header class="ccs-site-header"><nav id="nav" class="nav"><div class="ccs-nav-inner"><a class="ccs-logo" href="' + toRoot('index.html') + '">Code<span>Craft</span></a><ul class="ccs-nav-links ccs-desktop-nav">' + navLinks + '</ul><button class="ccs-mobile-toggle" aria-label="Open menu" type="button">☰</button></div></nav><div class="ccs-mobile-panel" id="ccsMobilePanel" aria-hidden="true"><div class="ccs-mobile-panel-header"><button class="ccs-mobile-close" aria-label="Close menu" type="button">✕</button></div><ul class="ccs-mobile-links">' + navLinks + '</ul></div></header>';
  }

  function footerHtml() {
    return '<footer class="ccs-site-footer"><div class="ccs-footer-inner"><div class="ccs-footer-brand"><a class="ccs-logo" href="' + toRoot('index.html') + '">Code<span>Craft</span></a><p>Laravel, Vue.js and AI-powered web development for global startups and growing teams.</p></div><div class="ccs-footer-links"><h4>Explore</h4><a href="' + toRoot('developers-open-to-work/index.html') + '">Open to Work Developers</a><a href="' + toRoot('how-ai-finds-jobs/index.html') + '">How AI Finds Jobs</a><a href="' + toRoot('database/public-blogs.html') + '">Public Blogs (DB)</a></div><div class="ccs-footer-links"><h4>More Links</h4><a href="' + toRoot('auth/index.html') + '">Auth</a><a href="' + toRoot('developer/index.html') + '">Developer Profile</a><a href="' + toRoot('404.html') + '">404</a></div></div></footer>';
  }

  function replaceLayout() {
    var oldMenus = document.querySelectorAll('.mobile-menu, .mob-menu');
    oldMenus.forEach(function (el) { el.remove(); });

    var existingHeader = document.querySelector('header.ccs-site-header, nav#nav, nav#navbar, body > nav, body > header.nav, body > header');
    var headerWrapper = document.createElement('div');
    headerWrapper.innerHTML = headerHtml();
    var newHeader = headerWrapper.firstChild;

    if (existingHeader) {
      existingHeader.replaceWith(newHeader);
    } else {
      document.body.insertBefore(newHeader, document.body.firstChild);
    }

    var existingFooter = document.querySelector('footer');
    var footerWrapper = document.createElement('div');
    footerWrapper.innerHTML = footerHtml();
    var newFooter = footerWrapper.firstChild;
    if (existingFooter) {
      existingFooter.replaceWith(newFooter);
    } else {
      document.body.appendChild(newFooter);
    }

    var panel = document.getElementById('ccsMobilePanel');
    var openBtn = document.querySelector('.ccs-mobile-toggle');
    var closeBtn = document.querySelector('.ccs-mobile-close');

    function closeMenu() {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    openBtn && openBtn.addEventListener('click', function () {
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });

    closeBtn && closeBtn.addEventListener('click', closeMenu);
    panel && panel.addEventListener('click', function (event) {
      if (event.target.tagName === 'A' || event.target === panel) closeMenu();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', replaceLayout);
  } else {
    replaceLayout();
  }
})();
