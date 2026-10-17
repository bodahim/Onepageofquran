// يُشغَّل تلقائيًا كل 15 دقيقة عبر GitHub Actions — يرسل تذكير الورد لمن حان موعده
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";

const root = fileURLToPath(new URL("..", import.meta.url));
const load = f => { const self = {}; new Function("self", readFileSync(root + f, "utf8"))(self); return self; };
const Q = load("data.js").QDATA;
const C = load("config.js").APP_CONFIG;

// تنظيف الرابط: يزيل المسافات والرموز الزائدة في أوله (مثل "/" أو علامات الاتجاه) ويضمن "/" في آخره
const APP_URL = (process.env.APP_URL || "").replace(/[\s\u200e\u200f\u202a-\u202e]/g, "").replace(/^[^h]+/, "").replace(/\/?$/, "/");
if (!process.env.FIREBASE_SERVICE_ACCOUNT) { console.log("FIREBASE_SERVICE_ACCOUNT غير مضبوط — تم التخطي"); process.exit(0); }
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore(), fcm = admin.messaging();
const FAR = admin.firestore.Timestamp.fromDate(new Date("2999-01-01T00:00:00Z"));

// أدوات المنطقة الزمنية
const parts = (date, tz) => Object.fromEntries(new Intl.DateTimeFormat("en-US", {
  timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
}).formatToParts(date).map(p => [p.type, p.value]));
const localDay = (date, tz) => { const p = parts(date, tz); return `${p.year}-${p.month}-${p.day}`; };
function zonedToUtc(y, mo, d, h, mi, tz) {
  let guess = Date.UTC(y, mo - 1, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const p = parts(new Date(guess), tz);
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    guess -= asUtc - Date.UTC(y, mo - 1, d, h, mi);
  }
  return new Date(guess);
}
function nextOccurrence(time, tz, after) {
  const [h, m] = (time || "20:00").split(":").map(Number);
  const p = parts(after, tz);
  let base = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
  for (let i = 0; i < 3; i++) {
    const t = zonedToUtc(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), h, m, tz);
    if (t > after) return t;
    base = new Date(base.getTime() + 86400000);
  }
  return new Date(after.getTime() + 86400000);
}
const validTz = tz => { try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return tz; } catch { return "Asia/Riyadh"; } };

const now = new Date();
const snap = await db.collection("users").where("nextDue", "<=", admin.firestore.Timestamp.fromDate(now)).limit(5000).get();
console.log(`مستحقون الآن: ${snap.size}`);

const msgs = [], meta = [], updates = new Map();
const FV = admin.firestore.FieldValue;
for (const doc of snap.docs) {
  const s = doc.data(), tz = validTz(s.tz);
  const tokens = Object.entries(s.tokens || {}).filter(([, t]) => t);
  if (!s.enabled || !tokens.length) { updates.set(doc.id, { ref: doc.ref, data: { nextDue: FAR } }); continue; }
  updates.set(doc.id, { ref: doc.ref, data: { nextDue: admin.firestore.Timestamp.fromDate(nextOccurrence(s.time, tz, now)) } });
  if (s.lastReadDay === localDay(now, tz)) continue; // قرأ وردَه اليوم — لا داعي للتذكير
  const page = Math.min(Q.TOTAL, Math.max(1, s.nextPage || 1));
  const surah = Q.names[Q.surahOfPage(page) - 1];
  const fill = t => String(t).replace("{page}", page).replace("{surah}", surah);
  const webpush = {
    notification: { title: fill(C.notifyTitle), body: fill(C.notifyBody), lang: "ar", dir: "rtl", tag: "wird" },
    headers: { Urgency: "high", TTL: "21600" }
  };
  if (APP_URL.startsWith("https://")) {
    webpush.notification.icon = webpush.notification.badge = APP_URL + "Icons/icon-192.png";
    webpush.fcmOptions = { link: `${APP_URL}?page=${page}` };
  }
  for (const [dev, token] of tokens) { msgs.push({ token, webpush }); meta.push({ doc, dev }); } // كل أجهزة المستخدم
}

let sent = 0, dead = 0;
for (let i = 0; i < msgs.length; i += 500) {
  const res = await fcm.sendEach(msgs.slice(i, i + 500));
  res.responses.forEach((r, k) => {
    if (r.success) { sent++; return; }
    const code = r.error && r.error.code;
    if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token" || code === "messaging/invalid-argument") {
      dead++;
      const { doc, dev } = meta[i + k];
      const u = updates.get(doc.id);
      u.data[`tokens.${dev}`] = FV.delete(); // يُزال الجهاز المنتهي فقط
    } else console.warn("فشل:", code);
  });
}

const all = [...updates.values()];
for (let i = 0; i < all.length; i += 450) {
  const b = db.batch();
  all.slice(i, i + 450).forEach(u => b.update(u.ref, u.data));
  await b.commit();
}
console.log(`أُرسل: ${sent} | أجهزة منتهية: ${dead} | تحديثات: ${all.length}`);
