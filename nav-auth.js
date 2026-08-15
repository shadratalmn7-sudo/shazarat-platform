import { getApp, getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { doc, getDoc, getFirestore } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const ownerLinks=`<div class="owner-menu-divider" style="height:1px;background:#e5ddce;margin:6px 0"></div><a data-owner-link href="admin-analytics.html">إحصائيات المالك</a><a data-owner-link href="admin-homepage.html">إدارة الرئيسية</a><a data-owner-link href="admin-scholarships.html">إدارة المنح</a><a data-owner-link href="admin-services.html">إدارة الخدمات</a><a data-owner-link href="admin-offers.html">إدارة العروض</a><a data-owner-link href="admin-orders.html">طلبات الخدمات</a><a data-owner-link href="admin-community.html">إدارة المجتمع</a><a data-owner-link href="admin-videos.html">إدارة الفيديوهات</a><a data-owner-link href="admin-users.html">المستخدمون والفريق</a><a data-owner-link href="admin-gamification.html">XP والمهمات والجوائز</a><a data-owner-link href="admin-announcements.html">التنبيهات</a><a data-owner-link href="admin-messages.html">الرسائل والشكاوى</a><a data-owner-link href="admin-revenue.html">الإعلانات والدخل</a><a data-owner-link href="admin-security.html">الأمان والسجل</a>`;
const logout=async()=>{await signOut(auth);location.replace('index.html')};
document.querySelectorAll('span.btn,span.dark').forEach(el=>{if(/إنشاء|حساب/.test(el.textContent)){el.setAttribute('role','link');el.tabIndex=0;el.style.cursor='pointer';const go=()=>location.href='register.html';el.addEventListener('click',go);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')go()})}});
onAuthStateChanged(auth,async user=>{
  document.querySelectorAll('a[href="login.html"],a[href="register.html"]').forEach(a=>{a.hidden=!!user;if(user)a.style.setProperty('display','none','important');else a.style.removeProperty('display')});
  document.querySelectorAll('[data-auth-logout]').forEach(b=>b.remove());
  if(!user){document.body.dataset.role='student';return;}
  let role='student';
  try{const snap=await getDoc(doc(db,'users',user.uid));role=user.email==='shadrat.almn7@gmail.com'?'owner':(snap.data()?.role||'student')}catch{}
  document.body.dataset.role=role;
  if(['owner','support'].includes(role)){
    const links=document.querySelector('.global-menu-links');
    if(links&&!links.querySelector('a[href="admin-analytics.html"]'))links.insertAdjacentHTML('beforeend',ownerLinks);
  }
  document.querySelectorAll('.global-menu-actions,.actions,.nav-actions,.menu-cta').forEach(area=>{
    const b=document.createElement('button');b.type='button';b.dataset.authLogout='';b.textContent='تسجيل الخروج';b.style.cssText='border:0;border-radius:14px;padding:12px 18px;background:#b42318;color:#fff;font:inherit;font-weight:900;cursor:pointer';b.addEventListener('click',logout);area.appendChild(b);
  });
});
