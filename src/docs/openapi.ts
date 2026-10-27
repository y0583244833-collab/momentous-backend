/**
 * OpenAPI 3 description of the Momenta API.
 * Served at /openapi.json and shown in Swagger UI at /api-docs.
 * `npm run openapi:export` writes it to docs/openapi.json.
 */
import { EVENT_TYPES, MEMORY_TYPES } from '../constants/options';

type Json = Record<string, unknown>;

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const errorRef = (name: string) => ({ $ref: `#/components/responses/${name}` });
const json = (schema: Json, example?: unknown) => ({
  'application/json': { schema, ...(example !== undefined ? { example } : {}) },
});
const ok = (description: string, schema: Json, example?: unknown) => ({ description, content: json(schema, example) });
const noContent = { description: 'הפעולה הצליחה (אין גוף לתשובה)' };
const bearer = [{ bearerAuth: [] }];

const uuidExample = {
  user: '6f1c2b8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f',
  board: 'c2d4e6f8-1111-4a2b-9c3d-123456789abc',
  memory: 'a91b2c3d-2222-4e5f-8a9b-abcdefabcdef',
  image: '5e2a7c9d-3333-4b1c-9d2e-fedcbafedcba',
  invitation: '7b3d9e1f-4444-4c2d-8e3f-0123456789ab',
};

const pathId = (name: string, description: string, example: string) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string', format: 'uuid' },
  example,
});
const query = (name: string, description: string, schema: Json, example?: unknown) => ({
  name,
  in: 'query',
  required: false,
  description,
  schema,
  ...(example !== undefined ? { example } : {}),
});
const pageParams = [
  query('page', 'מספר העמוד (מתחיל ב־1)', { type: 'integer', minimum: 1, default: 1 }),
  query('limit', 'כמה פריטים בעמוד (עד 50)', { type: 'integer', minimum: 1, maximum: 50, default: 20 }),
];

const userProfileExample = {
  id: uuidExample.user,
  fullName: 'נועה לוי',
  email: 'noa@example.com',
  role: 'USER',
  avatarImageId: null,
  avatarUrl: null,
  isBlocked: false,
  createdAt: '2026-10-01T10:00:00.000Z',
};
const publicUserExample = { id: uuidExample.user, fullName: 'נועה לוי', avatarUrl: null };
const boardExample = {
  id: uuidExample.board,
  name: 'טיול שנתי י"ב',
  description: 'שלושה ימים בדרום',
  eventType: 'TRIP',
  eventTypeLabel: 'טיול',
  eventDate: '2026-04-14',
  coverImageId: null,
  coverImageUrl: null,
  creator: publicUserExample,
  isCreator: true,
  joinCode: 'K7P2QX',
  membersCount: 3,
  memoriesCount: 5,
  lastActivityAt: '2026-10-20T18:30:00.000Z',
  createdAt: '2026-10-01T10:05:00.000Z',
  updatedAt: '2026-10-01T10:05:00.000Z',
};
const memoryExample = {
  id: uuidExample.memory,
  boardId: uuidExample.board,
  type: 'SUMMARY',
  typeLabel: 'סיכום',
  title: 'הזריחה במצדה',
  content: 'קמנו בארבע בלילה ועלינו בשביל הנחש...',
  imageId: uuidExample.image,
  imageUrl: `/api/images/${uuidExample.image}`,
  placeUrl: 'https://maps.google.com/?q=Masada',
  happenedAt: '2026-04-15',
  author: publicUserExample,
  isMine: true,
  likesCount: 7,
  likedByMe: true,
  createdAt: '2026-04-16T09:12:00.000Z',
  updatedAt: '2026-04-16T09:12:00.000Z',
};
const invitationExample = {
  id: uuidExample.invitation,
  status: 'PENDING',
  createdAt: '2026-10-26T18:00:00.000Z',
  respondedAt: null,
  board: {
    id: uuidExample.board,
    name: 'טיול שנתי י"ב',
    eventType: 'TRIP',
    eventTypeLabel: 'טיול',
    eventDate: '2026-04-14',
    coverImageUrl: null,
  },
  inviter: { id: uuidExample.user, fullName: 'נועה לוי', avatarUrl: null },
};

const page = (item: unknown) => ({ items: [item], page: 1, limit: 20, total: 1, totalPages: 1 });

const pageSchema = (itemSchema: string) => ({
  type: 'object',
  required: ['items', 'page', 'limit', 'total', 'totalPages'],
  properties: {
    items: { type: 'array', items: ref(itemSchema) },
    page: { type: 'integer' },
    limit: { type: 'integer' },
    total: { type: 'integer', description: 'כמה פריטים יש בסך הכול' },
    totalPages: { type: 'integer' },
  },
});

const nullableString = (extra: Json = {}) => ({ type: 'string', nullable: true, ...extra });

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Momenta API — לוח זיכרונות משותף',
    version: '1.0.0',
    description: [
      'שרת לאפליקציית לוח זיכרונות משותף לקבוצות.',
      '',
      '**איך בודקים כתובת מוגנת:**',
      '1. פתחי את `POST /api/auth/login`, לחצי **Try it out**, ושלחי מייל וסיסמה.',
      '2. העתיקי את הערך של `token` מהתשובה.',
      '3. לחצי על הכפתור **Authorize** למעלה, הדביקי את ה־Token (בלי המילה Bearer) ולחצי Authorize.',
      '4. עכשיו כל הכתובות עם המנעול יישלחו עם ה־Token.',
      '',
      'בלי Token מקבלים **401**. עם Token של משתמש שאין לו הרשאה מקבלים **403**.',
      '',
      'כל שגיאה מוחזרת במבנה: `{ "error": { "code", "message", "details?" } }`.',
    ].join('\n'),
  },
  // Relative server URL: works on localhost and in the cloud without changes.
  servers: [{ url: '/', description: 'השרת הנוכחי' }],
  tags: [
    { name: 'System', description: 'בדיקת בריאות ורשימות בחירה' },
    { name: 'Auth', description: 'הרשמה, התחברות ומשתמש מחובר' },
    { name: 'Profile', description: 'הפרופיל שלי' },
    { name: 'Images', description: 'העלאה והצגה של תמונות' },
    { name: 'Boards', description: 'לוחות, הצטרפות וחברים (משתמש רגיל)' },
    { name: 'Invitations', description: 'הזמנות ללוח לפי כתובת מייל, ומונה לפעמון' },
    { name: 'Memories', description: 'זיכרונות ולייקים' },
    { name: 'Admin', description: 'מסכי בעל המערכת בלבד' },
  ],
  paths: {
    // ---------------- System ----------------
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'בדיקת בריאות השרת',
        description: 'בודק שהשרת עובד ושיש חיבור למסד הנתונים. ציבורי.',
        security: [],
        responses: {
          '200': ok('השרת ומסד הנתונים תקינים', ref('Health'), {
            status: 'ok',
            database: 'ok',
            time: '2026-10-22T20:00:00.000Z',
          }),
          '503': ok('אין חיבור למסד הנתונים', ref('Health'), {
            status: 'error',
            database: 'unreachable',
            time: '2026-10-22T20:00:00.000Z',
          }),
        },
      },
    },
    '/api/options': {
      get: {
        tags: ['System'],
        summary: 'רשימות הבחירה: סוגי זיכרונות וסוגי אירועים',
        description: 'מחזיר את הערכים האפשריים ואת השם שלהם בעברית, לבניית תיבות בחירה בטפסים. ציבורי.',
        security: [],
        responses: {
          '200': ok('הרשימות', ref('Options'), {
            memoryTypes: [
              { value: 'PHOTO', label: 'תמונה' },
              { value: 'PLACE', label: 'מקום' },
              { value: 'SUMMARY', label: 'סיכום' },
              { value: 'JOKE', label: 'בדיחה קבוצתית' },
              { value: 'QUOTE', label: 'ציטוט' },
            ],
            eventTypes: [
              { value: 'TRIP', label: 'טיול' },
              { value: 'GRADUATION', label: 'מסיבת סיום' },
              { value: 'CAMP', label: 'קייטנה' },
              { value: 'FAMILY', label: 'שבת או אירוע משפחתי' },
              { value: 'OTHER', label: 'אחר' },
            ],
          }),
        },
      },
    },

    // ---------------- Auth ----------------
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'הרשמה',
        description: 'יוצר משתמש רגיל ומחזיר Token, כך שהמשתמש מחובר מיד. אי אפשר להירשם כמנהל. ציבורי.',
        security: [],
        requestBody: {
          required: true,
          content: json(ref('RegisterRequest'), { fullName: 'נועה לוי', email: 'noa@example.com', password: 'Demo1234!' }),
        },
        responses: {
          '201': ok('נרשם בהצלחה', ref('AuthResponse'), { token: 'eyJhbGciOiJIUzI1NiIs...', user: userProfileExample }),
          '400': errorRef('BadRequest'),
          '409': errorRef('Conflict'),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'התחברות',
        description: 'מחזיר JWT Access Token בתוקף מוגבל (ברירת מחדל: יום אחד). ציבורי.',
        security: [],
        requestBody: {
          required: true,
          content: json(ref('LoginRequest'), { email: 'noa@example.com', password: 'Demo1234!' }),
        },
        responses: {
          '200': ok('התחברות הצליחה', ref('AuthResponse'), { token: 'eyJhbGciOiJIUzI1NiIs...', user: userProfileExample }),
          '400': errorRef('BadRequest'),
          '401': {
            description: 'מייל או סיסמה שגויים',
            content: json(ref('Error'), { error: { code: 'INVALID_CREDENTIALS', message: 'המייל או הסיסמה שגויים' } }),
          },
          '403': {
            description: 'החשבון חסום',
            content: json(ref('Error'), { error: { code: 'USER_BLOCKED', message: 'החשבון חסום על ידי בעל המערכת' } }),
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'מי אני',
        description: 'מחזיר את פרטי המשתמש המחובר לפי ה־Token. כל משתמש מחובר.',
        security: bearer,
        responses: {
          '200': ok('המשתמש המחובר', ref('UserProfile'), userProfileExample),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
        },
      },
    },

    // ---------------- Profile ----------------
    '/api/users/me': {
      patch: {
        tags: ['Profile'],
        summary: 'עריכת השם ותמונת הפרופיל שלי',
        description:
          'כדי להחליף תמונה: קודם מעלים אותה ב־`POST /api/images`, ואז שולחים כאן את ה־id שלה. `null` מוחק את התמונה. כל משתמש מחובר.',
        security: bearer,
        requestBody: {
          required: true,
          content: json(ref('UpdateProfileRequest'), { fullName: 'נועה לוי-כהן', avatarImageId: uuidExample.image }),
        },
        responses: {
          '200': ok('הפרופיל עודכן', ref('UserProfile'), userProfileExample),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
        },
      },
    },
    '/api/users/me/password': {
      patch: {
        tags: ['Profile'],
        summary: 'שינוי סיסמה',
        description: 'צריך את הסיסמה הנוכחית ואת החדשה. ה־Token הקיים ממשיך לעבוד. כל משתמש מחובר.',
        security: bearer,
        requestBody: {
          required: true,
          content: json(ref('ChangePasswordRequest'), { currentPassword: 'Demo1234!', newPassword: 'NewPass5678!' }),
        },
        responses: {
          '204': noContent,
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
        },
      },
    },

    // ---------------- Images ----------------
    '/api/images': {
      post: {
        tags: ['Images'],
        summary: 'העלאת תמונה',
        description:
          'שולחים קובץ בשדה `file` (multipart/form-data). JPG, PNG או WEBP, עד 2MB. מחזיר `id` שמצרפים לזיכרון, ללוח או לפרופיל. משתמש רגיל בלבד.',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: { file: { type: 'string', format: 'binary', description: 'קובץ התמונה' } },
              },
            },
          },
        },
        responses: {
          '201': ok('התמונה נשמרה', ref('ImageUpload'), {
            id: uuidExample.image,
            url: `/api/images/${uuidExample.image}`,
            mimeType: 'image/jpeg',
            sizeBytes: 245123,
            contentHash: '3f786850e387550fdab836ed7e6dc881de23001b6c6cfc4dfdfea4b0d0c5f0aa',
          }),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
        },
      },
    },
    '/api/images/{id}': {
      get: {
        tags: ['Images'],
        summary: 'הצגת תמונה',
        description:
          'מחזיר את קובץ התמונה עצמו, כך שאפשר לשים את הכתובת ישירות ב־`<img src>`. ציבורי, כי תגית img לא שולחת Token. המזהה אקראי ולא ניתן לניחוש.',
        security: [],
        parameters: [pathId('id', 'מזהה התמונה', uuidExample.image)],
        responses: {
          '200': {
            description: 'קובץ התמונה',
            content: {
              'image/jpeg': { schema: { type: 'string', format: 'binary' } },
              'image/png': { schema: { type: 'string', format: 'binary' } },
              'image/webp': { schema: { type: 'string', format: 'binary' } },
            },
          },
          '400': errorRef('BadRequest'),
          '404': errorRef('NotFound'),
        },
      },
    },

    // ---------------- Boards ----------------
    '/api/boards': {
      get: {
        tags: ['Boards'],
        summary: 'הלוחות שלי',
        description:
          'רק לוחות שהמשתמש חבר בהם (פתח או הצטרף). אחרי הצטרפות הלוח מופיע כאן תמיד, ונכנסים אליו בלי קוד. משתמש רגיל בלבד.',
        security: bearer,
        parameters: [
          query('q', 'חיפוש בשם ובתיאור הלוח', { type: 'string' }, 'טיול'),
          query('eventType', 'סינון לפי סוג אירוע', { type: 'string', enum: EVENT_TYPES }),
          query('from', 'תאריך אירוע מ־ (YYYY-MM-DD)', { type: 'string', format: 'date' }, '2026-01-01'),
          query('to', 'תאריך אירוע עד (YYYY-MM-DD)', { type: 'string', format: 'date' }, '2026-12-31'),
          query('role', 'created = לוחות שפתחתי, joined = לוחות שהצטרפתי אליהם', {
            type: 'string',
            enum: ['created', 'joined'],
          }),
          query('sort', 'מיון', { type: 'string', enum: ['eventDate', 'name', 'lastActivity'], default: 'lastActivity' }),
          query('order', 'כיוון המיון', { type: 'string', enum: ['asc', 'desc'], default: 'desc' }),
          ...pageParams,
        ],
        responses: {
          '200': ok('רשימת הלוחות', ref('BoardPage'), page(boardExample)),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
        },
      },
      post: {
        tags: ['Boards'],
        summary: 'פתיחת לוח חדש',
        description:
          'מי שפותח את הלוח נרשם אוטומטית כחבר, ומקבל את קוד ההצטרפות. משתמש רגיל בלבד. ' +
          'אפשר לשלוח גם `emails` (לא חובה, עד 20 כתובות) כדי להזמין משתתפים כבר עכשיו. ' +
          'ההזמנות נוצרות באותם כללים בדיוק כמו ב־`POST /api/boards/{id}/invitations`, והלוח וההזמנות נשמרים יחד או לא נשמרים בכלל. ' +
          'אף אחד לא מצטרף ללוח עד שהוא מאשר. כשנשלחו כתובות, התשובה כוללת גם את השדה `invitations`. ' +
          'בלי `emails` או עם מערך ריק, הכתובת עובדת בדיוק כמו קודם.',
        security: bearer,
        requestBody: {
          required: true,
          content: json(ref('CreateBoardRequest'), {
            name: 'טיול שנתי י"ב',
            description: 'שלושה ימים בדרום',
            eventType: 'TRIP',
            eventDate: '2026-04-14',
            coverImageId: null,
            emails: ['yossi@example.com', 'new.friend@example.com'],
          }),
        },
        responses: {
          '201': ok('הלוח נוצר', ref('BoardWithInvitations'), {
            ...boardExample,
            invitations: {
              invitedCount: 2,
              results: [
                { email: 'yossi@example.com', result: 'INVITED', invitationId: uuidExample.invitation },
                { email: 'new.friend@example.com', result: 'INVITED', invitationId: '8c4e0f2a-5555-4d3e-9f40-123456789abc' },
              ],
            },
          }),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
        },
      },
    },
    '/api/boards/join': {
      post: {
        tags: ['Boards'],
        summary: 'הצטרפות ללוח עם קוד',
        description: 'מקלידים את הקוד פעם אחת. אחרי זה הלוח נשמר ברשימת "הלוחות שלי". משתמש רגיל בלבד.',
        security: bearer,
        requestBody: { required: true, content: json(ref('JoinBoardRequest'), { code: 'K7P2QX' }) },
        responses: {
          '200': ok('הצטרפת ללוח', ref('Board'), { ...boardExample, isCreator: false, joinCode: null }),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
          '409': errorRef('Conflict'),
        },
      },
    },
    '/api/boards/{id}': {
      parameters: [pathId('id', 'מזהה הלוח', uuidExample.board)],
      get: {
        tags: ['Boards'],
        summary: 'פרטי לוח',
        description: 'חברי הלוח ובעל המערכת. `joinCode` מוחזר רק לפותח הלוח (לאחרים: null).',
        security: bearer,
        responses: {
          '200': ok('פרטי הלוח', ref('Board'), boardExample),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
        },
      },
      patch: {
        tags: ['Boards'],
        summary: 'עריכת פרטי לוח',
        description: 'רק מי שפתח את הלוח. שולחים רק את השדות שרוצים לשנות.',
        security: bearer,
        requestBody: {
          required: true,
          content: json(ref('UpdateBoardRequest'), { name: 'טיול שנתי י"ב - דרום', eventDate: '2026-04-15' }),
        },
        responses: {
          '200': ok('הלוח עודכן', ref('Board'), boardExample),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
        },
      },
      delete: {
        tags: ['Boards'],
        summary: 'מחיקת לוח',
        description: 'מי שפתח את הלוח או בעל המערכת. נמחקים גם כל הזיכרונות, הלייקים והחברויות.',
        security: bearer,
        responses: {
          '204': noContent,
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
        },
      },
    },
    '/api/boards/{id}/join-code': {
      post: {
        tags: ['Boards'],
        summary: 'יצירת קוד הצטרפות חדש',
        description: 'הקוד הישן מפסיק לעבוד. מי שכבר חבר נשאר חבר. רק מי שפתח את הלוח.',
        security: bearer,
        parameters: [pathId('id', 'מזהה הלוח', uuidExample.board)],
        responses: {
          '200': ok('הקוד החדש', ref('JoinCode'), { joinCode: 'M4R8TZ' }),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
        },
      },
    },
    '/api/boards/{id}/members': {
      get: {
        tags: ['Boards'],
        summary: 'חברי הלוח',
        description: 'שם ותמונה בלבד, בלי מיילים. חברי הלוח ובעל המערכת.',
        security: bearer,
        parameters: [pathId('id', 'מזהה הלוח', uuidExample.board)],
        responses: {
          '200': ok('רשימת החברים', { type: 'array', items: ref('Member') }, [
            { ...publicUserExample, isCreator: true, joinedAt: '2026-10-01T10:05:00.000Z' },
          ]),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
        },
      },
    },
    '/api/boards/{id}/members/{userId}': {
      delete: {
        tags: ['Boards'],
        summary: 'הוצאת חבר מהלוח',
        description: 'רק מי שפתח את הלוח. הזיכרונות שהחבר כתב נשארים בלוח.',
        security: bearer,
        parameters: [
          pathId('id', 'מזהה הלוח', uuidExample.board),
          pathId('userId', 'מזהה החבר שמוציאים', uuidExample.user),
        ],
        responses: {
          '204': noContent,
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
        },
      },
    },
    '/api/boards/{id}/leave': {
      post: {
        tags: ['Boards'],
        summary: 'עזיבת הלוח',
        description: 'חבר בלוח שאינו הפותח. הפותח לא יכול לעזוב, רק למחוק את הלוח.',
        security: bearer,
        parameters: [pathId('id', 'מזהה הלוח', uuidExample.board)],
        responses: {
          '204': noContent,
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
        },
      },
    },

    // ---------------- Invitations ----------------
    '/api/boards/{id}/invitations': {
      post: {
        tags: ['Invitations'],
        summary: 'שליחת הזמנות ללוח לפי מייל',
        description:
          'רק מי שפתח את הלוח (משתמש רגיל). שולחים מערך של 1 עד 20 כתובות. הכתובות עוברות trim ו־lowercase, וכפילויות מוסרות. ' +
          'אפשר להזמין גם כתובת שעוד לא רשומה. לא נשלח מייל בפועל: ההזמנה נשמרת ומופיעה למי שמתחבר או נרשם עם הכתובת. ' +
          'אף אחד לא מצטרף ללוח עד שהוא מאשר. לכל כתובת מוחזרת תוצאה: ' +
          '`INVITED` (נשמרה הזמנה), `ALREADY_INVITED` (כבר יש הזמנה ממתינה), `ALREADY_MEMBER` (כבר חבר בלוח), ' +
          '`SELF` (הכתובת של פותח הלוח), `NOT_ALLOWED` (אי אפשר להזמין את הכתובת הזו). ' +
          'שליחה חוזרת של אותה כתובת לא יוצרת הזמנה כפולה, ולכן בטוח לנסות שוב.',
        security: bearer,
        parameters: [pathId('id', 'מזהה הלוח', uuidExample.board)],
        requestBody: {
          required: true,
          content: json(ref('CreateInvitationsRequest'), { emails: ['yossi@example.com', 'new.friend@example.com'] }),
        },
        responses: {
          '200': ok('תוצאת השליחה לכל כתובת', ref('InvitationsSendResult'), {
            boardId: uuidExample.board,
            invitedCount: 1,
            results: [
              { email: 'yossi@example.com', result: 'ALREADY_MEMBER', invitationId: null },
              { email: 'new.friend@example.com', result: 'INVITED', invitationId: uuidExample.invitation },
            ],
          }),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
        },
      },
    },
    '/api/invitations': {
      get: {
        tags: ['Invitations'],
        summary: 'ההזמנות שלי',
        description:
          'רק הזמנות שנשלחו לכתובת המייל של המשתמש המחובר (לפי ה־Token, לא לפי פרמטר). ' +
          'ברירת המחדל היא הזמנות ממתינות. מהחדשה לישנה. משתמש רגיל בלבד.',
        security: bearer,
        parameters: [
          query('status', 'סטטוס ההזמנות', { type: 'string', enum: ['PENDING', 'ACCEPTED', 'DECLINED'], default: 'PENDING' }),
          ...pageParams,
        ],
        responses: {
          '200': ok('רשימת ההזמנות', ref('InvitationPage'), page(invitationExample)),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
        },
      },
    },
    '/api/invitations/pending-count': {
      get: {
        tags: ['Invitations'],
        summary: 'מספר ההזמנות הממתינות (לפעמון)',
        description: 'מספר ההזמנות במצב PENDING שנשלחו לכתובת של המשתמש המחובר. משתמש רגיל בלבד.',
        security: bearer,
        responses: {
          '200': ok('המספר', ref('PendingCount'), { count: 2 }),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
        },
      },
    },
    '/api/invitations/{id}/accept': {
      post: {
        tags: ['Invitations'],
        summary: 'אישור הזמנה',
        description:
          'רק מי שההזמנה נשלחה לכתובת שלו. בפעולה אחת: ההזמנה עוברת מ־PENDING ל־ACCEPTED והמשתמש נוסף לחברי הלוח. ' +
          'אם הוא כבר חבר (למשל הצטרף עם קוד), לא נוצרת חברות כפולה. מחזיר את הלוח, כמו הצטרפות עם קוד. ' +
          'הזמנה של מישהו אחר מחזירה 404 (`INVITATION_NOT_FOUND`). הזמנה שכבר נענתה מחזירה 409 (`INVITATION_ALREADY_ANSWERED`).',
        security: bearer,
        parameters: [pathId('id', 'מזהה ההזמנה', uuidExample.invitation)],
        responses: {
          '200': ok('הצטרפת ללוח', ref('Board'), { ...boardExample, isCreator: false, joinCode: null }),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
          '409': errorRef('Conflict'),
        },
      },
    },
    '/api/invitations/{id}/decline': {
      post: {
        tags: ['Invitations'],
        summary: 'דחיית הזמנה',
        description:
          'רק מי שההזמנה נשלחה לכתובת שלו. ההזמנה עוברת ל־DECLINED, והמשתמש לא מצטרף ללוח. ' +
          'אותן שגיאות כמו באישור.',
        security: bearer,
        parameters: [pathId('id', 'מזהה ההזמנה', uuidExample.invitation)],
        responses: {
          '200': ok('ההזמנה נדחתה', ref('Invitation'), {
            ...invitationExample,
            status: 'DECLINED',
            respondedAt: '2026-10-26T19:00:00.000Z',
          }),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
          '409': errorRef('Conflict'),
        },
      },
    },

    // ---------------- Memories ----------------
    '/api/boards/{id}/memories': {
      parameters: [pathId('id', 'מזהה הלוח', uuidExample.board)],
      get: {
        tags: ['Memories'],
        summary: 'זיכרונות הלוח',
        description: 'חיפוש, סינון ומיון. חברי הלוח ובעל המערכת.',
        security: bearer,
        parameters: [
          query('q', 'חיפוש בכותרת ובתוכן', { type: 'string' }, 'זריחה'),
          query('type', 'סינון לפי סוג זיכרון', { type: 'string', enum: MEMORY_TYPES }),
          query('authorId', 'סינון לפי כותב', { type: 'string', format: 'uuid' }),
          query('mine', 'true = רק הזיכרונות שלי', { type: 'string', enum: ['true', 'false'] }),
          query(
            'sort',
            'newest = החדשים קודם, mostLiked = הכי אהובים, happenedAt = ציר זמן לפי תאריך האירוע',
            { type: 'string', enum: ['newest', 'mostLiked', 'happenedAt'], default: 'newest' },
          ),
          ...pageParams,
        ],
        responses: {
          '200': ok('רשימת הזיכרונות', ref('MemoryPage'), page(memoryExample)),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
        },
      },
      post: {
        tags: ['Memories'],
        summary: 'הוספת זיכרון',
        description:
          'חברי הלוח בלבד. הכותב נקבע לפי ה־Token. בזיכרון מסוג PHOTO חובה `imageId`. אם אותה תמונה (לפי התוכן שלה, לא לפי השם) כבר קיימת בלוח, מתקבל 409.',
        security: bearer,
        requestBody: {
          required: true,
          content: json(ref('CreateMemoryRequest'), {
            title: 'הזריחה במצדה',
            content: 'קמנו בארבע בלילה ועלינו בשביל הנחש...',
            type: 'SUMMARY',
            imageId: uuidExample.image,
            placeUrl: 'https://maps.google.com/?q=Masada',
            happenedAt: '2026-04-15',
          }),
        },
        responses: {
          '201': ok('הזיכרון נוסף', ref('Memory'), memoryExample),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
          '409': errorRef('Conflict'),
        },
      },
    },
    '/api/memories/{id}': {
      parameters: [pathId('id', 'מזהה הזיכרון', uuidExample.memory)],
      get: {
        tags: ['Memories'],
        summary: 'זיכרון אחד',
        description: 'חברי הלוח ובעל המערכת.',
        security: bearer,
        responses: {
          '200': ok('הזיכרון', ref('Memory'), memoryExample),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
        },
      },
      patch: {
        tags: ['Memories'],
        summary: 'עריכת זיכרון',
        description: 'רק מי שכתב את הזיכרון. שולחים רק את השדות שרוצים לשנות.',
        security: bearer,
        requestBody: {
          required: true,
          content: json(ref('UpdateMemoryRequest'), { title: 'הזריחה הכי יפה במצדה' }),
        },
        responses: {
          '200': ok('הזיכרון עודכן', ref('Memory'), memoryExample),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
          '409': errorRef('Conflict'),
        },
      },
      delete: {
        tags: ['Memories'],
        summary: 'מחיקת זיכרון',
        description: 'מי שכתב את הזיכרון, או בעל המערכת.',
        security: bearer,
        responses: {
          '204': noContent,
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
        },
      },
    },
    '/api/memories/{id}/like': {
      parameters: [pathId('id', 'מזהה הזיכרון', uuidExample.memory)],
      post: {
        tags: ['Memories'],
        summary: 'לייק',
        description: 'חברי הלוח. לייק כפול לא נספר פעמיים.',
        security: bearer,
        responses: {
          '200': ok('מצב הלייקים', ref('LikeSummary'), { memoryId: uuidExample.memory, likesCount: 8, likedByMe: true }),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
        },
      },
      delete: {
        tags: ['Memories'],
        summary: 'ביטול לייק',
        description: 'חברי הלוח.',
        security: bearer,
        responses: {
          '200': ok('מצב הלייקים', ref('LikeSummary'), { memoryId: uuidExample.memory, likesCount: 7, likedByMe: false }),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
        },
      },
    },

    // ---------------- Admin ----------------
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'כל המשתמשים',
        description: 'בעל המערכת בלבד.',
        security: bearer,
        parameters: [
          query('q', 'חיפוש לפי שם או מייל', { type: 'string' }),
          query('blocked', 'true = רק חסומים, false = רק פעילים', { type: 'string', enum: ['true', 'false'] }),
          ...pageParams,
        ],
        responses: {
          '200': ok(
            'רשימת המשתמשים',
            ref('AdminUserPage'),
            page({ ...userProfileExample, boardsCreated: 1, boardsJoined: 2, memoriesCount: 5 }),
          ),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
        },
      },
    },
    '/api/admin/users/{id}/block': {
      patch: {
        tags: ['Admin'],
        summary: 'חסימה או שחרור של משתמש',
        description: 'משתמש חסום לא יכול להתחבר, וה־Token שלו מפסיק לעבוד מיד. בעל המערכת בלבד.',
        security: bearer,
        parameters: [pathId('id', 'מזהה המשתמש', uuidExample.user)],
        requestBody: { required: true, content: json(ref('BlockUserRequest'), { isBlocked: true }) },
        responses: {
          '200': ok('המשתמש עודכן', ref('UserProfile'), { ...userProfileExample, isBlocked: true }),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
        },
      },
    },
    '/api/admin/users/{id}': {
      delete: {
        tags: ['Admin'],
        summary: 'מחיקת משתמש',
        description:
          'נמחק כל מה ששייך לו: הלוחות שפתח, הזיכרונות, הלייקים, החברויות והתמונות. בעל המערכת בלבד. אי אפשר למחוק מנהל.',
        security: bearer,
        parameters: [pathId('id', 'מזהה המשתמש', uuidExample.user)],
        responses: {
          '204': noContent,
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
          '404': errorRef('NotFound'),
        },
      },
    },
    '/api/admin/boards': {
      get: {
        tags: ['Admin'],
        summary: 'כל הלוחות באתר',
        description:
          'בעל המערכת בלבד. כדי לראות לוח מסוים משתמשים ב־`GET /api/boards/{id}` וב־`GET /api/boards/{id}/memories`.',
        security: bearer,
        parameters: [
          query('q', 'חיפוש בשם ובתיאור', { type: 'string' }),
          query('eventType', 'סינון לפי סוג אירוע', { type: 'string', enum: EVENT_TYPES }),
          ...pageParams,
        ],
        responses: {
          '200': ok('רשימת הלוחות', ref('BoardPage'), page({ ...boardExample, isCreator: false, joinCode: null })),
          '400': errorRef('BadRequest'),
          '401': errorRef('Unauthorized'),
          '403': errorRef('Forbidden'),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'הדביקי כאן את ה־token מתשובת ההתחברות (בלי המילה Bearer).',
      },
    },
    responses: {
      BadRequest: {
        description: 'הנתונים שנשלחו לא תקינים',
        content: json(ref('Error'), {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'הנתונים שנשלחו לא תקינים',
            details: [{ location: 'body', field: 'email', message: 'כתובת המייל לא תקינה' }],
          },
        }),
      },
      Unauthorized: {
        description: 'אין Token, ה־Token לא תקין, או שפג תוקפו',
        content: json(ref('Error'), {
          error: { code: 'TOKEN_MISSING', message: 'חסר Token. יש להתחבר ולשלוח Authorization: Bearer <token>' },
        }),
      },
      Forbidden: {
        description: 'מחובר, אבל אין הרשאה לפעולה (או שהחשבון חסום)',
        content: json(ref('Error'), { error: { code: 'NOT_A_MEMBER', message: 'אינך חבר בלוח הזה' } }),
      },
      NotFound: {
        description: 'הפריט לא נמצא',
        content: json(ref('Error'), { error: { code: 'BOARD_NOT_FOUND', message: 'הלוח לא נמצא' } }),
      },
      Conflict: {
        description: 'התנגשות: מייל תפוס, כבר חבר בלוח, או תמונה שכבר קיימת בלוח',
        content: json(ref('Error'), { error: { code: 'DUPLICATE_IMAGE', message: 'התמונה הזו כבר קיימת בלוח' } }),
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', description: 'קוד קבוע באנגלית, לשימוש בקוד' },
              message: { type: 'string', description: 'הודעה בעברית להצגה למשתמש' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    location: { type: 'string', enum: ['body', 'query', 'params'] },
                    field: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'error'] },
          database: { type: 'string', enum: ['ok', 'unreachable'] },
          time: { type: 'string', format: 'date-time' },
        },
      },
      Option: {
        type: 'object',
        properties: { value: { type: 'string' }, label: { type: 'string' } },
      },
      Options: {
        type: 'object',
        properties: {
          memoryTypes: { type: 'array', items: ref('Option') },
          eventTypes: { type: 'array', items: ref('Option') },
        },
      },
      UserProfile: {
        type: 'object',
        description: 'פרופיל מלא. מוחזר רק למשתמש עצמו ולבעל המערכת. אף פעם לא כולל סיסמה.',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
          avatarImageId: nullableString({ format: 'uuid' }),
          avatarUrl: nullableString({ description: 'כתובת יחסית, למשל /api/images/<id>' }),
          isBlocked: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PublicUser: {
        type: 'object',
        description: 'מה שחברים אחרים רואים: שם ותמונה בלבד.',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string' },
          avatarUrl: nullableString(),
        },
      },
      AdminUser: {
        allOf: [
          ref('UserProfile'),
          {
            type: 'object',
            properties: {
              boardsCreated: { type: 'integer' },
              boardsJoined: { type: 'integer' },
              memoriesCount: { type: 'integer' },
            },
          },
        ],
      },
      AdminUserPage: pageSchema('AdminUser'),
      AuthResponse: {
        type: 'object',
        properties: { token: { type: 'string', description: 'JWT Access Token' }, user: ref('UserProfile') },
      },
      RegisterRequest: {
        type: 'object',
        required: ['fullName', 'email', 'password'],
        additionalProperties: false,
        properties: {
          fullName: { type: 'string', minLength: 2, maxLength: 60 },
          email: { type: 'string', format: 'email', maxLength: 254 },
          password: { type: 'string', minLength: 8, maxLength: 72 },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        additionalProperties: false,
        properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
      },
      UpdateProfileRequest: {
        type: 'object',
        additionalProperties: false,
        description: 'לפחות שדה אחד',
        properties: {
          fullName: { type: 'string', minLength: 2, maxLength: 60 },
          avatarImageId: nullableString({ format: 'uuid', description: 'id מ־POST /api/images, או null למחיקה' }),
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        additionalProperties: false,
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8, maxLength: 72 },
        },
      },
      ImageUpload: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string', description: 'כתובת יחסית לתמונה' },
          mimeType: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp'] },
          sizeBytes: { type: 'integer' },
          contentHash: { type: 'string', description: 'טביעת אצבע (SHA-256) של תוכן התמונה' },
        },
      },
      Board: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: nullableString(),
          eventType: { type: 'string', enum: EVENT_TYPES },
          eventTypeLabel: { type: 'string' },
          eventDate: { type: 'string', format: 'date' },
          coverImageId: nullableString({ format: 'uuid' }),
          coverImageUrl: nullableString(),
          creator: ref('PublicUser'),
          isCreator: { type: 'boolean', description: 'האם המשתמש המחובר פתח את הלוח' },
          joinCode: nullableString({ description: 'מוחזר רק לפותח הלוח' }),
          membersCount: { type: 'integer' },
          memoriesCount: { type: 'integer' },
          lastActivityAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      BoardPage: pageSchema('Board'),
      CreateBoardRequest: {
        type: 'object',
        required: ['name', 'eventType', 'eventDate'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 80 },
          description: nullableString({ maxLength: 1000 }),
          eventType: { type: 'string', enum: EVENT_TYPES },
          eventDate: { type: 'string', format: 'date', description: 'YYYY-MM-DD' },
          coverImageId: nullableString({ format: 'uuid', description: 'id מ־POST /api/images' }),
          emails: {
            type: 'array',
            maxItems: 20,
            items: { type: 'string', format: 'email', maxLength: 254 },
            description: 'לא חובה. כתובות להזמנה. עד 20, לא תלוי באותיות גדולות/קטנות, כפילויות מוסרות.',
          },
        },
      },
      BoardWithInvitations: {
        allOf: [
          ref('Board'),
          {
            type: 'object',
            properties: {
              invitations: {
                type: 'object',
                description: 'מופיע רק כששלחו emails עם כתובת אחת לפחות',
                properties: {
                  invitedCount: { type: 'integer' },
                  results: { $ref: '#/components/schemas/InvitationsSendResult/properties/results' },
                },
              },
            },
          },
        ],
      },
      UpdateBoardRequest: {
        type: 'object',
        additionalProperties: false,
        description: 'לפחות שדה אחד',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 80 },
          description: nullableString({ maxLength: 1000 }),
          eventType: { type: 'string', enum: EVENT_TYPES },
          eventDate: { type: 'string', format: 'date' },
          coverImageId: nullableString({ format: 'uuid' }),
        },
      },
      JoinBoardRequest: {
        type: 'object',
        required: ['code'],
        additionalProperties: false,
        properties: { code: { type: 'string', minLength: 6, maxLength: 6, description: 'לא תלוי באותיות גדולות/קטנות' } },
      },
      JoinCode: { type: 'object', properties: { joinCode: { type: 'string' } } },
      CreateInvitationsRequest: {
        type: 'object',
        required: ['emails'],
        additionalProperties: false,
        properties: {
          emails: {
            type: 'array',
            minItems: 1,
            maxItems: 20,
            items: { type: 'string', format: 'email', maxLength: 254 },
            description: 'לא תלוי באותיות גדולות/קטנות. כפילויות מוסרות.',
          },
        },
      },
      InvitationsSendResult: {
        type: 'object',
        properties: {
          boardId: { type: 'string', format: 'uuid' },
          invitedCount: { type: 'integer', description: 'כמה הזמנות חדשות נשמרו' },
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email', description: 'הכתובת אחרי נרמול' },
                result: { type: 'string', enum: ['INVITED', 'ALREADY_INVITED', 'ALREADY_MEMBER', 'SELF', 'NOT_ALLOWED'] },
                invitationId: nullableString({ format: 'uuid', description: 'יש ערך רק כשקיימת הזמנה ממתינה' }),
              },
            },
          },
        },
      },
      Invitation: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'DECLINED'] },
          createdAt: { type: 'string', format: 'date-time' },
          respondedAt: nullableString({ format: 'date-time', description: 'מתי אישרו או דחו (null כל עוד ממתינה)' }),
          board: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              eventType: { type: 'string', enum: EVENT_TYPES },
              eventTypeLabel: { type: 'string' },
              eventDate: { type: 'string', format: 'date' },
              coverImageUrl: nullableString(),
            },
          },
          inviter: ref('PublicUser'),
        },
      },
      InvitationPage: pageSchema('Invitation'),
      PendingCount: { type: 'object', properties: { count: { type: 'integer' } } },
      Member: {
        allOf: [
          ref('PublicUser'),
          {
            type: 'object',
            properties: { isCreator: { type: 'boolean' }, joinedAt: { type: 'string', format: 'date-time' } },
          },
        ],
      },
      Memory: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          boardId: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: MEMORY_TYPES },
          typeLabel: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          imageId: nullableString({ format: 'uuid' }),
          imageUrl: nullableString(),
          placeUrl: nullableString(),
          happenedAt: nullableString({ format: 'date' }),
          author: ref('PublicUser'),
          isMine: { type: 'boolean', description: 'האם המשתמש המחובר כתב את הזיכרון (ויכול לערוך)' },
          likesCount: { type: 'integer' },
          likedByMe: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      MemoryPage: pageSchema('Memory'),
      CreateMemoryRequest: {
        type: 'object',
        required: ['title', 'content', 'type'],
        additionalProperties: false,
        properties: {
          title: { type: 'string', minLength: 2, maxLength: 120 },
          content: { type: 'string', minLength: 1, maxLength: 5000 },
          type: { type: 'string', enum: MEMORY_TYPES },
          imageId: nullableString({ format: 'uuid', description: 'חובה כש־type הוא PHOTO' }),
          placeUrl: nullableString({ format: 'uri', description: 'קישור http/https, למשל מפות גוגל' }),
          happenedAt: nullableString({ format: 'date', description: 'YYYY-MM-DD' }),
        },
      },
      UpdateMemoryRequest: {
        type: 'object',
        additionalProperties: false,
        description: 'לפחות שדה אחד',
        properties: {
          title: { type: 'string', minLength: 2, maxLength: 120 },
          content: { type: 'string', minLength: 1, maxLength: 5000 },
          type: { type: 'string', enum: MEMORY_TYPES },
          imageId: nullableString({ format: 'uuid' }),
          placeUrl: nullableString({ format: 'uri' }),
          happenedAt: nullableString({ format: 'date' }),
        },
      },
      LikeSummary: {
        type: 'object',
        properties: {
          memoryId: { type: 'string', format: 'uuid' },
          likesCount: { type: 'integer' },
          likedByMe: { type: 'boolean' },
        },
      },
      BlockUserRequest: {
        type: 'object',
        required: ['isBlocked'],
        additionalProperties: false,
        properties: { isBlocked: { type: 'boolean' } },
      },
    },
  },
};
