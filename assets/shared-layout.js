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
      ['Blog', 'blog/index.html'],
      ['Developers', 'developers/index.html'],
      ['Jobs', 'jobs/index.html'],
      ['Find Jobs with AI', 'find-jobs-with-ai/index.html', false, 'ccs-nav-feature'],
      ['Submit Profile', 'submit-profile/index.html', false, 'ccs-nav-cta']
    ];

    var navLinks = links.map(function (item) {
      return '<li><a href="' + toRoot(item[1]) + '" class="' + (item[3] || '') + '">' + item[0] + '</a></li>';
    }).join('');

    return '<header class="ccs-site-header"><div class="ccs-nav-inner"><a class="ccs-logo" href="' + toRoot('index.html') + '">Code<span>Craft</span></a><ul class="ccs-nav-links">' + navLinks + '</ul><button class="ccs-mobile-toggle" aria-label="Open menu" type="button">☰</button></div><div class="ccs-mobile-panel" id="ccsMobilePanel" aria-hidden="true"><div class="ccs-mobile-panel-header"><button class="ccs-mobile-close" aria-label="Close menu" type="button">✕</button></div><ul class="ccs-mobile-links">' + navLinks + '</ul></div></header>';
  }

  function footerHtml() {
    return '<footer class="ccs-site-footer"><div class="ccs-footer-inner"><div class="ccs-footer-brand"><a class="ccs-logo" href="' + toRoot('index.html') + '">Code<span>Craft</span></a><p>© ' + new Date().getFullYear() + ' CodeCraft Systems</p></div><div class="ccs-footer-links"><a href="' + toRoot('how-ai-finds-jobs/index.html') + '">How AI Works</a><a href="' + toRoot('developers-open-to-work/index.html') + '">Open to Work</a><a href="' + toRoot('database/public-blogs.html') + '">Public Blogs</a><a href="' + toRoot('auth/index.html') + '">Auth</a><a href="' + toRoot('404.html') + '">404</a></div></div></footer>';
  }

  function replaceLayout() {
    var oldMenus = document.querySelectorAll('.mobile-menu, .mob-menu, .mob');
    oldMenus.forEach(function (el) { el.remove(); });

    var existingHeader = document.querySelector('header.ccs-site-header, nav#nav, nav#navbar, nav.nav, body > nav');
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
      if (!panel) return;
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    openBtn && openBtn.addEventListener('click', function () {
      if (!panel) return;
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
