/* Service Worker: يعمل دون اتصال للصفحات التي فُتحت سابقًا + يستقبل إشعارات التذكير */
importScripts("config.js");
const VERSION = "wird-v8";
const SHELL = ["./", "index.html", "config.js", "data.js", "manifest.json", "Icons/icon-192.png", "Icons/icon-512.png"];

self.addEventListener("install", e => {
  // كل ملف على حدة: لو تعذّر ملف واحد لا يفشل تثبيت التطبيق كله
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== "wird-data").map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // خطوط المصحف وبيانات الصفحات والخطوط العامة: لا تتغير أبدًا، فتُقرأ من الجهاز أولًا (تعمل دون إنترنت)
  if (["static.qurancdn.com", "api.quran.com", "fonts.gstatic.com", "fonts.googleapis.com"].includes(url.hostname)) {
    e.respondWith(caches.open("wird-data").then(async c => {
      const hit = await c.match(req.url, { ignoreVary: true }); if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") c.put(req.url, res.clone());
      return res;
    }));
    return;
  }
  // ملفات التطبيق: من الشبكة أولًا ثم الذاكرة
  if (url.origin === self.location.origin) {
    // no-cache: يتحقق دائمًا من وجود نسخة أحدث بدل الاعتماد على ذاكرة المتصفح (حتى يصل كل تحديث فورًا)
    e.respondWith(fetch(req, { cache: "no-cache" }).then(res => {
      if (res.ok) caches.open(VERSION).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
  }
});

/* ===== الإشعارات (Firebase Cloud Messaging) ===== */
const C = self.APP_CONFIG || {};
if (C.firebase) {
  importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
                "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
  firebase.initializeApp(C.firebase);
  firebase.messaging(); // يعرض الإشعار تلقائيًا ويفتح الرابط عند الضغط
}

// عند الضغط على الإشعار: افتح التطبيق على الصفحة المطلوبة
self.addEventListener("notificationclick", e => {
  const data = (e.notification && e.notification.data) || {};
  const link = (data.FCM_MSG && data.FCM_MSG.data && data.FCM_MSG.data.link) || data.link;
  if (!link) return; // تتولاه مكتبة Firebase
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const w of list) if ("navigate" in w) return w.navigate(link).then(c => c && c.focus());
    return self.clients.openWindow(link);
  }));
});
