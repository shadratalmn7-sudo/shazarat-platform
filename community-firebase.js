import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { addDoc, collection, getFirestore, limit, onSnapshot, orderBy, query, serverTimestamp, where } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const status = document.querySelector('#community-status');
const postsRoot = document.querySelector('#community-posts');
const composerButton = document.querySelector('[data-requires-account]');
const loginDialog = document.querySelector('#login-dialog');
const postDialog = document.querySelector('#post-dialog');
const postForm = document.querySelector('#community-post-form');
const postMessage = document.querySelector('#post-form-message');
let currentUser = null;

const typeLabels = {question:'سؤال',experience:'تجربة طالب',info:'معلومة',guide:'دليل',update:'تحديث',warning:'تحذير',accepted:'نتيجة قبول'};
const scholarshipLabels = {'open-doors':'Open Doors','education-in-russia':'Education in Russia'};
const open = (element) => { element?.classList.add('is-open'); element?.setAttribute('aria-hidden','false'); document.body.classList.add('menu-open'); };
const close = (element) => { element?.classList.remove('is-open'); element?.setAttribute('aria-hidden','true'); document.body.classList.remove('menu-open'); };

document.querySelectorAll('[data-post-close]').forEach((button) => button.addEventListener('click', () => close(postDialog)));
composerButton?.addEventListener('click', (event) => {
  event.stopImmediatePropagation();
  if (currentUser) open(postDialog); else open(loginDialog);
});

function renderEmpty() {
  status.hidden = false;
  status.querySelector('h2').textContent = 'لا توجد مشاركات حتى الآن';
  status.querySelector('p').textContent = 'كن أول من يطرح سؤالًا مفيدًا بعد تسجيل الدخول. لن نملأ المجتمع ببيانات وهمية.';
  postsRoot.replaceChildren();
}

function renderError() {
  status.hidden = false;
  status.querySelector('h2').textContent = 'تعذّر تحميل المجتمع';
  status.querySelector('p').textContent = 'قاعدة البيانات لم تُفتح للقراءة بعد أو حدث انقطاع. حاول تحديث الصفحة لاحقًا.';
}

function postCard(id, post) {
  const article = document.createElement('article');
  article.className = 'community-post';
  article.dataset.postId = id;
  const head = document.createElement('div'); head.className = 'post-head';
  const author = document.createElement('div'); author.className = 'post-author';
  const avatar = document.createElement('span'); avatar.className = 'avatar'; avatar.textContent = (post.authorUsername || 'ش').slice(0,1).toUpperCase();
  const who = document.createElement('div');
  const name = document.createElement('b'); name.textContent = `@${post.authorUsername || 'طالب_شذرات'}`;
  const level = document.createElement('small'); level.textContent = `المستوى ${Number(post.authorLevel) || 1}`;
  who.append(name, level); author.append(avatar, who);
  const badge = document.createElement('span'); badge.className = 'post-badge'; badge.textContent = typeLabels[post.type] || 'مشاركة';
  head.append(author, badge); article.append(head);
  if (post.title) { const title = document.createElement('h2'); title.textContent = post.title; article.append(title); }
  const body = document.createElement('p'); body.className = 'post-body'; body.textContent = post.body; article.append(body);
  const meta = document.createElement('div'); meta.className = 'post-meta';
  if (post.scholarshipSlug) { const scholarship = document.createElement('span'); scholarship.textContent = scholarshipLabels[post.scholarshipSlug] || post.scholarshipSlug; meta.append(scholarship); }
  const date = document.createElement('span'); date.textContent = post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString('ar-SA') : 'الآن'; meta.append(date); article.append(meta);
  const actions = document.createElement('div'); actions.className = 'post-actions';
  for (const label of ['مفيد','تعليق','حفظ','إبلاغ']) { const button = document.createElement('button'); button.type='button'; button.textContent=label; button.addEventListener('click',()=> currentUser ? null : open(loginDialog)); actions.append(button); }
  article.append(actions);
  return article;
}

const feedQuery = query(collection(db,'communityPosts'), where('status','==','published'), orderBy('createdAt','desc'), limit(10));
onSnapshot(feedQuery, (snapshot) => {
  if (snapshot.empty) return renderEmpty();
  status.hidden = true;
  postsRoot.replaceChildren(...snapshot.docs.map((item) => postCard(item.id,item.data())));
}, renderError);

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (composerButton) composerButton.textContent = user ? 'اكتب سؤالًا أو تجربة...' : 'سجّل دخولك للمشاركة';
});

postForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) return open(loginDialog);
  const body = document.querySelector('#new-post-body').value.trim();
  if (body.length < 10) { postMessage.textContent = 'اكتب 10 أحرف على الأقل.'; return; }
  const personalData = /(?:\+?\d[\d\s-]{7,}|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/;
  if (personalData.test(body)) { postMessage.textContent = 'احذف رقم الهاتف أو البريد من المنشور لحماية خصوصيتك.'; return; }
  const submit = postForm.querySelector('[type="submit"]'); submit.disabled = true; postMessage.textContent = 'جاري النشر...';
  try {
    await addDoc(collection(db,'communityPosts'), {
      authorId: currentUser.uid,
      authorUsername: currentUser.displayName || 'طالب_شذرات',
      authorLevel: 1,
      title: document.querySelector('#new-post-title').value.trim(), body,
      type: document.querySelector('#new-post-type').value,
      scholarshipSlug: document.querySelector('#new-post-scholarship').value,
      status: 'published', imageCount: 0, helpfulCount: 0, commentCount: 0, saveCount: 0,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), deletedAt: null
    });
    postForm.reset(); close(postDialog);
  } catch (error) {
    postMessage.textContent = error.code === 'permission-denied' ? 'النشر غير متاح حتى يكتمل ملف حسابك وتُنشر قواعد الحماية.' : 'حدث خطأ ولم يُنشر المحتوى. حاول مجددًا.';
  } finally { submit.disabled = false; }
});
