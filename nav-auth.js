import { getApp, getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';
const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app);
const logout=async()=>{await signOut(auth);location.replace('index.html')};
document.querySelectorAll('span.btn,span.dark').forEach(el=>{if(/إنشاء|حساب/.test(el.textContent)){el.setAttribute('role','link');el.tabIndex=0;el.style.cursor='pointer';const go=()=>location.href='register.html';el.addEventListener('click',go);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')go()})}});
onAuthStateChanged(auth,user=>{
  document.querySelectorAll('a[href="login.html"],a[href="register.html"]').forEach(a=>a.hidden=!!user);
  document.querySelectorAll('[data-auth-logout]').forEach(b=>b.remove());
  if(!user)return;
  document.querySelectorAll('.global-menu-actions,.actions,.nav-actions,.menu-cta').forEach(area=>{
    const b=document.createElement('button');b.type='button';b.dataset.authLogout='';b.textContent='تسجيل الخروج';b.style.cssText='border:0;border-radius:14px;padding:12px 18px;background:#b42318;color:#fff;font:inherit;font-weight:900;cursor:pointer';b.addEventListener('click',logout);area.appendChild(b);
  });
});
