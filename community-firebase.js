import { getApp, getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, limit, onSnapshot, orderBy, query, serverTimestamp, where } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { scholarshipCatalog, mergeScholarships } from './scholarship-catalog.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
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
let currentProfile = null;

const typeLabels = {question:'سؤال',experience:'تجربة طالب',info:'معلومة',guide:'دليل',update:'تحديث',warning:'تحذير',accepted:'نتيجة قبول'};
let scholarships = scholarshipCatalog.filter((item) => item.publishStatus === 'published');
let scholarshipLabels = Object.fromEntries(scholarships.map((item) => [item.slug, item.title]));
const personalData = /(?:\+?\d[\d\s-]{7,}|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/;
const open = (element) => { element?.classList.add('is-open'); element?.setAttribute('aria-hidden','false'); document.body.classList.add('menu-open'); };
const close = (element) => { element?.classList.remove('is-open'); element?.setAttribute('aria-hidden','true'); document.body.classList.remove('menu-open'); };

function renderScholarshipChoices() {
  scholarshipLabels = Object.fromEntries(scholarships.map((item) => [item.slug, item.title]));
  const filter = document.querySelector('#scholarship-filter');
  const composer = document.querySelector('#new-post-scholarship');
  if (filter) filter.innerHTML = '<option value="">كل المنح</option>' + scholarships.map((item) => `<option value="${item.slug}">${item.title}</option>`).join('');
  if (composer) composer.innerHTML = '<option value="">غير محددة</option>' + scholarships.map((item) => `<option value="${item.slug}">${item.title}</option>`).join('');
  const rooms = document.querySelector('.side-card .scholarship-room')?.parentElement;
  if (rooms) rooms.querySelectorAll('.scholarship-room').forEach((item) => item.remove());
  scholarships.slice(0, 7).forEach((item) => rooms?.insertAdjacentHTML('beforeend', `<a class="scholarship-room" href="community.html?scholarship=${item.slug}"><b>${item.title}</b><small>${item.country} · ${item.funding || 'تفاصيل المنحة'}</small></a>`));
}

renderScholarshipChoices();
getDocs(collection(db, 'scholarships')).then((snapshot) => {
  scholarships = mergeScholarships(snapshot.docs.map((item) => item.data())).filter((item) => item.publishStatus === 'published');
  renderScholarshipChoices();
}).catch(() => {});

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

function commentForm(postId, parentId = null, onDone = null) {
  const form = document.createElement('form');
  form.className = parentId ? 'comment-form reply-form' : 'comment-form';
  const input = document.createElement('textarea');
  input.required = true; input.minLength = 2; input.maxLength = 2000;
  input.placeholder = parentId ? 'اكتب ردك...' : 'اكتب تعليقًا يفيد الطلاب...';
  const footer = document.createElement('div'); footer.className = 'comment-form-footer';
  const note = document.createElement('small'); note.textContent = 'لا تنشر بيانات تواصل أو معلومات شخصية.';
  const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = parentId ? 'إرسال الرد' : 'إضافة تعليق';
  footer.append(note, submit); form.append(input, footer);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser) return open(loginDialog);
    const body = input.value.trim();
    if (body.length < 2) return;
    if (personalData.test(body)) { note.textContent = 'احذف رقم الهاتف أو البريد لحماية خصوصيتك.'; note.classList.add('is-error'); return; }
    submit.disabled = true; submit.textContent = 'جاري الإرسال...';
    try {
      await addDoc(collection(db,'communityPosts',postId,'comments'), {
        authorId: currentUser.uid,
        authorUsername: currentProfile?.username || `student_${currentUser.uid.slice(0,6)}`,
        authorLevel: Number(currentProfile?.level) || 1,
        body,
        parentId,
        status: 'published',
        helpfulCount: 0,
        isPinnedAnswer: false,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(), deletedAt: null
      });
      form.reset(); onDone?.();
    } catch (error) {
      note.textContent = error.code === 'permission-denied' ? 'سجّل الدخول بحساب مكتمل لإضافة تعليق.' : 'تعذّر إرسال التعليق. حاول مجددًا.';
      note.classList.add('is-error');
    } finally { submit.disabled = false; submit.textContent = parentId ? 'إرسال الرد' : 'إضافة تعليق'; }
  });
  return form;
}

function commentCard(postId, id, comment, replies = []) {
  const item = document.createElement('article'); item.className = 'comment-item'; item.dataset.commentId = id;
  const top = document.createElement('div'); top.className = 'comment-top';
  const identity = document.createElement('div'); identity.className = 'comment-identity';
  const avatar = document.createElement('span'); avatar.className = 'comment-avatar'; avatar.textContent = (comment.authorUsername || 'ش').slice(0,1).toUpperCase();
  const who = document.createElement('div');
  const name = document.createElement('b'); name.textContent = `@${comment.authorUsername || 'طالب_شذرات'}`;
  const time = document.createElement('small'); time.textContent = comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleString('ar-SA',{dateStyle:'short',timeStyle:'short'}) : 'الآن';
  who.append(name,time); identity.append(avatar,who); top.append(identity);
  if (comment.isPinnedAnswer) { const pin = document.createElement('span'); pin.className = 'pinned-answer'; pin.textContent = 'إجابة مثبتة'; top.append(pin); }
  const body = document.createElement('p'); body.textContent = comment.body;
  const actions = document.createElement('div'); actions.className = 'comment-actions';
  const useful = document.createElement('button'); useful.type='button'; useful.textContent=`مفيد ${Number(comment.helpfulCount)||0}`; useful.addEventListener('click',()=>{ if(!currentUser) open(loginDialog); });
  const reply = document.createElement('button'); reply.type='button'; reply.textContent='رد';
  const report = document.createElement('button'); report.type='button'; report.textContent='إبلاغ'; report.addEventListener('click',()=>{ if(!currentUser) open(loginDialog); });
  actions.append(useful,reply,report); item.append(top,body,actions);
  const replyHost = document.createElement('div'); replyHost.className='reply-form-host'; item.append(replyHost);
  reply.addEventListener('click',()=>{
    if(!currentUser) return open(loginDialog);
    if(replyHost.childElementCount){ replyHost.replaceChildren(); return; }
    replyHost.append(commentForm(postId,id,()=>replyHost.replaceChildren()));
    replyHost.querySelector('textarea')?.focus();
  });
  if (replies.length) {
    const replyList = document.createElement('div'); replyList.className='reply-list';
    replies.forEach(({id:replyId,data})=>{
      const replyItem = commentCard(postId,replyId,data,[]);
      replyItem.classList.add('is-reply');
      replyItem.querySelector('.comment-actions button:nth-child(2)')?.remove();
      replyList.append(replyItem);
    });
    item.append(replyList);
  }
  return item;
}

function openComments(postId, host, button) {
  if (host.dataset.open === 'true') { host.replaceChildren(); host.dataset.open='false'; button.textContent='التعليقات'; return; }
  host.dataset.open='true'; button.textContent='إخفاء التعليقات';
  const heading = document.createElement('h3'); heading.textContent='التعليقات والردود';
  const loading = document.createElement('p'); loading.className='comments-note'; loading.textContent='جاري تحميل التعليقات...';
  const list = document.createElement('div'); list.className='comments-list'; host.append(heading,loading,list);
  if (currentUser) host.append(commentForm(postId));
  else { const login = document.createElement('button'); login.className='comment-login'; login.type='button'; login.textContent='سجّل دخولك لإضافة تعليق'; login.addEventListener('click',()=>open(loginDialog)); host.append(login); }
  const commentsQuery = query(collection(db,'communityPosts',postId,'comments'), where('status','==','published'), orderBy('createdAt','asc'), limit(100));
  onSnapshot(commentsQuery,(snapshot)=>{
    const roots=[]; const repliesByParent=new Map();
    snapshot.docs.forEach((docItem)=>{
      const data=docItem.data(); const row={id:docItem.id,data};
      if(data.parentId){ const replies=repliesByParent.get(data.parentId)||[]; replies.push(row); repliesByParent.set(data.parentId,replies); }
      else roots.push(row);
    });
    loading.textContent = snapshot.empty ? 'لا توجد تعليقات بعد. ابدأ نقاشًا مفيدًا.' : `${snapshot.size} تعليق ورد`;
    list.replaceChildren(...roots.map((row)=>commentCard(postId,row.id,row.data,repliesByParent.get(row.id)||[])));
  },()=>{ loading.textContent='تعذّر تحميل التعليقات. حاول لاحقًا.'; });
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
  const useful = document.createElement('button'); useful.type='button'; useful.textContent=`مفيد ${Number(post.helpfulCount)||0}`; useful.addEventListener('click',()=>{ if(!currentUser) open(loginDialog); });
  const comments = document.createElement('button'); comments.type='button'; comments.textContent=`التعليقات ${Number(post.commentCount)||0}`;
  const save = document.createElement('button'); save.type='button'; save.textContent='حفظ'; save.addEventListener('click',()=>{ if(!currentUser) open(loginDialog); });
  const report = document.createElement('button'); report.type='button'; report.textContent='إبلاغ'; report.addEventListener('click',()=>{ if(!currentUser) open(loginDialog); });
  actions.append(useful,comments,save,report); article.append(actions);
  const commentsHost = document.createElement('section'); commentsHost.className='comments-panel'; commentsHost.dataset.open='false'; article.append(commentsHost);
  comments.addEventListener('click',()=>openComments(id,commentsHost,comments));
  return article;
}

const feedQuery = query(collection(db,'communityPosts'), where('status','==','published'), orderBy('createdAt','desc'), limit(10));
onSnapshot(feedQuery, (snapshot) => {
  if (snapshot.empty) return renderEmpty();
  status.hidden = true;
  postsRoot.replaceChildren(...snapshot.docs.map((item) => postCard(item.id,item.data())));
}, renderError);

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  currentProfile = null;
  if (user) {
    try { currentProfile = (await getDoc(doc(db,'users',user.uid))).data() || null; } catch {}
  }
  if (composerButton) composerButton.textContent = user ? 'اكتب سؤالًا أو تجربة...' : 'سجّل دخولك للمشاركة';
});

postForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) return open(loginDialog);
  const body = document.querySelector('#new-post-body').value.trim();
  if (body.length < 10) { postMessage.textContent = 'اكتب 10 أحرف على الأقل.'; return; }
  if (personalData.test(body)) { postMessage.textContent = 'احذف رقم الهاتف أو البريد من المنشور لحماية خصوصيتك.'; return; }
  const submit = postForm.querySelector('[type="submit"]'); submit.disabled = true; postMessage.textContent = 'جاري النشر...';
  try {
    await addDoc(collection(db,'communityPosts'), {
      authorId: currentUser.uid,
      authorUsername: currentProfile?.username || `student_${currentUser.uid.slice(0,6)}`,
      authorLevel: Number(currentProfile?.level) || 1,
      title: document.querySelector('#new-post-title').value.trim(), body,
      type: document.querySelector('#new-post-type').value,
      scholarshipSlug: document.querySelector('#new-post-scholarship').value,
      status: 'published', imageCount: 0, helpfulCount: 0, commentCount: 0, saveCount: 0,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), deletedAt: null
    });
    postForm.reset(); close(postDialog);
  } catch (error) {
    postMessage.textContent = error.code === 'permission-denied' ? 'تعذر النشر. تأكد من تسجيل الدخول وأن حسابك نشط، ثم حاول مرة أخرى.' : 'حدث خطأ ولم يُنشر المحتوى. حاول مجددًا.';
  } finally { submit.disabled = false; }
});
