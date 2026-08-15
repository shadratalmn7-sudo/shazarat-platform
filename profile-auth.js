import { getApp, getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { doc, getDoc, getFirestore } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
document.documentElement.classList.add('auth-checking');
onAuthStateChanged(auth,async user=>{
  if(!user){location.replace(`login.html?next=${encodeURIComponent('profile.html')}`);return}
  const snap=await getDoc(doc(db,'users',user.uid)),p=snap.exists()?snap.data():{};
  const values={fullName:p.fullName||user.displayName||'طالب شذرات',username:p.username||`student_${user.uid.slice(0,6)}`,email:user.email||'',phone:p.phoneLast4?`•••• ${p.phoneLast4}`:'لم تتم إضافته',location:p.location||'',studyLevel:p.studyLevel||''};
  document.querySelectorAll('[data-profile-value]').forEach(el=>{const k=el.dataset.profileValue;el.textContent=k==='username'?`@${values[k]}`:(values[k]||'لم يتم تحديدها')});
  const h=document.querySelector('.student-name h2'),handle=document.querySelector('.student-name .handle');if(h)h.textContent=`مرحبًا، ${values.fullName}`;if(handle)handle.textContent=`@${values.username}`;
  document.documentElement.classList.remove('auth-checking');
});
