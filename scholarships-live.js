import { getApp, getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import { collection, getDocs, getFirestore, query, where } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

if (location.pathname.endsWith('/scholarships.html')) {
  const link=document.createElement('link');link.rel='stylesheet';link.href='scholarships-enhanced.css?v=1';document.head.appendChild(link);
  const app=getApps().length?getApp():initializeApp(firebaseConfig),db=getFirestore(app),cards=document.querySelector('.cards');
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  try{
    const snap=await getDocs(query(collection(db,'scholarships'),where('publishStatus','==','published')));
    const items=snap.docs.map(d=>d.data()).sort((a,b)=>(a.sortOrder??999)-(b.sortOrder??999));
    for(const s of items){
      if(document.querySelector(`[data-scholarship-slug="${CSS.escape(s.slug)}"]`))continue;
      const levels=Array.isArray(s.studyLevels)?s.studyLevels.slice(0,3):[];
      cards?.insertAdjacentHTML('beforeend',`<article class="card live-scholarship" data-scholarship-slug="${esc(s.slug)}"><div class="scholarship-mark">${esc((s.country||'✦').slice(0,2))}</div><div class="scholarship-kicker">${esc(s.provider||'فرصة موثقة')}</div><span class="tag">${esc(s.statusLabel||'متاحة')}</span><h2>${esc(s.title)}</h2><p class="muted">${esc(s.shortDescription)}</p><div class="meta-row"><span>${esc(s.country||'دولي')}</span>${levels.map(x=>`<span>${esc(x)}</span>`).join('')}</div><a class="btn" href="scholarship.html?slug=${encodeURIComponent(s.slug)}">عرض الدليل الكامل</a></article>`);
    }
  }catch(e){console.warn('Scholarships load failed',e)}
}
