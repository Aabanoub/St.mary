# كنيسة السيدة العذراء مريم — إعداد خدام
### تطبيق إدارة الحضور والمتابعة الروحية (PWA)

نظام إلكتروني لإدارة خدمة إعداد الخدام بكنيسة السيدة العذراء مريم، يشمل تسجيل الحضور الذكي بالباركود (QR)، استيراد الخدام من ملفات Excel، تقارير الحضور الرسمية بصيغة PDF، خطط قراءة الكتاب المقدس، والامتحانات الروحية المؤتمتة.

---

## التقنيات المستخدمة (Tech Stack)

- **Frontend:** Next.js 15 (App Router, TypeScript, Tailwind CSS)
- **Backend & Database:** Supabase (PostgreSQL 17 with Row Level Security)
- **Authentication:** Supabase Auth (GoTrue)
- **PWA:** Installable Progressive Web Application
- **Hosting:** Vercel

---

## بيانات الاتصال بقاعدة بيانات Supabase

المشروع مربوط حالياً بمشروع Supabase الحي:
- **Project URL:** `https://nonsgoepkqloeyzlpvys.supabase.co`
- **Region:** EU (Ireland - `eu-west-1`)
- **Status:** Active & Healthy

---

## خطوات النشر على Vercel (Deployment on Vercel)

### 1. المتغيرات البيئية (Environment Variables)
أضف المتغيرات التالية في إعدادات مشروعك على Vercel (**Settings > Environment Variables**):

| المتغير | القيمة |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nonsgoepkqloeyzlpvys.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vbnNnb2Vwa3Fsb2V5emxwdnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyODk3NTcsImV4cCI6MjExMDg2NTc1N30.1LOnaWcqYHLkttDOlV6T5u8FC8zXI5DUD2hVNwkDZiU` |
| `NEXT_PUBLIC_APP_NAME` | `كنيسة السيدة العذراء مريم` |
| `NEXT_PUBLIC_APP_SUBTITLE` | `إعداد خدام` |

### 2. النشر عبر GitHub
1. أنشئ مستودعاً جديداً على GitHub واربط هذا المجلد به:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/st-mary-servants.git
   git branch -M main
   git push -u origin main
   ```
2. ادخل على [vercel.com](https://vercel.com) واختر **Add New > Project**.
3. اختر المستودع، وضع المتغيرات البيئية أعلاه، واضغط **Deploy**.

### 3. النشر المباشر عبر Vercel CLI
يمكنك النشر المباشر من الطرفية:
```bash
npx vercel --prod
```

---

## الحسابات المجهزة للتجربة

- **المشرف العام (Super Admin):** `01000000001` / `Admin@123456`
- **مشرف الخدمة (Admin):** `01100000002` / `Admin@123456`
- **مخدوم / خادم (User):** `01200000003` / `01200000003`
