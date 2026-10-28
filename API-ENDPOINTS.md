# כל כתובות השרת: ניתובים ומטרות

רשימה מסודרת של כל 36 הכתובות בשרת Momenta, לפי נושאים.
כל הכתובות מתחילות ב־`/api`. אפשר לנסות כל אחת מהן ב־Swagger בכתובת `/api-docs`.

**מקרא לעמודה "מי":**

- **כולם**: לא צריך להתחבר.
- **מחובר**: כל משתמש מחובר (משתמש רגיל או מנהל).
- **משתמש**: משתמש רגיל בלבד. מנהל מקבל 403.
- **חבר בלוח**: משתמש רגיל שחבר בלוח.
- **פותח הלוח**: מי שיצר את הלוח.
- **מנהל**: בעל המערכת בלבד.

כל כתובת שאינה "כולם" צריכה את הכותרת `Authorization: Bearer <token>`. בלי Token מתקבל 401, ובלי הרשאה מתקבל 403.

---

## 1. מערכת

| # | Method | ניתוב | מטרה | מי | שולחים | מקבלים |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET | `/api/health` | בדיקה שהשרת ומסד הנתונים עובדים | כולם | — | `{ status, database, time }` |
| 2 | GET | `/api/options` | רשימות לתיבות בחירה: סוגי זיכרונות וסוגי אירועים, עם השם בעברית | כולם | — | `{ memoryTypes, eventTypes }` |

## 2. התחברות ופרופיל

| # | Method | ניתוב | מטרה | מי | שולחים | מקבלים |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | POST | `/api/auth/register` | הרשמה של משתמש חדש | כולם | `{ fullName, email, password }` | 201 `{ token, user }` |
| 4 | POST | `/api/auth/login` | התחברות | כולם | `{ email, password }` | `{ token, user }` |
| 5 | GET | `/api/auth/me` | הפרטים של המשתמש המחובר | מחובר | — | `User` |
| 6 | PATCH | `/api/users/me` | עריכת שם ותמונת פרופיל | מחובר | `{ fullName?, avatarImageId? }` | `User` |
| 7 | PATCH | `/api/users/me/password` | שינוי סיסמה | מחובר | `{ currentPassword, newPassword }` | 204 |

## 3. תמונות

| # | Method | ניתוב | מטרה | מי | שולחים | מקבלים |
| --- | --- | --- | --- | --- | --- | --- |
| 8 | POST | `/api/images` | העלאת תמונה (jpg, png, webp, עד 2MB) | משתמש | `multipart/form-data` עם שדה `file` | 201 `{ id, url, mimeType, sizeBytes, contentHash }` |
| 9 | GET | `/api/images/:id` | הצגת תמונה, לתגית `<img>` | כולם | — | קובץ התמונה |

## 4. לוחות

| # | Method | ניתוב | מטרה | מי | שולחים | מקבלים |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | GET | `/api/boards` | הלוחות שלי, עם חיפוש, סינון ומיון | משתמש | query: `q, eventType, from, to, role, sort, order, page, limit` | `Page<Board>` |
| 11 | POST | `/api/boards` | פתיחת לוח חדש. הפותח נהיה חבר אוטומטית. אפשר להזמין משתתפים כבר כאן | משתמש | `{ name, eventType, eventDate, description?, coverImageId?, emails? }` | 201 `Board` (ועם `emails`: גם `invitations`) |
| 12 | POST | `/api/boards/join` | הצטרפות ללוח עם קוד | משתמש | `{ code }` | `Board` |
| 13 | GET | `/api/boards/:id` | פרטי לוח | חבר בלוח, או מנהל | — | `Board` |
| 14 | PATCH | `/api/boards/:id` | עריכת פרטי לוח | פותח הלוח | השדות שמשנים | `Board` |
| 15 | DELETE | `/api/boards/:id` | מחיקת לוח, עם כל הזיכרונות, החברויות וההזמנות שלו | פותח הלוח, או מנהל | — | 204 |
| 16 | POST | `/api/boards/:id/join-code` | יצירת קוד הצטרפות חדש. הקוד הישן מפסיק לעבוד | פותח הלוח | — | `{ joinCode }` |
| 17 | GET | `/api/boards/:id/members` | חברי הלוח (שם ותמונה בלבד) | חבר בלוח, או מנהל | — | `Member[]` |
| 18 | DELETE | `/api/boards/:id/members/:userId` | הוצאת חבר מהלוח | פותח הלוח | — | 204 |
| 19 | POST | `/api/boards/:id/leave` | עזיבת הלוח | חבר שאינו הפותח | — | 204 |

## 5. הזמנות לפי מייל (חדש)

| # | Method | ניתוב | מטרה | מי | שולחים | מקבלים |
| --- | --- | --- | --- | --- | --- | --- |
| 20 | POST | `/api/boards/:id/invitations` | שליחת הזמנות לכתובות מייל, גם לכתובות שעוד לא רשומות | פותח הלוח | `{ emails: [...] }` (1 עד 20) | `{ boardId, invitedCount, results }` |
| 21 | GET | `/api/invitations` | ההזמנות שנשלחו למייל שלי | משתמש | query: `status, page, limit` | `Page<Invitation>` |
| 22 | GET | `/api/invitations/pending-count` | מספר ההזמנות הממתינות, למספר על הפעמון | משתמש | — | `{ count }` |
| 23 | POST | `/api/invitations/:id/accept` | אישור הזמנה: מצטרפים ללוח | מי שההזמנה נשלחה למייל שלו | — | `Board` |
| 24 | POST | `/api/invitations/:id/decline` | דחיית הזמנה | מי שההזמנה נשלחה למייל שלו | — | `Invitation` |

פירוט מלא, כולל דוגמאות ושגיאות, נמצא ב־[INVITATIONS.md](INVITATIONS.md).

## 6. זיכרונות ולייקים

| # | Method | ניתוב | מטרה | מי | שולחים | מקבלים |
| --- | --- | --- | --- | --- | --- | --- |
| 25 | GET | `/api/boards/:id/memories` | זיכרונות הלוח, עם חיפוש, סינון ומיון | חבר בלוח, או מנהל | query: `q, type, authorId, mine, sort, page, limit` | `Page<Memory>` |
| 26 | POST | `/api/boards/:id/memories` | הוספת זיכרון ללוח | חבר בלוח | `{ title, content, type, imageId?, placeUrl?, happenedAt? }` | 201 `Memory` |
| 27 | GET | `/api/memories/:id` | זיכרון אחד | חבר בלוח, או מנהל | — | `Memory` |
| 28 | PATCH | `/api/memories/:id` | עריכת זיכרון | הכותב בלבד | השדות שמשנים | `Memory` |
| 29 | DELETE | `/api/memories/:id` | מחיקת זיכרון | הכותב, או מנהל | — | 204 |
| 30 | POST | `/api/memories/:id/like` | לייק לזיכרון | חבר בלוח | — | `{ memoryId, likesCount, likedByMe }` |
| 31 | DELETE | `/api/memories/:id/like` | ביטול לייק | חבר בלוח | — | `{ memoryId, likesCount, likedByMe }` |

## 7. בעל המערכת

| # | Method | ניתוב | מטרה | מי | שולחים | מקבלים |
| --- | --- | --- | --- | --- | --- | --- |
| 32 | GET | `/api/admin/users` | כל המשתמשים, עם חיפוש | מנהל | query: `q, blocked, page, limit` | `Page<AdminUser>` |
| 33 | PATCH | `/api/admin/users/:id/block` | חסימה או שחרור של משתמש | מנהל | `{ isBlocked }` | `User` |
| 34 | DELETE | `/api/admin/users/:id` | מחיקת משתמש | מנהל | — | 204 |
| 35 | GET | `/api/admin/boards` | כל הלוחות במערכת | מנהל | query: `q, eventType, page, limit` | `Page<Board>` |
| 36 | GET | `/api/admin/stats` | סטטיסטיקות ללוח הבקרה: משתמשים, קבוצות וזיכרונות | מנהל | — | `{ usersCount, groupsCount, memoriesCount }` |

---

## מבנים שחוזרים בתשובות

- **`Page<T>`**: `{ items: T[], page, limit, total, totalPages }`
- **שגיאה**: `{ "error": { "code", "message", "details?" } }`. ההודעה ב־`message` בעברית, ואפשר להציג אותה כמו שהיא.
- **204**: אין גוף לתשובה.

המבנה המלא של `User`, `Board`, `Memory`, `Member` ו־`Invitation` מופיע ב־[FRONTEND-API-GUIDE.md](FRONTEND-API-GUIDE.md), פרק 7.

## איפה כל ניתוב נמצא בקוד

| נושא | קובץ הניתובים |
| --- | --- |
| מערכת | `src/modules/system/system.routes.ts` |
| התחברות | `src/modules/auth/auth.routes.ts` |
| פרופיל | `src/modules/users/users.routes.ts` |
| תמונות | `src/modules/images/images.routes.ts` |
| לוחות, זיכרונות בלוח, שליחת הזמנות | `src/modules/boards/boards.routes.ts` |
| ההזמנות שלי, אישור ודחייה | `src/modules/invitations/invitations.routes.ts` |
| זיכרון בודד ולייקים | `src/modules/memories/memories.routes.ts` |
| בעל המערכת | `src/modules/admin/admin.routes.ts` |

כל הנתיבים מחוברים לשרת בקובץ `src/app.ts`.
