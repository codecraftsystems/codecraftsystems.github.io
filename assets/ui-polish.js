(function () {
  var SESSION_KEY = 'cc_session';

  function getSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.email || !data.loginAt) return null;
      if (Date.now() - data.loginAt > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  function goToProfile() {
    var session = getSession();
    if (session) {
      window.location.href = '../submit-profile/';
      return;
    }
    window.location.href = '../auth/?next=' + encodeURIComponent('../submit-profile/');
  }

  function openFindJobsGuide() {
    var tips = [
      'Paste this in AI: "Find remote Laravel + Vue.js jobs in UK/US, salary > $60k, visa friendly."',
      'Paste this in AI: "Optimize my profile summary for full-stack SaaS roles with APIs, Vue, cloud deployment."',
      'Paste this in AI: "Create a 30-day job application plan for backend/full-stack developer roles."'
    ];
    alert('AI Job Prompt Ideas:\n\n• ' + tips.join('\n• '));
  }

  function injectActions(target) {
    if (!target || target.querySelector('.ui-polish-cta')) return;

    var box = document.createElement('div');
    box.className = 'ui-polish-cta';
    box.innerHTML = [
      '<div class="ui-polish-row">',
      '  <button type="button" class="ui-polish-btn primary" data-action="profile">🚀 Create Talent Profile</button>',
      '  <button type="button" class="ui-polish-btn" data-action="jobs">🤖 Find Jobs with AI</button>',
      '</div>',
      '<p class="ui-polish-tip">If you are not logged in, we will open secure Email OTP login first. After login, you go directly to profile setup.</p>'
    ].join('');

    box.querySelector('[data-action="profile"]').addEventListener('click', goToProfile);
    box.querySelector('[data-action="jobs"]').addEventListener('click', openFindJobsGuide);

    target.appendChild(box);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var session = getSession();

    var emailPanel = document.getElementById('pEmail');
    if (emailPanel) injectActions(emailPanel);

    var blogHero = document.querySelector('.blog-hero-inner') || document.querySelector('.article-wrap') || document.querySelector('.container');
    if (blogHero) injectActions(blogHero);

    var navCta = document.querySelector('#navProfileLink');
    if (navCta) {
      if (session) {
        navCta.textContent = 'My Profile';
        navCta.href = '../submit-profile/';
      } else {
        navCta.textContent = 'Create Profile';
        navCta.href = '../auth/?next=' + encodeURIComponent('../submit-profile/');
      }
    }
  });
})();
