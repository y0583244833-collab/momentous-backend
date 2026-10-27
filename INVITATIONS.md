# הזמנות ללוח לפי מייל, ופעמון ההזמנות

התוספת הזו מאפשרת לפותח הלוח להזמין אנשים לפי כתובת מייל, גם לפני שהם נרשמו לאפליקציה.
המוזמן רואה את ההזמנה אחרי שהוא מתחבר או נרשם עם אותה כתובת, ומחליט אם לאשר או לדחות.
רק אישור מוסיף אותו לחברי הלוח.

- לא נשלח מייל אמיתי, ואין שום שירות חיצוני או מפתח API. ההזמנות נשמרות במסד הנתונים בלבד.
- ההצטרפות עם קוד (`POST /api/boards/join`) עובדת בדיוק כמו קודם.
- אפשר להזמין כבר **בזמן פתיחת הלוח**: שולחים ל־`POST /api/boards` גם שדה `emails` (לא חובה). בלי השדה, פתיחת לוח עובדת בדיוק כמו קודם.
- אפשר להזמין גם **אחר כך**, דרך `POST /api/boards/:id/invitations`. שתי הדרכים משתמשות באותה פונקציה בדיוק (`inviteEmails`), ולכן באותם כללים.

---

## 1. מה נוסף ומה השתנה בקוד

| קובץ | מה ולמה |
| --- | --- |
| `prisma/schema.prisma` | נוספו המודל `BoardInvitation` וה־enum `InvitationStatus`. ב־`User` וב־`Board` נוספה רק שורת קשר (relation) אחת לכל אחד. שום שדה קיים לא השתנה. |
| `prisma/migrations/20261027003551_board_invitations/migration.sql` | migration חדשה. היא רק **יוצרת** טבלה, enum ואינדקסים. היא לא משנה ולא מוחקת שום טבלה או מידע קיים. |
| `src/modules/invitations/invitations.schemas.ts` (חדש) | ולידציה ב־Zod: רשימת מיילים (עד 20), נרמול (trim ו־lowercase) והסרת כפילויות. אותה רשימה משמשת גם את פתיחת הלוח. |
| `src/modules/invitations/inviteEmails.ts` (חדש) | **המקום היחיד שיוצר הזמנות.** משמש גם את שליחת ההזמנות וגם את פתיחת לוח עם `emails`. עובד גם בתוך transaction. |
| `src/modules/invitations/invitations.service.ts` (חדש) | רשימה, מונה, אישור ודחייה. שליחת הזמנות קוראת ל־`inviteEmails`. |
| `src/modules/boards/boards.schemas.ts` | לסכמת יצירת הלוח נוסף שדה אחד: `emails` (לא חובה), עם אותם כללים של שליחת ההזמנות. |
| `src/modules/boards/boards.service.ts` | ב־`createBoard`: בלי `emails` הקוד רץ כמו קודם. עם `emails`, הלוח וההזמנות נשמרים יחד ב־transaction. |
| `src/modules/invitations/invitations.controller.ts` (חדש) | מחבר בין הבקשה לבין ה־service, כמו בשאר המודולים. |
| `src/modules/invitations/invitations.routes.ts` (חדש) | הנתיבים `/api/invitations/...`. |
| `src/modules/boards/boards.routes.ts` | נוסף בסוף הקובץ נתיב אחד: `POST /:id/invitations`. שום נתיב קיים לא השתנה. |
| `src/app.ts` | נוספו שתי שורות: import וחיבור של `/api/invitations`. |
| `src/utils/serializers.ts` | נוספה הפונקציה `toInvitation`, שקובעת מה נשלח ללקוח (בלי מיילים של אחרים). |
| `src/docs/openapi.ts`, `docs/openapi.json` | תיעוד Swagger ל־5 הכתובות החדשות. |
| `tests/invitations.test.ts` (חדש) | 28 בדיקות לכל התרחישים, כולל פתיחת לוח עם `emails`. |
| `tests/helpers.ts` | הטבלה החדשה נוספה לניקוי מסד הבדיקות בין בדיקה לבדיקה. |
| `tests/docs.test.ts` | 5 הכתובות החדשות נוספו לרשימת הכתובות שנבדקת מול Swagger (35 במקום 30). |
| `API-ENDPOINTS.md` (חדש), `INVITATIONS.md` (חדש), `README.md`, `FRONTEND-API-GUIDE.md`, `START-HERE.md` | תיעוד. |

**לא השתנו:** הרשמה, התחברות, JWT, הצטרפות עם קוד, תמונות, זיכרונות, לייקים, ניהול ופרופיל. אף תשובה קיימת לא השתנתה.

### המודל

```prisma
model BoardInvitation {
  id           String           @id @default(uuid()) @db.Uuid
  boardId      String           @db.Uuid
  inviterId    String           @db.Uuid
  inviteeEmail String           @db.VarChar(254)   // אחרי trim ו־lowercase
  status       InvitationStatus @default(PENDING)  // PENDING | ACCEPTED | DECLINED
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  respondedAt  DateTime?

  board   Board @relation("BoardInvitations", ..., onDelete: Cascade)
  inviter User  @relation("InvitationSender", ..., onDelete: Cascade)

  @@unique([boardId, inviteeEmail])
  @@index([inviteeEmail, status])
  @@index([inviterId])
}
```

- **מניעת כפילות ברמת מסד הנתונים:** יש בדיוק שורה אחת לכל לוח וכתובת (`@@unique`). כשמזמינים שוב כתובת שכבר ענתה, אותה שורה חוזרת ל־`PENDING`. לכן אי אפשר שיהיו שתי הזמנות ממתינות לאותו לוח ולאותה כתובת, גם כשנשלחות כמה בקשות באותו רגע.
- **מחיקה:** כשמוחקים לוח, ההזמנות שלו נמחקות איתו. כשמוחקים משתמש, ההזמנות ששלח נמחקות. זו אותה התנהגות (Cascade) שיש היום לחברויות ולזיכרונות.

---

## 2. פקודות להפעלה ב־Windows (PowerShell)

מריצים בתיקיית הפרויקט. הפקודות האלה **לא מוחקות מידע**.

```powershell
# 1. התקנת החבילות (אם עוד לא הותקנו)
npm install

# 2. הוספת הטבלה החדשה למסד הנתונים. מריץ רק migrations שעוד לא רצו, ואף פעם לא מאפס
npx prisma migrate deploy

# 3. עדכון ה־Prisma Client לפי המודל החדש
npx prisma generate

# 4. בדיקת TypeScript ובנייה
npm run typecheck
npm run build

# 5. הבדיקות האוטומטיות (רצות על מסד נפרד, momenta_test)
npm test

# 6. הפעלה
npm run dev
```

אם הכתובת של מסד הבדיקות אצלך שונה, מגדירים אותה לפני `npm test`:

```powershell
$env:TEST_DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/momenta_test?schema=public"
npm test
```

> **לא להריץ** `npx prisma migrate reset` או `npm run db:reset` על מסד שיש בו מידע. הפקודות האלה מוחקות את כל הנתונים.
>
> בענן (Render) לא צריך לעשות כלום: הפקודה `npm run start:prod` כבר מריצה `prisma migrate deploy` בכל הפעלה.

### מה הורץ בפועל לפני שקיבלת את הקבצים

על PostgreSQL 16 מקומי, על הגרסה הראשונית של השרת עם התוספת:
`prisma migrate dev` (יצירת ה־migration), `npm run check` (typecheck, `prisma validate`, כל הבדיקות ו־build). **122 בדיקות עברו**: 94 הקיימות ו־28 החדשות. בדיקות ההזמנות הורצו עוד 3 פעמים כדי לוודא שבדיקות המקביליות יציבות.

---

## 3. חוזה ה־API

כל 5 הכתובות דורשות `Authorization: Bearer <token>` של **משתמש רגיל**.

- בלי Token: `401`.
- משתמש חסום: `403` עם `USER_BLOCKED` (המנגנון הקיים).
- מנהל: `403` עם `ROLE_FORBIDDEN`.
- כל שגיאה מוחזרת במבנה הקיים: `{ "error": { "code", "message", "details?" } }`.

### 3.1 `POST /api/boards/:id/invitations`: שליחת הזמנות

**מי:** פותח הלוח בלבד.

**Body:**

```json
{ "emails": ["yossi@example.com", "New.Friend@Example.com "] }
```

- מערך של 1 עד 20 כתובות. גם כתובת אחת נשלחת כמערך: `{ "emails": ["a@example.com"] }`.
- כל כתובת עוברת trim ו־lowercase. כתובת שמופיעה פעמיים נספרת פעם אחת.
- אם כתובת אחת לא תקינה, כל הבקשה נדחית ב־400, ולא נשמרת אף הזמנה.

**תשובה תקינה: `200`**

```json
{
  "boardId": "c2d4e6f8-1111-4a2b-9c3d-123456789abc",
  "invitedCount": 1,
  "results": [
    { "email": "yossi@example.com", "result": "ALREADY_MEMBER", "invitationId": null },
    { "email": "new.friend@example.com", "result": "INVITED", "invitationId": "7b3d9e1f-4444-4c2d-8e3f-0123456789ab" }
  ]
}
```

| `result` | מתי | נשמרה הזמנה? |
| --- | --- | --- |
| `INVITED` | נשמרה הזמנה ממתינה. גם לכתובת שעוד לא רשומה, וגם לכתובת שענתה בעבר ומוזמנת שוב | כן |
| `ALREADY_INVITED` | כבר יש הזמנה ממתינה ללוח הזה ולכתובת הזו | לא (הקיימת נשארת) |
| `ALREADY_MEMBER` | הכתובת שייכת למי שכבר חבר בלוח | לא |
| `SELF` | הכתובת של פותח הלוח עצמו | לא |
| `NOT_ALLOWED` | אי אפשר להזמין את הכתובת הזו (משתמש חסום או בעל המערכת). הסיבה לא נחשפת | לא |

**שגיאות:**

| קוד | `error.code` | מתי |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | מייל לא תקין, מערך ריק, יותר מ־20 כתובות, או שדה לא מוכר |
| 400 | `VALIDATION_ERROR` | ה־id של הלוח לא תקין |
| 403 | `NOT_BOARD_CREATOR` | חבר בלוח שאינו הפותח |
| 403 | `NOT_A_MEMBER` | מי שלא חבר בלוח בכלל |
| 403 | `ROLE_FORBIDDEN` | מנהל |
| 404 | `BOARD_NOT_FOUND` | הלוח לא קיים |

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "הנתונים שנשלחו לא תקינים",
    "details": [{ "location": "body", "field": "emails.1", "message": "כתובת המייל לא תקינה" }]
  }
}
```

`emails.1` אומר שהכתובת השנייה ברשימה (מספור מ־0) היא הלא תקינה.

### 3.1א `POST /api/boards`: פתיחת לוח עם הזמנות

**מי:** משתמש רגיל, כמו קודם. **ניתוב בקוד:** `src/modules/boards/boards.routes.ts`, השורה `boardsRouter.post('/', ...)`.

**Body:** כל השדות הקיימים, ועוד `emails` שאינו חובה:

```json
{
  "name": "הטיול השנתי",
  "description": "הזיכרונות של הכיתה",
  "eventType": "TRIP",
  "eventDate": "2026-10-27",
  "coverImageId": null,
  "emails": ["user1@gmail.com", "user2@gmail.com"]
}
```

- `emails` עובר את אותם כללים כמו ב־3.1: עד 20 כתובות, כל אחת תקינה, trim ו־lowercase, בלי כפילויות.
- **בלי `emails` או עם `[]`:** הלוח נוצר בדיוק כמו קודם, והתשובה היא `Board` רגיל, בלי שדה נוסף.
- **עם כתובות:** הלוח וההזמנות נשמרים יחד (transaction). אם משהו נכשל, לא נשמר כלום, ולא נשאר לוח בלי הזמנות.
- הכתובת של הפותח עצמו מקבלת `SELF` ולא מוזמנת. משתמש חסום או בעל המערכת מקבלים `NOT_ALLOWED`. בדיוק כמו ב־3.1.
- אף אחד לא נהיה חבר. `membersCount` נשאר 1 (רק הפותח) עד שמישהו מאשר.

**תשובה תקינה: `201`**: כל השדות של `Board`, ועוד `invitations`:

```json
{
  "id": "c2d4e6f8-1111-4a2b-9c3d-123456789abc",
  "name": "הטיול השנתי",
  "isCreator": true,
  "joinCode": "K7P2QX",
  "membersCount": 1,
  "...": "שאר השדות של Board",
  "invitations": {
    "invitedCount": 2,
    "results": [
      { "email": "user1@gmail.com", "result": "INVITED", "invitationId": "7b3d9e1f-4444-4c2d-8e3f-0123456789ab" },
      { "email": "user2@gmail.com", "result": "INVITED", "invitationId": "8c4e0f2a-5555-4d3e-9f40-123456789abc" }
    ]
  }
}
```

**שגיאות:** כמו קודם, ובנוסף `400 VALIDATION_ERROR` כשאחת הכתובות לא תקינה, יש יותר מ־20 כתובות, או ש־`emails` אינו מערך. במקרה כזה **הלוח לא נוצר**.

### 3.2 `GET /api/invitations`: ההזמנות שלי

**מי:** כל משתמש רגיל. מוחזרות **רק** הזמנות שנשלחו לכתובת של המשתמש המחובר, לפי ה־Token. השרת מתעלם מכל כתובת שהלקוח מנסה לשלוח.

**Query (הכול לא חובה):**

| פרמטר | ערכים | ברירת מחדל |
| --- | --- | --- |
| `status` | `PENDING`, `ACCEPTED`, `DECLINED` | `PENDING` |
| `page` | מ־1 | 1 |
| `limit` | 1 עד 50 | 20 |

**תשובה תקינה: `200`**, מהחדשה לישנה:

```json
{
  "items": [
    {
      "id": "7b3d9e1f-4444-4c2d-8e3f-0123456789ab",
      "status": "PENDING",
      "createdAt": "2026-10-26T18:00:00.000Z",
      "respondedAt": null,
      "board": {
        "id": "c2d4e6f8-1111-4a2b-9c3d-123456789abc",
        "name": "טיול שנתי י\"ב",
        "eventType": "TRIP",
        "eventTypeLabel": "טיול",
        "eventDate": "2026-04-14",
        "coverImageUrl": null
      },
      "inviter": { "id": "6f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f", "fullName": "נועה לוי", "avatarUrl": null }
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1,
  "totalPages": 1
}
```

אין בתשובה מיילים של אף אחד. **שגיאות:** `400` כש־`status` לא תקין, `401`, `403`.

### 3.3 `GET /api/invitations/pending-count`: המספר על הפעמון

**תשובה תקינה: `200`**

```json
{ "count": 2 }
```

**שגיאות:** `401`, `403`.
הנתיב `/pending-count` מוגדר לפני הנתיבים עם `:id`, ולכן הוא לא מתפרש כמזהה של הזמנה.

### 3.4 `POST /api/invitations/:id/accept`: אישור

**מי:** רק מי שההזמנה נשלחה לכתובת שלו. אין Body.

בפעולה אחת (transaction): ההזמנה עוברת מ־`PENDING` ל־`ACCEPTED`, והמשתמש נוסף לחברי הלוח.
אם הוא כבר חבר (למשל הצטרף בינתיים עם קוד), לא נוצרת חברות כפולה, וההזמנה פשוט מסומנת כמאושרת.

**תשובה תקינה: `200`**: הלוח, באותו מבנה של `POST /api/boards/join`. את `id` משתמשים לניווט לדף הלוח.

```json
{
  "id": "c2d4e6f8-1111-4a2b-9c3d-123456789abc",
  "name": "טיול שנתי י\"ב",
  "isCreator": false,
  "joinCode": null,
  "membersCount": 2,
  "...": "שאר השדות של Board"
}
```

**שגיאות:**

| קוד | `error.code` | מתי |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | ה־id לא תקין |
| 404 | `INVITATION_NOT_FOUND` | ההזמנה לא קיימת, הלוח שלה נמחק, **או שהיא של מישהו אחר** (כדי לא לחשוף שהיא קיימת) |
| 409 | `INVITATION_ALREADY_ANSWERED` | כבר אישרו או דחו את ההזמנה |

```json
{ "error": { "code": "INVITATION_ALREADY_ANSWERED", "message": "כבר השבת על ההזמנה הזו" } }
```

אם שתי בקשות אישור מגיעות באותו רגע, אחת מקבלת `200` והשנייה `409`, ונוצרת חברות אחת בלבד.

### 3.5 `POST /api/invitations/:id/decline`: דחייה

**מי:** רק מי שההזמנה נשלחה לכתובת שלו. אין Body. ההזמנה עוברת ל־`DECLINED`, והמשתמש לא מצטרף.

**תשובה תקינה: `200`**: ההזמנה, באותו מבנה של פריט ב־`GET /api/invitations`, עם `"status": "DECLINED"` ו־`respondedAt` מלא.

**שגיאות:** אותן שגיאות כמו באישור.

---

## 4. איך React עובד עם זה

**פתיחת לוח עם הזמנות (בקשה אחת):**

1. `POST /api/boards` עם פרטי הלוח ועם `emails`, אם המשתמש הקליד כתובות.
2. אם בתשובה יש `invitations`, מציגים לכל כתובת את ה־`result` שלה. למשל: "נשלחה הזמנה" או "זו הכתובת שלך".
3. מנווטים לדף הלוח החדש לפי `id`.

כדי להזמין עוד אנשים אחר כך, מדף הלוח: `POST /api/boards/{id}/invitations`.

**הפעמון והחלונית:**

1. אחרי התחברות או הרשמה: `GET /api/invitations/pending-count`, ומציגים את `count` על הפעמון שב־Header. אם הוא 0, אפשר להסתיר את המספר.
2. אם `count` גדול מ־0, פותחים את החלונית וטוענים את `GET /api/invitations` (ברירת המחדל: ממתינות).
3. לכל הזמנה מציגים את `board.name`, `board.eventTypeLabel`, `board.eventDate` ו־`inviter.fullName`, ושני כפתורים:
   - **אישור:** `POST /api/invitations/{id}/accept`. התשובה היא הלוח. מרעננים את רשימת הלוחות ואת המונה, ואפשר לנווט ל־`/boards/{board.id}`.
   - **דחייה:** `POST /api/invitations/{id}/decline`. מרעננים את הרשימה בחלונית ואת המונה.
4. **סגירת החלונית לא שולחת שום בקשה.** ההזמנות נשארות ממתינות, והפעמון ממשיך להציג אותן.
5. לחיצה על הפעמון פותחת שוב את החלונית וטוענת מחדש את `GET /api/invitations`.

אין עדכון בזמן אמת. כדי שהמספר יתעדכן, קוראים שוב ל־`pending-count` אחרי התחברות, אחרי אישור או דחייה, ובכל פתיחה של החלונית.

**איך מטפלים בשגיאות:**

- `409 INVITATION_ALREADY_ANSWERED` או `404 INVITATION_NOT_FOUND` באישור או בדחייה: ההזמנה כבר לא רלוונטית (למשל נענתה בלשונית אחרת, או שהלוח נמחק). מוחקים אותה מהחלונית ומרעננים.

---

## 5. מה קורה אם הלוח נוצר אבל שליחת ההזמנות נכשלה

**כשמזמינים בתוך `POST /api/boards` (מומלץ):** זה לא יכול לקרות. הלוח וההזמנות נשמרים יחד או לא נשמרים בכלל. אם התשובה היא שגיאה, לא נוצר לוח, ואפשר לתקן ולשלוח שוב את אותו טופס.

יש מקרה אחד שדורש זהירות: הבקשה הגיעה לשרת, אבל התשובה לא חזרה בגלל בעיית רשת. במקרה כזה ייתכן שהלוח כן נוצר. לפני שליחה חוזרת, טוענים את `GET /api/boards` ובודקים אם הלוח כבר מופיע ברשימה.

**כשמזמינים בבקשה נפרדת (`POST /api/boards/:id/invitations`):** אלה שתי בקשות נפרדות. אם הראשונה (`POST /api/boards`) הצליחה, **הלוח כבר קיים**, גם אם השנייה נכשלה (בעיית רשת, מייל לא תקין וכדומה).

כדי לא ליצור לוח כפול:

1. מיד אחרי ש־`POST /api/boards` מצליח, שומרים את ה־`id` של הלוח ב־state.
2. אם שליחת ההזמנות נכשלה, **לא שולחים שוב את טופס יצירת הלוח**. מציגים הודעה, למשל "הלוח נוצר, אבל ההזמנות לא נשלחו", וכפתור "נסי לשלוח שוב".
3. הכפתור שולח שוב רק את `POST /api/boards/{id}/invitations`, עם אותו `id` שנשמר.
4. אפשר גם לנווט לדף הלוח ולהזמין משם.

**שליחה חוזרת של אותן כתובות בטוחה.** כתובת שכבר הוזמנה מקבלת `ALREADY_INVITED`, ולא נוצרת הזמנה כפולה. גם אם הבקשה הקודמת הגיעה לשרת בלי שהתשובה חזרה, ניסיון חוזר לא יוצר כפילויות.

אם הבעיה היא כתובת לא תקינה (`400`), ב־`details[].field` כתוב איזו כתובת. מתקנים רק אותה ושולחים שוב.
