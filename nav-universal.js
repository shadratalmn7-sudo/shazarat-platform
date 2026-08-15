(() => {
  const nav = document.querySelector('header .nav');
  if (!nav || document.querySelector('.global-hamburger')) return;

  const button = document.createElement('button');
  button.className = 'global-hamburger';
  button.type = 'button';
  button.setAttribute('aria-label', 'فتح القائمة');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span aria-hidden="true">☰</span>';
  nav.appendChild(button);

  const menu = document.createElement('div');
  menu.className = 'global-menu';
  menu.setAttribute('aria-hidden', 'true');
  menu.innerHTML = `
    <div class="global-menu-backdrop" data-menu-close></div>
    <aside class="global-menu-panel" aria-label="قائمة الموقع">
      <div class="global-menu-head">
        <img class="brand-logo" src="assets/shazarat-logo.svg" alt="شذرات للمنح">
        <button class="global-menu-close" type="button" aria-label="إغلاق القائمة" data-menu-close>×</button>
      </div>
      <nav class="global-menu-links">
        <a href="index.html">الرئيسية</a>
        <a href="scholarships.html">المنح</a>
        <a href="community.html">مجتمع شذرات</a>
        <a href="services.html">الخدمات</a>
        <a href="offers.html">العروض</a>
        <a href="videos.html">الفيديوهات والقنوات</a>
        <a href="contact.html">تواصل معنا</a>
        <a href="profile.html">حساب الطالب</a>
      </nav>
      <div class="global-menu-actions">
        <a href="login.html">تسجيل الدخول</a>
        <a class="primary" href="register.html">إنشاء حساب</a>
      </div>
    </aside>`;
  document.body.appendChild(menu);

  if (document.body.dataset.role === 'owner') {
    const links = menu.querySelector('.global-menu-links');
    links.insertAdjacentHTML('beforeend', `
      <div style="height:1px;background:#e5ddce;margin:6px 0"></div>
      <a href="admin-analytics.html">إحصائيات المالك</a>
      <a href="admin-scholarships.html">إدارة المنح والمحتوى</a>
      <a href="admin-orders.html">الطلبات والخدمات</a>
      <a href="admin-messages.html">الرسائل والشكاوى</a>
      <a href="admin-revenue.html">الإعلانات والدخل</a>
      <a href="admin-security.html">الأمان والسجل</a>`);
  }

  const page = location.pathname.split('/').pop() || 'index.html';
  menu.querySelectorAll('.global-menu-links a').forEach((link) => {
    if (link.getAttribute('href') === page) {
      link.classList.add('is-current');
      link.setAttribute('aria-current', 'page');
    }
  });

  const setOpen = (open) => {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    button.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  };

  button.addEventListener('click', () => setOpen(true));
  menu.querySelectorAll('[data-menu-close]').forEach((item) => item.addEventListener('click', () => setOpen(false)));
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setOpen(false); });
  import('./nav-auth.js?v=3').catch(() => {});
  import('./scholarship-extra.js?v=1').catch(() => {});
  import('./analytics.js?v=1').catch(() => {});
  import('./admin-live-data.js?v=1').catch(() => {});
})();
