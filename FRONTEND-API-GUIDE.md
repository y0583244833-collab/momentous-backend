# מדריך API לצד ה־React

המסמך הזה מתאר כל מה שצד ה־React צריך לדעת כדי לעבוד מול השרת: כתובות, שדות, תשובות, שגיאות והרשאות.
אין כאן קוד React, ואת כל צד ה־React את כותבת בעצמך.

התיעוד החי והמלא נמצא גם ב־Swagger: `<BASE_URL>/api-docs`

---

## 1. כתובת הבסיס (Base URL)

| סביבה | Base URL |
| --- | --- |
| על המחשב | `http://localhost:3000` |
| בענן (Render) | הכתובת של השירות שלך, למשל `https://momenta-api.onrender.com` |

כל הכתובות מתחילות ב־`/api`. למשל: `https://momenta-api.onrender.com/api/boards`

כדאי לשמור את ה־Base URL במשתנה סביבה של פרויקט ה־React (למשל `VITE_API_URL`), ולא לכתוב אותו בכל מקום בקוד.

---

## 2. איך עובדת ההתחברות

1. המשתמש נרשם (`POST /api/auth/register`) או מתחבר (`POST /api/auth/login`).
2. השרת מחזיר `token` (JWT) ואת פרטי המשתמש (`user`).
3. שומרים את ה־`token` בצד הלקוח, למשל ב־localStorage, כדי שהמשתמש יישאר מחובר אחרי רענון.
4. שולחים את ה־token בכל בקשה לכתובת מוגנת.
5. ה־token תקף ליום אחד (ברירת מחדל). אחרי זה מתקבל `401` עם הקוד `TOKEN_EXPIRED`, וצריך להעביר את המשתמש למסך ההתחברות.
6. התנתקות = מחיקת ה־token בצד הלקוח. בשרת אין כתובת להתנתקות.
7. בטעינת האפליקציה, כשיש token שמור, אפשר לקרוא ל־`GET /api/auth/me` כדי לבדוק שהוא עדיין תקף ולקבל את פרטי המשתמש.

**לפי מה יודעים לאיזה מסך להעביר אחרי התחברות?** לפי `user.role`:

- `"USER"`: למסך "הלוחות שלי".
- `"ADMIN"`: למסך הניהול.

---

## 3. איך שולחים את ה־Token

בכל בקשה לכתובת מוגנת מוסיפים כותרת (Header):

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- המילה `Bearer`, רווח אחד, ואז ה־token.
- בבקשות עם גוף JSON מוסיפים גם `Content-Type: application/json`.
- בהעלאת תמונה **לא** מגדירים Content-Type ידנית (ראי סעיף 6).

---

## 4. כל הכתובות

✱ = צריך Token. **משתמש** = משתמש רגיל בלבד. **מנהל** = בעל המערכת בלבד.

### כלליות, התחברות ופרופיל

| Method | URL | מה עושה | מי |
| --- | --- | --- | --- |
| GET | `/api/health` | בדיקה שהשרת עובד | כולם |
| GET | `/api/options` | רשימות לתיבות בחירה: סוגי זיכרונות וסוגי אירועים | כולם |
| POST | `/api/auth/register` | הרשמה | כולם |
| POST | `/api/auth/login` | התחברות | כולם |
| GET | `/api/auth/me` | מי מחובר | ✱ כל מחובר |
| PATCH | `/api/users/me` | עריכת שם ותמונת פרופיל | ✱ כל מחובר |
| PATCH | `/api/users/me/password` | שינוי סיסמה | ✱ כל מחובר |
| POST | `/api/images` | העלאת תמונה | ✱ משתמש |
| GET | `/api/images/:id` | הצגת תמונה (לתגית img) | כולם |

### לוחות

| Method | URL | מה עושה | מי |
| --- | --- | --- | --- |
| GET | `/api/boards` | הלוחות שלי, עם חיפוש, סינון ומיון | ✱ משתמש |
| POST | `/api/boards` | פתיחת לוח | ✱ משתמש |
| POST | `/api/boards/join` | הצטרפות עם קוד | ✱ משתמש |
| GET | `/api/boards/:id` | פרטי לוח | ✱ חבר בלוח, או מנהל |
| PATCH | `/api/boards/:id` | עריכת לוח | ✱ פותח הלוח |
| DELETE | `/api/boards/:id` | מחיקת לוח | ✱ פותח הלוח, או מנהל |
| POST | `/api/boards/:id/join-code` | קוד הצטרפות חדש | ✱ פותח הלוח |
| GET | `/api/boards/:id/members` | חברי הלוח | ✱ חבר בלוח, או מנהל |
| DELETE | `/api/boards/:id/members/:userId` | הוצאת חבר | ✱ פותח הלוח |
| POST | `/api/boards/:id/leave` | עזיבת הלוח | ✱ חבר שאינו הפותח |

### הזמנות לפי מייל

| Method | URL | מה עושה | מי |
| --- | --- | --- | --- |
| POST | `/api/boards/:id/invitations` | שליחת הזמנות: `{ "emails": ["..."] }` | ✱ פותח הלוח |
| GET | `/api/invitations` | ההזמנות שלי (ברירת מחדל: ממתינות), עם עמודים | ✱ משתמש |
| GET | `/api/invitations/pending-count` | `{ count }` למספר על הפעמון | ✱ משתמש |
| POST | `/api/invitations/:id/accept` | אישור. מחזיר את הלוח | ✱ מי שההזמנה נשלחה למייל שלו |
| POST | `/api/invitations/:id/decline` | דחייה | ✱ מי שההזמנה נשלחה למייל שלו |

לא נשלח מייל בפועל. ההזמנה נשמרת בשרת, גם לכתובת שעוד לא רשומה, ומופיעה למי שמתחבר או נרשם עם הכתובת הזו. כל הפרטים, הדוגמאות והשגיאות נמצאים ב־[INVITATIONS.md](INVITATIONS.md).

### זיכרונות ולייקים

| Method | URL | מה עושה | מי |
| --- | --- | --- | --- |
| GET | `/api/boards/:id/memories` | זיכרונות הלוח, עם חיפוש, סינון ומיון | ✱ חבר בלוח, או מנהל |
| POST | `/api/boards/:id/memories` | הוספת זיכרון | ✱ חבר בלוח |
| GET | `/api/memories/:id` | זיכרון אחד | ✱ חבר בלוח, או מנהל |
| PATCH | `/api/memories/:id` | עריכת זיכרון | ✱ הכותב בלבד |
| DELETE | `/api/memories/:id` | מחיקת זיכרון | ✱ הכותב, או מנהל |
| POST | `/api/memories/:id/like` | לייק | ✱ חבר בלוח |
| DELETE | `/api/memories/:id/like` | ביטול לייק | ✱ חבר בלוח |

### בעל המערכת

| Method | URL | מה עושה | מי |
| --- | --- | --- | --- |
| GET | `/api/admin/users` | כל המשתמשים | ✱ מנהל |
| PATCH | `/api/admin/users/:id/block` | חסימה או שחרור | ✱ מנהל |
| DELETE | `/api/admin/users/:id` | מחיקת משתמש | ✱ מנהל |
| GET | `/api/admin/boards` | כל הלוחות | ✱ מנהל |

---

## 5. אילו כתובות צריך בכל מסך

### מסך 1 — הרשמה

- `POST /api/auth/register` עם `fullName`, `email`, `password`.
- אם המשתמש בחר תמונת פרופיל, **אחרי** ההרשמה (כשיש כבר token):
  1. `POST /api/images` עם הקובץ.
  2. `PATCH /api/users/me` עם `{ "avatarImageId": "<id מהשלב הקודם>" }`.
- למשתמש זה נראה כמו לחיצה אחת על "הרשמה".

### מסך 2 — התחברות

- `POST /api/auth/login`, ואז מעבר למסך לפי `user.role`.

### מסך 3 — הלוחות שלי

- `GET /api/boards` עם פרמטרים לפי מה שהמשתמש בחר (טבלה בסעיף 8).
- `GET /api/options`, כדי למלא את תיבת הבחירה "סוג אירוע".
- השדה "הצטרפות עם קוד": `POST /api/boards/join` עם `{ "code": "K7P2QX" }`. אחרי הצטרפות מוצלחת, הלוח מופיע ברשימה. מכאן נכנסים אליו בלחיצה, בלי קוד.
- לחיצה על לוח: מעבר למסך 5 עם ה־`id` שלו.

- **פעמון ההזמנות ב־Header:** אחרי התחברות או הרשמה קוראים ל־`GET /api/invitations/pending-count` ומציגים את `count`. לחיצה על הפעמון פותחת חלונית שטוענת את `GET /api/invitations`. לכל הזמנה יש כפתור אישור (`POST /api/invitations/:id/accept`) וכפתור דחייה (`POST /api/invitations/:id/decline`). אחרי כל תשובה מרעננים את החלונית, את המונה ואת רשימת הלוחות. סגירת החלונית לא משנה כלום בשרת.

### מסך 4 — טופס לוח (פתיחה ועריכה)

- `GET /api/options` לתיבת "סוג אירוע".
- תמונת שער (רשות): קודם `POST /api/images`, ואז שולחים את ה־`id` בשדה `coverImageId`.
- פתיחה: `POST /api/boards`. אפשר להוסיף שדה `emails` (עד 20 כתובות) כדי להזמין משתתפים כבר עכשיו. אז בתשובה יש גם `invitations`, עם תוצאה לכל כתובת (פירוט ב־[INVITATIONS.md](INVITATIONS.md)).
- עריכה: למלא את הטופס מ־`GET /api/boards/:id`, ולשמור עם `PATCH /api/boards/:id`.

### מסך 5 — דף הלוח

- `GET /api/boards/:id`: פרטי הלוח. אם `isCreator` הוא `true`, מציגים את `joinCode` ואת כפתורי הניהול.
- `GET /api/boards/:id/memories`: רשימת הזיכרונות, עם חיפוש, סינון ומיון.
- `GET /api/boards/:id/members`: רשימת החברים.
- `GET /api/options`: לתיבת הסינון לפי סוג.
- לייק: `POST /api/memories/:id/like`. ביטול: `DELETE /api/memories/:id/like`. התשובה מחזירה את `likesCount` ואת `likedByMe` המעודכנים.
- מחיקת זיכרון שלי (כשהשדה `isMine` הוא `true`): `DELETE /api/memories/:id`.
- עזיבת הלוח (למי שאינו הפותח): `POST /api/boards/:id/leave`.
- פותח הלוח בלבד: קוד חדש `POST /api/boards/:id/join-code`, הוצאת חבר `DELETE /api/boards/:id/members/:userId`, מחיקת הלוח `DELETE /api/boards/:id`.
- בעל המערכת מגיע לכאן ממסך הניהול. הוא רואה הכול ויכול רק למחוק זיכרונות ולוחות.

### מסך 6 — טופס זיכרון (הוספה ועריכה)

- `GET /api/options` לתיבת "סוג זיכרון".
- תמונה: קודם `POST /api/images`, ואז שולחים את ה־`id` בשדה `imageId`.
- הוספה: `POST /api/boards/:boardId/memories`.
- עריכה: למלא מ־`GET /api/memories/:id`, ולשמור עם `PATCH /api/memories/:id`.
- אם מתקבל `409` עם `DUPLICATE_IMAGE`, התמונה כבר קיימת בלוח. כדאי להציג את ה־`message` למשתמש.

### מסך 7 — הפרופיל שלי

- `GET /api/auth/me`: הנתונים הנוכחיים.
- `PATCH /api/users/me`: שם ותמונה. `avatarImageId: null` מוחק את התמונה.
- `PATCH /api/users/me/password`: שינוי סיסמה.

### מסך 8 — ניהול (אפשר כמסך אחד עם לשוניות, או כשני מסכים)

- 8א, משתמשים: `GET /api/admin/users`, `PATCH /api/admin/users/:id/block`, `DELETE /api/admin/users/:id`
- 8ב, לוחות: `GET /api/admin/boards`. לחיצה על לוח פותחת את מסך 5. מחיקת לוח: `DELETE /api/boards/:id`.

---

## 6. תמונות

### העלאה

- `POST /api/images` עם **FormData**, בשדה בשם `file`.
- סוגים מותרים: JPG, PNG, WEBP. גודל מרבי: 2MB.
- **אל תגדירי** `Content-Type` בעצמך. הדפדפן מוסיף אותו לבד, יחד עם ה־boundary. צריך רק את כותרת ה־Authorization.

דוגמה ב־JavaScript רגיל (לא React), רק כדי להראות את מבנה הבקשה:

```js
const form = new FormData();
form.append('file', fileFromInput); // הקובץ שנבחר ב־<input type="file">

const res = await fetch(`${BASE_URL}/api/images`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
const image = await res.json(); // { id, url, mimeType, sizeBytes, contentHash }
```

### הצגה

- השרת מחזיר כתובות **יחסיות**, למשל `"imageUrl": "/api/images/5e2a..."`.
- כדי להציג, מחברים לפניהן את ה־Base URL: `src = BASE_URL + memory.imageUrl`
- כשהערך הוא `null`, אין תמונה. אפשר להציג תמונת ברירת מחדל.
- להצגת תמונה לא צריך Token.

### תמונות כפולות

השרת מזהה תמונה לפי **התוכן** שלה, לא לפי שם הקובץ. אם מנסים לצרף לזיכרון תמונה שכבר קיימת בזיכרון אחר באותו לוח, מתקבל `409`, והודעה כמו: `התמונה הזו כבר קיימת בלוח, בזיכרון "הזריחה במצדה"`.

---

## 7. מבני הנתונים

### User (פרופיל: מוחזר רק למשתמש עצמו ולמנהל)

```json
{
  "id": "6f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
  "fullName": "נועה לוי",
  "email": "noa@example.com",
  "role": "USER",
  "avatarImageId": null,
  "avatarUrl": null,
  "isBlocked": false,
  "createdAt": "2026-10-01T10:00:00.000Z"
}
```

### PublicUser (מה שחברים אחרים רואים)

```json
{ "id": "6f1c...", "fullName": "נועה לוי", "avatarUrl": "/api/images/..." }
```

### Board

```json
{
  "id": "c2d4e6f8-1111-4a2b-9c3d-123456789abc",
  "name": "טיול שנתי י\"ב",
  "description": "שלושה ימים בדרום",
  "eventType": "TRIP",
  "eventTypeLabel": "טיול",
  "eventDate": "2026-04-14",
  "coverImageId": null,
  "coverImageUrl": null,
  "creator": { "id": "6f1c...", "fullName": "נועה לוי", "avatarUrl": null },
  "isCreator": true,
  "joinCode": "K7P2QX",
  "membersCount": 3,
  "memoriesCount": 5,
  "lastActivityAt": "2026-10-20T18:30:00.000Z",
  "createdAt": "2026-10-01T10:05:00.000Z",
  "updatedAt": "2026-10-01T10:05:00.000Z"
}
```

- `joinCode` מוחזר רק לפותח הלוח. לכל השאר הוא `null`.
- `isCreator` אומר אם המשתמש המחובר פתח את הלוח. לפיו מחליטים אם להציג כפתורי עריכה וניהול.

### Memory

```json
{
  "id": "a91b2c3d-2222-4e5f-8a9b-abcdefabcdef",
  "boardId": "c2d4...",
  "type": "SUMMARY",
  "typeLabel": "סיכום",
  "title": "הזריחה במצדה",
  "content": "קמנו בארבע בלילה...",
  "imageId": null,
  "imageUrl": null,
  "placeUrl": "https://maps.google.com/?q=Masada",
  "happenedAt": "2026-04-15",
  "author": { "id": "6f1c...", "fullName": "נועה לוי", "avatarUrl": null },
  "isMine": true,
  "likesCount": 7,
  "likedByMe": true,
  "createdAt": "2026-04-16T09:12:00.000Z",
  "updatedAt": "2026-04-16T09:12:00.000Z"
}
```

- `isMine` אומר אם המשתמש המחובר כתב את הזיכרון. לפיו מציגים כפתורי עריכה ומחיקה.
- `likedByMe` אומר אם המשתמש כבר עשה לייק. לפיו מציגים לב מלא או ריק.

### Invitation (הזמנה, כפי שהמוזמן רואה אותה)

```json
{
  "id": "7b3d9e1f-4444-4c2d-8e3f-0123456789ab",
  "status": "PENDING",
  "createdAt": "2026-10-26T18:00:00.000Z",
  "respondedAt": null,
  "board": {
    "id": "c2d4...",
    "name": "טיול שנתי י\"ב",
    "eventType": "TRIP",
    "eventTypeLabel": "טיול",
    "eventDate": "2026-04-14",
    "coverImageUrl": null
  },
  "inviter": { "id": "6f1c...", "fullName": "נועה לוי", "avatarUrl": null }
}
```

- `status` הוא `PENDING` (ממתינה), `ACCEPTED` (אושרה) או `DECLINED` (נדחתה).

### Member (ברשימת החברים)

```json
{ "id": "6f1c...", "fullName": "נועה לוי", "avatarUrl": null, "isCreator": true, "joinedAt": "2026-10-01T10:05:00.000Z" }
```

### רשימה עם עמודים (Page)

כל הרשימות (`GET /api/boards`, `GET /api/boards/:id/memories` ורשימות המנהל) מחזירות:

```json
{ "items": [ ... ], "page": 1, "limit": 20, "total": 37, "totalPages": 2 }
```

### ערכים קבועים

אפשר לקבל אותם גם מ־`GET /api/options`.

| eventType | מוצג |
| --- | --- |
| `TRIP` | טיול |
| `GRADUATION` | מסיבת סיום |
| `CAMP` | קייטנה |
| `FAMILY` | שבת או אירוע משפחתי |
| `OTHER` | אחר |

| type (זיכרון) | מוצג |
| --- | --- |
| `PHOTO` | תמונה |
| `PLACE` | מקום |
| `SUMMARY` | סיכום |
| `JOKE` | בדיחה קבוצתית |
| `QUOTE` | ציטוט |

**תאריכים:** `eventDate` ו־`happenedAt` נשלחים ומתקבלים בפורמט `YYYY-MM-DD`, כמו הערך של `<input type="date">`. שדות הזמן (`createdAt` וכו') הם ISO מלא.

---

## 8. חיפוש, סינון ומיון

הפרמטרים נשלחים ב־query string. כל הפרמטרים אופציונליים, ופרמטר ריק נחשב כאילו לא נשלח.

### `GET /api/boards` (הלוחות שלי)

| פרמטר | ערכים | דוגמה |
| --- | --- | --- |
| `q` | טקסט: חיפוש בשם ובתיאור | `q=טיול` |
| `eventType` | אחד מסוגי האירוע | `eventType=CAMP` |
| `from` | תאריך אירוע מ־ | `from=2026-01-01` |
| `to` | תאריך אירוע עד | `to=2026-12-31` |
| `role` | `created` (פתחתי) או `joined` (הצטרפתי) | `role=created` |
| `sort` | `lastActivity` (ברירת מחדל), `eventDate`, `name` | `sort=eventDate` |
| `order` | `desc` (ברירת מחדל) או `asc` | `order=asc` |
| `page`, `limit` | עמוד (מ־1), גודל עמוד (עד 50, ברירת מחדל 20) | `page=2&limit=10` |

דוגמה: `/api/boards?q=טיול&from=2026-01-01&sort=eventDate&order=asc`

### `GET /api/boards/:id/memories`

| פרמטר | ערכים |
| --- | --- |
| `q` | חיפוש בכותרת ובתוכן |
| `type` | אחד מסוגי הזיכרון |
| `authorId` | id של חבר בלוח |
| `mine` | `true` = רק הזיכרונות שלי |
| `sort` | `newest` (ברירת מחדל), `mostLiked`, `happenedAt` (ציר זמן: מהמוקדם למאוחר, זיכרונות בלי תאריך בסוף) |
| `page`, `limit` | כמו למעלה |

### מנהל

- `GET /api/admin/users`: `q` (שם או מייל), `blocked=true/false`, `page`, `limit`
- `GET /api/admin/boards`: `q`, `eventType`, `page`, `limit`

---

## 9. שדות בטפסים

| טופס | שדה | חובה | כללים |
| --- | --- | --- | --- |
| הרשמה | `fullName` | כן | 2 עד 60 תווים |
| | `email` | כן | מייל תקין |
| | `password` | כן | 8 עד 72 תווים |
| התחברות | `email`, `password` | כן | |
| פרופיל | `fullName` | לא | 2 עד 60 תווים |
| | `avatarImageId` | לא | id של תמונה שהעלית, או `null` |
| שינוי סיסמה | `currentPassword` | כן | |
| | `newPassword` | כן | 8 עד 72 תווים, שונה מהנוכחית |
| לוח | `name` | כן | 2 עד 80 תווים |
| | `description` | לא | עד 1,000 תווים |
| | `eventType` | כן | מהרשימה |
| | `eventDate` | כן | `YYYY-MM-DD` |
| | `coverImageId` | לא | id של תמונה שהעלית |
| | `emails` | לא | רק בפתיחת לוח: מערך של עד 20 מיילים להזמנה |
| הצטרפות | `code` | כן | 6 תווים (אותיות גדולות או קטנות) |
| זיכרון | `title` | כן | 2 עד 120 תווים |
| | `content` | כן | 1 עד 5,000 תווים |
| | `type` | כן | מהרשימה |
| | `imageId` | **חובה כש־type הוא PHOTO** | id של תמונה שהעלית |
| | `placeUrl` | לא | קישור שמתחיל ב־http או https |
| | `happenedAt` | לא | `YYYY-MM-DD` |

**בעריכה (PATCH)** שולחים רק את השדות שהשתנו, אבל לפחות שדה אחד.
**שדות שאינם ברשימה** (למשל `role` או `authorId`) גורמים לשגיאה 400. השרת קובע אותם לבד.

---

## 10. שגיאות

כל שגיאה חוזרת באותו מבנה:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "הנתונים שנשלחו לא תקינים",
    "details": [
      { "location": "body", "field": "email", "message": "כתובת המייל לא תקינה" }
    ]
  }
}
```

- `message` בעברית, ואפשר להציג אותו כמו שהוא.
- ב־`VALIDATION_ERROR` יש `details` עם שם השדה. אפשר להציג כל הודעה ליד השדה המתאים בטופס.

| קוד HTTP | מתי | codes נפוצים |
| --- | --- | --- |
| 400 | נתונים לא תקינים | `VALIDATION_ERROR`, `INVALID_JSON`, `FILE_MISSING`, `FILE_TOO_LARGE`, `INVALID_FILE_TYPE`, `WRONG_PASSWORD`, `CREATOR_CANNOT_LEAVE`, `INVALID_DATE_RANGE` |
| 401 | לא מחובר | `TOKEN_MISSING`, `TOKEN_INVALID`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS` |
| 403 | אין הרשאה | `ROLE_FORBIDDEN`, `NOT_A_MEMBER`, `NOT_BOARD_CREATOR`, `NOT_MEMORY_AUTHOR`, `USER_BLOCKED`, `IMAGE_NOT_OWNED` |
| 404 | לא נמצא | `BOARD_NOT_FOUND`, `MEMORY_NOT_FOUND`, `JOIN_CODE_NOT_FOUND`, `INVITATION_NOT_FOUND`, `NOT_FOUND`, `ROUTE_NOT_FOUND` |
| 409 | התנגשות | `EMAIL_TAKEN`, `ALREADY_MEMBER`, `DUPLICATE_IMAGE`, `INVITATION_ALREADY_ANSWERED` |
| 500 | תקלה בשרת | `INTERNAL_ERROR` |

**מה כדאי לעשות ב־React:**

- **401**: למחוק את ה־token ולהעביר למסך ההתחברות. חריג: ב־`INVALID_CREDENTIALS` במסך ההתחברות, פשוט להציג "המייל או הסיסמה שגויים".
- **403** עם `USER_BLOCKED`: להציג שהחשבון חסום ולנתק.
- **403** אחר: להציג את ה־`message`, או לחזור למסך הקודם.

---

## 11. הרשאות בקצרה

| פעולה | חבר בלוח | פותח הלוח | בעל המערכת |
| --- | --- | --- | --- |
| פתיחת לוח, הצטרפות, העלאת תמונה | כן | כן | לא |
| צפייה בלוח, בזיכרונות ובחברים | כן | כן | כן, בכל הלוחות |
| קוד הצטרפות, הזמנה לפי מייל, עריכת לוח, הוצאת חבר | לא | כן | לא |
| אישור או דחייה של הזמנה שנשלחה למייל שלו | כן | כן | לא |
| מחיקת לוח | לא | כן | כן |
| עזיבת לוח | כן | לא | — |
| הוספת זיכרון ולייק | כן | כן | לא |
| עריכת זיכרון | רק שלו | רק שלו | לא |
| מחיקת זיכרון | רק שלו | רק שלו | כן, כל זיכרון |
| ניהול משתמשים | לא | לא | כן |

משתמש שאינו חבר בלוח מקבל `403` על כל כתובת של הלוח.

---

## 12. מה מוחזר בהצלחה

| פעולה | קוד | גוף |
| --- | --- | --- |
| הרשמה | 201 | `{ token, user }` |
| התחברות | 200 | `{ token, user }` |
| me, עריכת פרופיל | 200 | `User` |
| שינוי סיסמה | 204 | ריק |
| העלאת תמונה | 201 | `{ id, url, mimeType, sizeBytes, contentHash }` |
| רשימות | 200 | `{ items, page, limit, total, totalPages }` |
| פתיחת לוח | 201 | `Board`. אם נשלחו `emails`, נוסף גם השדה `invitations` |
| הצטרפות, פרטי לוח, עריכת לוח | 200 | `Board` |
| קוד חדש | 200 | `{ joinCode }` |
| חברי הלוח | 200 | `Member[]` (מערך רגיל, בלי עמודים) |
| שליחת הזמנות | 200 | `{ boardId, invitedCount, results }` |
| ההזמנות שלי | 200 | `{ items, page, limit, total, totalPages }` |
| מונה ההזמנות | 200 | `{ count }` |
| אישור הזמנה | 200 | `Board` |
| דחיית הזמנה | 200 | `Invitation` |
| הוספת זיכרון | 201 | `Memory` |
| זיכרון, עריכת זיכרון | 200 | `Memory` |
| לייק וביטול לייק | 200 | `{ memoryId, likesCount, likedByMe }` |
| חסימה | 200 | `User` |
| כל מחיקה, עזיבה והוצאת חבר | 204 | ריק |

> ב־204 אין גוף. לא לקרוא `res.json()` על תשובה כזו.

---

## 13. משתמשי הדגמה (על המחשב)

| תפקיד | מייל | סיסמה |
| --- | --- | --- |
| בעל המערכת | admin@momenta.local | Admin1234! |
| נועה | noa@example.com | Demo1234! |
| יוסי | yossi@example.com | Demo1234! |
| דנה | dana@example.com | Demo1234! |

קודי הצטרפות ללוחות ההדגמה: `D0TRIP`, `D1CAMP`, `D2FAMI`. בענן משתמשי ההדגמה קיימים רק אם הגדרת `SEED_DEMO_DATA=true`, ואז הסיסמה שלהם היא `SEED_DEMO_PASSWORD`.
