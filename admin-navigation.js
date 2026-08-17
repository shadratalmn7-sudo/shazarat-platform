const css=document.createElement('link');css.rel='stylesheet';css.href='admin-navigation.css?v=2';document.head.appendChild(css);
const sections=[['admin-analytics.html','الرئيسية'],['admin-homepage.html','إدارة المحتوى'],['admin-users.html','الطلاب'],['admin-staff.html','الموظفون'],['admin-orders.html','الطلبات والدعم'],['admin-community.html','المجتمع'],['admin-gamification.html','XP والإشعارات'],['admin-security.html','النظام والدخل']];
const current=location.pathname.split('/').pop();const aliases={
'admin-scholarships.html':'admin-homepage.html','admin-services.html':'admin-homepage.html','admin-offers.html':'admin-homepage.html','admin-videos.html':'admin-homepage.html',
'admin-messages.html':'admin-orders.html','admin-announcements.html':'admin-gamification.html','admin-revenue.html':'admin-security.html'};
const active=aliases[current]||current;document.querySelectorAll('.admin-nav').forEach(nav=>{nav.innerHTML=sections.map(([href,label])=>`<a href="${href}" class="${active===href?'active':''}">${label}</a>`).join('')});
