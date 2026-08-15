import{getApp,getApps,initializeApp}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import{getAuth,onAuthStateChanged}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import{doc,getDoc,getFirestore}from'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import{firebaseConfig}from'./firebase-config.js';
const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),OWNER='shadrat.almn7@gmail.com';
export async function requireAdmin(){return new Promise((resolve,reject)=>{const stop=onAuthStateChanged(auth,async user=>{stop();if(!user)return reject(new Error('not-authenticated'));try{const snap=await getDoc(doc(db,'users',user.uid)),role=user.email===OWNER?'owner':snap.data()?.role;if(!['owner','support'].includes(role))return reject(new Error('not-authorized'));resolve({user,role})}catch(error){reject(error)}})})}
