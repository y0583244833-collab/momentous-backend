# Momentous Backend — לוח זיכרונות משותף

שרת (Backend) לאפליקציה שבה קבוצות שומרות זיכרונות מאירוע משותף: טיול, מסיבת סיום, קייטנה ועוד.

> **מתחילה מאפס? פתחי קודם את [START-HERE.md](START-HERE.md).** שם יש הוראות צעד אחר צעד להעלאה ל־GitHub ולענן.
>
> **כותבת את צד ה־React?** כל מה שצריך נמצא ב־[FRONTEND-API-GUIDE.md](FRONTEND-API-GUIDE.md).
>
> **רשימה מסודרת של כל 35 הכתובות בשרת:** [API-ENDPOINTS.md](API-ENDPOINTS.md).
>
> **הזמנות לפי מייל ופעמון ההזמנות:** [INVITATIONS.md](INVITATIONS.md).

## מה השרת עושה

- הרשמה, התחברות ופרופיל (שם, תמונה, שינוי סיסמה).
- לוחות לאירוע משותף: פתיחה, עריכה, מחיקה, חיפוש, סינון ומיון.
- הצטרפות ללוח עם קוד, או **בהזמנה לפי מייל** שהמוזמן מאשר או דוחה. אפשר להזמין גם מי שעוד לא נרשם, וכבר בזמן פתיחת הלוח.
- מונה של הזמנות ממתינות, לפעמון ב־Header.
- זיכרונות בלוח (תמונה, מקום, סיכום, בדיחה, ציטוט) ולייקים.
- העלאת תמונות.
- מסכי ניהול לבעל המערכת: משתמשים (חסימה ומחיקה) וכל הלוחות.

## טכנולוגיות

| תחום | כלי |
| --- | --- |
| שפה וסביבה | Node.js 20 ומעלה (נבדק על 22), TypeScript במצב strict |
| שרת | Express 4 |
| מסד נתונים | PostgreSQL + Prisma ORM 6 |
| ולידציה | Zod |
| התחברות | JWT (jsonwebtoken) + הצפנת סיסמאות ב־bcrypt (bcryptjs) |
| תיעוד | Swagger UI / OpenAPI 3 בכתובת `/api-docs` |
| בדיקות | Vitest + Supertest |

## מבנה התיקיות

```
momentous-backend/
├── src/
│   ├── server.ts              הפעלת השרת
│   ├── app.ts                 הרכבת Express: middleware, routes, Swagger
│   ├── config/env.ts          קריאה ובדיקה של משתני הסביבה
│   ├── db/prisma.ts           חיבור למסד הנתונים
│   ├── middleware/            אימות (JWT), הרשאות, ולידציה, שגיאות, העלאת קבצים
│   ├── modules/               כל תחום בתיקייה משלו:
│   │   ├── auth/              הרשמה, התחברות, "מי אני"
│   │   ├── users/             עריכת פרופיל ושינוי סיסמה
│   │   ├── images/            העלאה והצגה של תמונות
│   │   ├── boards/            לוחות, הצטרפות, חברים
│   │   ├── invitations/       הזמנות לפי מייל: ההזמנות שלי, מונה לפעמון, אישור ודחייה
│   │   ├── memories/          זיכרונות ולייקים
│   │   ├── admin/             מסכי בעל המערכת
│   │   └── system/            health ורשימות בחירה
│   │       (בכל תחום: *.routes.ts, *.controller.ts, *.service.ts, *.schemas.ts)
│   ├── docs/openapi.ts        תיעוד ה־API (Swagger)
│   ├── constants/             סוגי זיכרונות ואירועים, מגבלות תמונה
│   └── utils/                 פונקציות עזר
├── prisma/
│   ├── schema.prisma          הגדרת הטבלאות
│   ├── migrations/            קובצי ה־SQL שיוצרים את הטבלאות
│   └── seed.ts                נתוני הדגמה
├── tests/                     בדיקות אוטומטיות
├── docs/openapi.json          קובץ OpenAPI מוכן
├── scripts/export-openapi.ts  יצירה מחדש של openapi.json
├── render.yaml                הגדרות פריסה ל־Render
├── .env.example               דוגמה למשתני סביבה
├── START-HERE.md              הוראות העלאה לאינטרנט (עברית)
├── FRONTEND-API-GUIDE.md      מדריך API לצד ה־React (עברית)
├── API-ENDPOINTS.md           רשימה של כל הכתובות: ניתוב, מטרה, הרשאה (עברית)
└── INVITATIONS.md             הזמנות ופעמון: חוזה API מלא ודוגמאות (עברית)
```

## הרצה על המחשב

צריך: Node.js 20 ומעלה, ו־PostgreSQL פעיל (מקומי או בענן).

```bash
npm install
cp .env.example .env          # ב־Windows אפשר פשוט להעתיק את הקובץ ולשנות לו את השם
# ערכי ב־.env את DATABASE_URL ואת JWT_SECRET

npx prisma migrate deploy     # יוצר את הטבלאות
npm run db:seed               # מוסיף נתוני הדגמה
npm run dev                   # מפעיל את השרת עם טעינה מחדש אוטומטית
```

ב־Windows (PowerShell) הפקודות זהות. במקום `cp` אפשר להריץ `Copy-Item .env.example .env`.

ואז לפתוח:

- http://localhost:3000/api/health
- http://localhost:3000/api-docs

## משתמשי הדגמה (רק בסביבת פיתוח)

הסיסמאות האלה קבועות וידועות, ולכן ה־seed **לא** יוצר אותן ב־production.

| תפקיד | מייל | סיסמה |
| --- | --- | --- |
| בעל המערכת | admin@momenta.local | Admin1234! |
| משתמשת | noa@example.com | Demo1234! |
| משתמש | yossi@example.com | Demo1234! |
| משתמשת | dana@example.com | Demo1234! |

נתוני ההדגמה כוללים 3 לוחות:

| לוח | פתח/ה | חברים | קוד הצטרפות |
| --- | --- | --- | --- |
| טיול שנתי י"ב | נועה | יוסי, דנה | D0TRIP |
| סיום קייטנה | יוסי | נועה | D1CAMP |
| שבת משפחתית בצפון | דנה | (רק דנה) | D2FAMI |

הלוח השלישי פרטי לדנה, כך שאפשר לבדוק שנועה ויוסי מקבלים 403 כשהם מנסים לפתוח אותו.

ב־production אפשר ליצור מנהל ונתוני הדגמה רק דרך משתני סביבה: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_DEMO_DATA=true`, `SEED_DEMO_PASSWORD`.

## פקודות

| פקודה | מה היא עושה |
| --- | --- |
| `npm run dev` | הרצה לפיתוח |
| `npm run build` | `prisma generate` ובנייה ל־`dist/` |
| `npm start` | הרצת הגרסה הבנויה |
| `npm run start:prod` | Migrations, seed (רק אם הוגדרו משתני SEED), והרצה. זו פקודת ההפעלה בענן |
| `npm test` | כל הבדיקות האוטומטיות |
| `npm run typecheck` | בדיקת TypeScript |
| `npm run check` | typecheck, prisma validate, בדיקות ו־build ברצף אחד |
| `npm run db:migrate` | יצירת migration חדש אחרי שינוי ב־schema.prisma |
| `npm run db:deploy` | הרצת migrations קיימים |
| `npm run db:seed` | נתוני הדגמה |
| `npm run db:studio` | ממשק גרפי לצפייה בטבלאות |
| `npm run openapi:export` | עדכון `docs/openapi.json` |

## בדיקות

הבדיקות רצות מול מסד נתונים **נפרד** (`momenta_test`), ולא נוגעות בנתונים שלך.

```bash
# פעם אחת: ליצור את מסד הבדיקות
createdb momenta_test          # או ב־pgAdmin: Create Database בשם momenta_test
npm test
```

אם הסיסמה או הכתובת של PostgreSQL אצלך שונות, הגדירי `TEST_DATABASE_URL`.

ב־PowerShell מגדירים את הכתובת כך: `$env:TEST_DATABASE_URL="postgresql://..."`, ואז `npm test`.

הבדיקות (122) מכסות: התחברות תקינה ושגויה, Token חסר, לא תקין ופג תוקף, הרשאות מנהל ומשתמש, CRUD של לוחות וזיכרונות, ולידציה, חיפוש, סינון ומיון, מניעת גישה ללוחות פרטיים, תמונות כפולות, הזמנות (משתמש קיים, כתובת שעוד לא נרשמה, אישור, דחייה, כפילויות, בקשות מקבילות, הזמנה של מישהו אחר, מחיקת לוח, הצטרפות עם קוד באמצע), תקינות Prisma ותקינות Swagger.

## אבטחה בקצרה

- סיסמאות נשמרות רק כ־hash של bcrypt, ולא מוחזרות אף פעם ב־API.
- כל כתובת פרטית דורשת `Authorization: Bearer <token>`. בלי Token מתקבל 401, ובלי הרשאה מתקבל 403.
- המשתמש נקבע רק לפי ה־Token. השרת טוען אותו מחדש ממסד הנתונים בכל בקשה, כך שמשתמש שנחסם או נמחק מאבד גישה מיד.
- מי שאינו חבר בלוח לא רואה ממנו כלום. חברים אחרים רואים רק שם ותמונה, בלי מיילים.
- סוג התמונה נבדק לפי תוכן הקובץ ולא לפי השם שלו. הגודל המרבי הוא 2MB.
- אי אפשר להירשם כמנהל. מנהל נוצר רק דרך ה־seed.
- הזמנות מותאמות רק לפי המייל של המשתמש המחובר (מתוך ה־Token). אי אפשר לראות, לאשר או לדחות הזמנה של מישהו אחר, ואף אחד לא מצטרף ללוח בלי לאשר.

## בדיקת חבילות (npm audit)

נכון לבניית הפרויקט, `npm audit --omit=dev` מחזיר **0 פגיעויות** בחבילות שרצות בשרת. `npm audit` מלא מתריע על Vitest 3, שהוא כלי הבדיקות בלבד ולא רץ בשרת בענן. Vitest 4 לא הותקן, כי בגרסה הנוכחית של npm הוא גורם לשגיאת התקנה.

## המערכת לא תלויה בשירות AI

הפרויקט לא משתמש בשום שירות AI או מפתח בתשלום. הוא צריך רק Node.js ו־PostgreSQL.
