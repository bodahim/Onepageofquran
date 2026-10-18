/* ============================================================
   ملف الإعدادات — عدّل هنا فقط لتغيير اسم التطبيق وخصائصه
   (ولا تنسَ تعديل name و short_name في manifest.json أيضًا)
   ============================================================ */
self.APP_CONFIG = {
  appName: "صفحة واحدة من القرآن كل يوم",  // اسم التطبيق الظاهر
  tagline: "مصحف المدينة النبوية مع تذكير يومي يتابع وردك",
  siteUrl: "https://quran1p.com/",          // الرابط الرسمي الذي يظهر عند المشاركة
  defaultTime: "20:00",                     // وقت التذكير الافتراضي
  shareText: "تطبيق مجاني: صفحة واحدة من القرآن كل يوم\n«أحب الأعمال إلى الله أدومها وإن قلّ»",

  // ألوان الواجهة (مأخوذة من تصميم صفحة المصحف المعتمد)
  colors: {
    paper: "#fff9e6",   // خلفية الصفحة
    ink: "#000000",     // لون خط المصحف
    brown: "#8a4400",   // اللون الأساسي للأزرار والأيقونات
    marker: "#84633a",  // لون علامات أرقام الآيات
    pill: "#f6ead4",    // تعبئة الأزرار الصغيرة
    pillLine: "#c8b394" // حدود الأزرار الصغيرة
  },

  // نص الإشعار — {page} رقم الصفحة، {surah} اسم السورة
  notifyTitle: "صفحتك اليوم 📖",
  notifyBody: "حان وقت وردك: الصفحة {page} — سورة {surah}",

  // ===== إعدادات Firebase للحسابات والتذكير (اتركها null حتى تُكمل خطوات الدليل) =====
  firebase: {
    apiKey: "AIzaSyCjQOAau2QuSuZpxFvMLYydDd2R4lSqExw",
    authDomain: "quran1p.firebaseapp.com",
    projectId: "quran1p",
    storageBucket: "quran1p.firebasestorage.app",
    messagingSenderId: "322494537287",
    appId: "1:322494537287:web:e3cbd32c8b997d208edb62"
  },
  /* مثال بعد الإعداد:
  firebase: {
    apiKey: "AIza...",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abc123"
  },
  */
  vapidKey: "BPAq0KL41aCllhv0vL799P64wK8pp8Xn_7utKI20n9RRINSPbLNytgNbTbtnb5PIn48hBIDlCsBvRX8d81_Z9Pc"   // من Firebase: Project settings › Cloud Messaging › Web Push certificates
};
