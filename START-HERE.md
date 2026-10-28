# מתחילים כאן: העלאת השרת לאינטרנט

המדריך הזה מיועד למי שמעולם לא העלתה שרת לאינטרנט. עברי עליו לפי הסדר.

**מה נעשה, בקצרה:**

1. נעלה את קובצי הפרויקט ל־**GitHub** (מקום לשמירת קוד).
2. נפתח מסד נתונים חינמי ב־**Neon** (שם יישמרו המשתמשים, הלוחות והזיכרונות).
3. נפעיל את השרת ב־**Render**, שימשוך את הקוד מ־GitHub ויתחבר ל־Neon.
4. נבדוק שהכול עובד דרך Swagger.

> **הערה חשובה על הכפתורים:** כתבתי את שמות הכפתורים לפי מה שהיה מוכר לי באתרים האלה. אתרים משנים לפעמים את העיצוב, ואין לי דרך לוודא את המסכים העדכניים. אם כפתור נקרא קצת אחרת, חפשי משהו דומה במשמעות. **הערכים שצריך להקליד** (פקודות, שמות משתנים) מדויקים, כי הם תלויים רק בפרויקט.

**מה עולה כסף?** כלום. שלושת השירותים מציעים מסלול חינמי, אבל עם מגבלות (מפורטות בסוף כל חלק).

---

## חלק א — GitHub

### 1. פתיחת חשבון

1. היכנסי ל־https://github.com ולחצי **Sign up**.
2. הזיני מייל, סיסמה ושם משתמש, ואשרי את המייל שתקבלי.

### 2. יצירת Repository (מאגר)

1. אחרי ההתחברות, לחצי על **+** למעלה מימין, ואז **New repository**.
2. **Repository name:** `momentous-backend`
3. בחרי **Private** (פרטי) או **Public** (ציבורי). שניהם עובדים עם Render. אם המורה צריכה לראות את הקוד, Public הכי פשוט.
4. **אל תסמני** את Add a README, .gitignore או license. כבר יש לנו את כל הקבצים.
5. לחצי **Create repository**.

### 3. חילוץ קובץ ה־ZIP

1. מצאי את הקובץ `momentous-backend.zip` שהורדת.
2. ב־Windows: לחיצה ימנית, ואז **Extract All** (חלץ הכל), ואז **Extract**.
3. תתקבל תיקייה בשם `momentous-backend`. בתוכה יש `package.json`, `src`, `prisma` ועוד.

### 4. העלאת הקבצים דרך הדפדפן

1. בדף ה־Repository החדש, לחצי על הקישור **uploading an existing file**.
2. פתחי את התיקייה `momentous-backend` במחשב. **סמני את כל מה שבתוכה** (Ctrl+A), כולל `.gitignore` ו־`.env.example`, וגררי לחלון הדפדפן.
   - חשוב לגרור את **התוכן** של התיקייה, ולא את התיקייה עצמה. כך `package.json` יהיה ישר בשורש ה־Repository.
   - אם `.gitignore` לא מופיע במחשב: בסייר הקבצים לחצי **View** (תצוגה) וסמני **Hidden items** (פריטים מוסתרים).
3. חכי שכל הקבצים יסיימו לעלות.
4. למטה, בתיבה **Commit changes**, לחצי על הכפתור הירוק **Commit changes**.

> אם הדפדפן מסרב לגרור תיקיות, אפשר להשתמש ב־GitHub Desktop (https://desktop.github.com), שמעלה את כל התיקייה בלחיצה.

### 5. בדיקה שהקבצים עלו

בדף הראשי של ה־Repository צריכים להופיע:

- תיקיות: `src`, `prisma`, `tests`, `docs`, `scripts`
- קבצים: `package.json`, `package-lock.json`, `tsconfig.json`, `render.yaml`, `README.md`, `START-HERE.md`
- היכנסי ל־`prisma` ובדקי שיש בתוכה תיקייה `migrations`. **בלעדיה הטבלאות לא ייווצרו.**

**לא אמורים להופיע:** `node_modules` או `.env`. אם העלית בטעות קובץ `.env` עם סיסמאות, מחקי אותו מ־GitHub מיד והחליפי את הסיסמאות שהיו בו.

---

## חלק ב — מסד נתונים (Neon)

בחרתי ב־**Neon**, כי המסלול החינמי שלו לא נמחק אחרי זמן קבוע. במסלול החינמי של Render, מסד הנתונים נמחק אחרי 30 יום.

### 1. פתיחת חשבון

1. היכנסי ל־https://neon.com ולחצי **Sign up**.
2. אפשר להירשם עם חשבון ה־GitHub שפתחת (**Continue with GitHub**).

### 2. יצירת מסד נתונים

1. צרי פרויקט חדש (**Create project** / **New Project**).
2. **Project name:** `momenta`
3. **Postgres version:** השאירי את ברירת המחדל.
4. **Region:** בחרי אזור באירופה, למשל Frankfurt. כדאי לבחור באותו אזור גם ב־Render.
5. לחצי **Create**.

### 3. קבלת ה־Connection String

1. בדף הפרויקט, לחצי **Connect** (או חפשי "Connection string").
2. ודאי שהאפשרות **Connection pooling** **כבויה**. אנחנו רוצים את הכתובת הישירה, כי Prisma צריך אותה כדי ליצור טבלאות.
3. העתיקי את הכתובת. היא נראית בערך כך:

```
postgresql://neondb_owner:XXXXXXXX@ep-cool-name-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### 4. שמירה בטוחה

- הכתובת הזו כוללת **סיסמה**. אל תשימי אותה ב־GitHub, בקוד או בצ'אט עם חברות.
- שמרי אותה זמנית בפנקס רשימות במחשב שלך. תדביקי אותה ב־Render בחלק הבא.

### 5. חיבור השרת למסד הנתונים

את החיבור עושים ב־Render, במשתנה `DATABASE_URL` (חלק ג, שלב 6). אין צורך ליצור טבלאות ידנית: השרת מריץ את ה־Migrations לבד בכל הפעלה.

**מגבלות המסלול החינמי של Neon** (לפי האתר שלהם, נכון לעכשיו): עד 1GB אחסון לפרויקט, ומסד הנתונים "נרדם" אחרי 5 דקות בלי שימוש ומתעורר לבד בבקשה הבאה. התמונות נשמרות במסד הנתונים, וכל תמונה מוגבלת ל־2MB, כך ש־1GB מספיק למאות תמונות.

> **חלופה:** אפשר להשתמש גם ב־Supabase (https://supabase.com) או בכל PostgreSQL אחר. צריך רק Connection String ישיר (לא pooler), ולהדביק אותו ב־`DATABASE_URL`.

---

## חלק ג — Render

### 1. פתיחת חשבון

1. היכנסי ל־https://render.com ולחצי **Get Started**.
2. הירשמי עם **GitHub**. זה גם מחבר את Render לחשבון ה־GitHub שלך.

### 2. חיבור GitHub

אם נרשמת עם GitHub, החיבור כבר קיים. אם Render מבקש הרשאה למאגרים, אשרי גישה ל־`momentous-backend` (או לכל המאגרים).

### 3. יצירת Web Service

1. בלוח הבקרה של Render לחצי **New +**, ואז **Web Service**.
2. בחרי **Git Provider** / **GitHub**.

### 4. בחירת ה־Repository

בחרי את `momentous-backend` מהרשימה ולחצי **Connect**.

### 5. הגדרות Build ו־Start

מלאי את השדות כך:

| שדה | ערך |
| --- | --- |
| **Name** | `momenta-api` (זה יהיה חלק מהכתובת) |
| **Language / Runtime** | `Node` |
| **Branch** | `main` |
| **Region** | אותו אזור שבחרת ב־Neon (למשל Frankfurt) |
| **Root Directory** | השאירי ריק |
| **Build Command** | `npm ci --include=dev && npm run build` |
| **Start Command** | `npm run start:prod` |
| **Instance Type** | **Free** |

### 6. משתני סביבה (Environment Variables)

באותו מסך, באזור **Environment Variables**, לחצי **Add Environment Variable** לכל שורה:

| Key | Value |
| --- | --- |
| `DATABASE_URL` | הכתובת שהעתקת מ־Neon |
| `JWT_SECRET` | מחרוזת אקראית ארוכה (לפחות 32 תווים). Render מציע כפתור **Generate** שיוצר אותה. |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `JWT_EXPIRES_IN` | `1d` |
| `CORS_ORIGIN` | `*` (אחר כך אפשר לשים את כתובת אתר ה־React שלך) |
| `SEED_ADMIN_EMAIL` | המייל של בעל המערכת, למשל `admin@momenta.app` |
| `SEED_ADMIN_PASSWORD` | סיסמה חזקה לבעל המערכת (לפחות 8 תווים). **אל תשתמשי ב־Admin1234!** |

**רוצה נתוני הדגמה גם בענן,** כדי להציג למורה? הוסיפי:

| Key | Value |
| --- | --- |
| `SEED_DEMO_DATA` | `true` |
| `SEED_DEMO_PASSWORD` | סיסמה למשתמשי ההדגמה (noa, yossi, dana) |

בתחתית, ב־**Advanced**, אם יש שדה **Health Check Path**, כתבי בו: `/api/health`

> **אפשרות אחרת: Blueprint.** בפרויקט יש קובץ `render.yaml`. אפשר ללחוץ **New +** ואז **Blueprint**, לבחור את ה־Repository, ו־Render ימלא את רוב ההגדרות לבד. תצטרכי רק להזין את `DATABASE_URL` ואת משתני ה־SEED.

### 7. Prisma Migrations

אין צורך לעשות כלום. פקודת ההפעלה `npm run start:prod` עושה שלושה דברים בכל הפעלה:

1. `prisma migrate deploy`: יוצרת או מעדכנת את הטבלאות ב־Neon.
2. `prisma db seed`: יוצרת את בעל המערכת (רק אם הגדרת `SEED_ADMIN_*`). אם הוא כבר קיים, לא קורה כלום.
3. מפעילה את השרת.

### 8. Deploy

1. לחצי **Create Web Service** (או **Deploy Web Service**).
2. Render יתחיל לבנות. אפשר לראות את ההתקדמות במסך **Logs**. זה לוקח כמה דקות.
3. בסוף אמורות להופיע השורות:

```
All migrations have been successfully applied.
Seeding (production)...
  + ADMIN admin@momenta.app
Momenta API is running on port 10000
```

(מספר הפורט יכול להיות שונה. Render בוחר אותו, והשרת משתמש בו אוטומטית.)

### 9. בדיקה שהשרת פעיל

למעלה בדף השירות מופיעה הכתובת שלך, למשל:

```
https://momenta-api.onrender.com
```

זו **כתובת הבסיס (Base URL)** שתשתמשי בה ב־React.

**מגבלות המסלול החינמי של Render** (לפי האתר שלהם, נכון לעכשיו): השרת "נרדם" אחרי 15 דקות בלי בקשות. הבקשה הראשונה אחרי זה לוקחת בערך דקה. כדאי לפתוח את `/api/health` כמה דקות לפני שמציגים את הפרויקט. יש גם מכסה של 750 שעות בחודש, שמספיקה לשירות אחד שרץ כל החודש.

---

## חלק ד — בדיקה

החליפי את `https://momenta-api.onrender.com` בכתובת שלך.

### 1. פתיחת `/api/health`

פתחי בדפדפן: `https://momenta-api.onrender.com/api/health`

צריך להופיע:

```json
{"status":"ok","database":"ok","time":"..."}
```

אם מופיע `"database":"unreachable"`, יש בעיה ב־`DATABASE_URL` (ראי חלק ה).

### 2. פתיחת `/api-docs`

פתחי: `https://momenta-api.onrender.com/api-docs`

יופיע Swagger עם כל 36 הכתובות, מחולקות לקבוצות (Auth, Boards, Invitations, Memories ועוד).

### 3. התחברות מתוך Swagger

1. פתחי את **POST /api/auth/login**.
2. לחצי **Try it out**.
3. בתיבה, כתבי את המייל והסיסמה של בעל המערכת שהגדרת:

```json
{ "email": "admin@momenta.app", "password": "הסיסמה-שבחרת" }
```

   או של משתמש הדגמה (אם הפעלת `SEED_DEMO_DATA`), למשל `noa@example.com`.

4. לחצי **Execute**.

### 4. קבלת JWT

בתשובה (קוד **200**) יש שדה `token`. העתיקי את הערך שלו, בלי המירכאות.

### 5. Authorize

1. גללי למעלה ולחצי על הכפתור **Authorize** (עם המנעול).
2. הדביקי את ה־Token בשדה **Value**, בלי המילה Bearer.
3. לחצי **Authorize** ואז **Close**.

### 6. קריאה ל־Endpoint מוגן

1. פתחי **GET /api/auth/me**, לחצי **Try it out** ואז **Execute**.
2. צריך לקבל **200** עם הפרטים שלך.
3. בדיקת אבטחה: לחצי שוב **Authorize** ואז **Logout**, והריצי שוב. עכשיו צריך לקבל **401**.
4. בדיקת הרשאות: התחברי כמשתמש רגיל ונסי **GET /api/admin/users**. צריך לקבל **403**.

### 7. הוספת רשומה

התחברי כ**משתמש רגיל**. בעל המערכת לא יכול לפתוח לוחות. אם אין לך משתמש, הירשמי ב־**POST /api/auth/register**.

1. **POST /api/boards**, עם הגוף:

```json
{ "name": "הלוח הראשון שלי", "eventType": "TRIP", "eventDate": "2026-04-14" }
```

2. העתיקי מהתשובה את `id` של הלוח.
3. **POST /api/boards/{id}/memories**: הדביקי את ה־id בשדה `id`, ושלחי:

```json
{ "title": "זיכרון ראשון", "content": "בדיקה מהענן", "type": "SUMMARY" }
```

4. צריך לקבל **201**.

### 8. שליפת הרשומה ממסד הנתונים

**GET /api/boards/{id}/memories** עם אותו `id` של הלוח. הזיכרון שהוספת צריך להופיע ברשימה. הוא נשמר ב־Neon, ולכן יישאר גם אחרי שהשרת "נרדם" ומתעורר.

---

## חלק ה — פתרון תקלות

| תקלה | איך היא נראית | מה עושים |
| --- | --- | --- |
| **Build Failed** | ב־Logs מופיעה שגיאה בזמן `npm ci` או `npm run build` | ודאי ש־`package.json` ו־`package-lock.json` נמצאים בשורש ה־Repository, ולא בתוך תיקייה. ודאי שה־Build Command הוא בדיוק `npm ci --include=dev && npm run build`. |
| **DATABASE_URL שגוי** | `/api/health` מחזיר `database: unreachable`, או שב־Logs מופיע `P1001` או `Can't reach database server` | העתיקי מחדש את הכתובת מ־Neon, בלי רווחים ובלי מירכאות. ודאי שהיא מסתיימת ב־`?sslmode=require`. ב־Render: **Environment**, תקני את הערך, **Save**, ואז **Manual Deploy**. |
| **בעיית Prisma** | `P3009`, `P3018` או `migrate deploy failed` ב־Logs | ודאי שהתיקייה `prisma/migrations` עלתה ל־GitHub. ודאי שהכתובת היא **ללא** pooling (ב־Neon אין `-pooler` בשם השרת). אם זה עדיין נכשל, אפשר למחוק את מסד הנתונים ב־Neon ולפתוח חדש. |
| **JWT_SECRET חסר** | ב־Logs: `Invalid environment variables: JWT_SECRET` | הוסיפי את `JWT_SECRET` ב־Environment, עם לפחות 32 תווים. |
| **שגיאת CORS** | ב־React מופיעה בקונסול שגיאה עם המילה `CORS` | ב־Render הגדירי `CORS_ORIGIN` ל־`*`, או לכתובת המדויקת של האתר שלך, למשל `http://localhost:5173`. כמה כתובות מפרידים בפסיק, בלי `/` בסוף. |
| **401** | `TOKEN_MISSING`, `TOKEN_INVALID` או `TOKEN_EXPIRED` | חסר Token, הוא הועתק לא נכון, או שפג תוקפו (אחרי יום). התחברי מחדש. ב־React ודאי שהכותרת היא בדיוק `Authorization: Bearer <token>`. |
| **403** | `ROLE_FORBIDDEN`, `NOT_A_MEMBER`, `NOT_BOARD_CREATOR`, `USER_BLOCKED` | ה־Token תקין, אבל אין הרשאה: מנהל שמנסה לפתוח לוח, משתמש שאינו חבר בלוח, או משתמש חסום. ההודעה בעברית אומרת בדיוק מה הבעיה. |
| **Swagger לא נפתח** | דף ריק או 404 ב־`/api-docs` | ודאי שהכתובת היא `/api-docs` (עם מקף). חכי דקה אם השרת "ישן". נסי גם `/openapi.json`. |
| **השרת לא עולה** | הסטטוס ב־Render הוא **Failed**, או שהדף נטען בלי סוף | פתחי **Logs** וחפשי את השורה האדומה הראשונה. ברוב המקרים זה `DATABASE_URL` או `JWT_SECRET` (ראי למעלה). אם הכול נראה תקין, לחצי **Manual Deploy**, ואז **Clear build cache & deploy**. |
| **בעל המערכת לא נוצר** | התחברות עם מייל המנהל מחזירה 401 | ודאי ש־`SEED_ADMIN_EMAIL` ו־`SEED_ADMIN_PASSWORD` מוגדרים, ושב־Logs מופיע `+ ADMIN`. אם מופיע `already exists`, המנהל כבר קיים עם הסיסמה מהפעם הראשונה. |
| **הבקשה הראשונה איטית מאוד** | בערך דקה עד לתשובה | זה המסלול החינמי של Render: השרת "התעורר". זה תקין. |

---

## מה הלאה?

- כתובת הבסיס ל־React היא הכתובת של Render, למשל `https://momenta-api.onrender.com`.
- כל הכתובות, הדוגמאות והטפסים מפורטים ב־[FRONTEND-API-GUIDE.md](FRONTEND-API-GUIDE.md).
- כדי להריץ את השרת גם על המחשב שלך, ראי את [README.md](README.md).
