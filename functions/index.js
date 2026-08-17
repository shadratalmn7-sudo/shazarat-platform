const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();
const BREVO_API_KEY = defineSecret('BREVO_API_KEY');
const OWNER_EMAIL = 'shadrat.almn7@gmail.com';
const SENDER_NAME = 'شذرات للمنح';
const SENDER_EMAIL = 'shadrat.almn7@gmail.com';

function cleanText(value, max = 5000) {
  return String(value || '').trim().slice(0, max);
}

async function assertSupportUser(auth) {
  if (!auth?.uid) throw new HttpsError('unauthenticated', 'يجب تسجيل الدخول.');
  const email = String(auth.token?.email || '').toLowerCase();
  if (email === OWNER_EMAIL) return { uid: auth.uid, role: 'owner', email };
  const snap = await db.doc(`users/${auth.uid}`).get();
  const role = snap.exists ? snap.data().role : null;
  if (!['owner', 'admin', 'support'].includes(role)) {
    throw new HttpsError('permission-denied', 'لا تملك صلاحية الرد على الرسائل.');
  }
  return { uid: auth.uid, role, email };
}

exports.sendSupportReply = onCall({ region: 'europe-west1', secrets: [BREVO_API_KEY] }, async (request) => {
  const staff = await assertSupportUser(request.auth);
  const messageId = cleanText(request.data?.messageId, 120);
  const reply = cleanText(request.data?.reply, 5000);
  const subject = cleanText(request.data?.subject, 180) || 'رد من شذرات للمنح';
  if (!messageId || reply.length < 2) throw new HttpsError('invalid-argument', 'الرسالة أو الرد غير صالح.');

  const ref = db.doc(`messages/${messageId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'الرسالة غير موجودة.');
  const original = snap.data();
  const toEmail = String(original.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(toEmail)) throw new HttpsError('failed-precondition', 'بريد الطالب غير صالح.');

  const html = `<!doctype html><html lang="ar" dir="rtl"><body style="font-family:Arial,Tahoma,sans-serif;background:#f7f2e8;padding:24px;color:#17352b"><div style="max-width:640px;margin:auto;background:#fff;border-radius:18px;padding:24px;border:1px solid #e7dfd1"><h2 style="margin-top:0">شذرات للمنح</h2><p>مرحبًا ${cleanText(original.name, 120) || 'بك'}،</p><p style="white-space:pre-wrap;line-height:1.9">${reply.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</p><hr style="border:0;border-top:1px solid #eee6d9"><p style="font-size:12px;color:#6f7b75">هذا رد متعلق برسالتك في منصة شذرات للمنح.</p></div></body></html>`;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': BREVO_API_KEY.value(),
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: toEmail, name: cleanText(original.name, 120) }],
      replyTo: { email: OWNER_EMAIL, name: SENDER_NAME },
      subject,
      htmlContent: html,
      textContent: reply,
      tags: ['support-reply']
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Brevo send failed', response.status, payload);
    throw new HttpsError('internal', 'تعذر إرسال البريد الآن.');
  }

  const batch = db.batch();
  batch.set(ref.collection('replies').doc(), {
    body: reply,
    subject,
    sentBy: staff.uid,
    sentByRole: staff.role,
    emailMessageId: payload.messageId || null,
    createdAt: FieldValue.serverTimestamp()
  });
  batch.update(ref, {
    status: 'replied',
    repliedAt: FieldValue.serverTimestamp(),
    repliedBy: staff.uid,
    updatedAt: FieldValue.serverTimestamp()
  });
  if (original.userId) {
    batch.set(db.collection('users').doc(original.userId).collection('notifications').doc(), {
      title: 'رد جديد من فريق شذرات',
      body: reply.slice(0, 260),
      type: 'support-reply',
      read: false,
      relatedMessageId: messageId,
      createdAt: FieldValue.serverTimestamp()
    });
  }
  await batch.commit();
  return { ok: true, messageId: payload.messageId || null };
});
