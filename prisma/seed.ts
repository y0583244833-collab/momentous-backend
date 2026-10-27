/**
 * Demo data for development and for checking permissions.
 *
 *   npm run db:seed
 *
 * Development (default): creates an admin, 3 demo users, 3 boards, memories and likes,
 * with known demo passwords (see README).
 *
 * Production (NODE_ENV=production): never uses fixed passwords.
 *   - The admin is created only if SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are set.
 *   - Demo users are created only if SEED_DEMO_DATA=true and SEED_DEMO_PASSWORD is set.
 *
 * Running the seed twice is safe: existing users are kept and demo boards are not duplicated.
 */
import 'dotenv/config';
import { PrismaClient, type EventType, type MemoryType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';

const prisma = new PrismaClient();
const isProd = process.env.NODE_ENV === 'production';
const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);

// ---------- tiny PNG generator (so the demo has real images without extra files) ----------
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
/** A simple landscape picture: a sky gradient over a coloured "ground". */
function makePng(width: number, height: number, sky: [number, number, number], ground: [number, number, number]) {
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    const isGround = y > height * 0.65;
    for (let x = 0; x < width; x++) {
      const shade = 1 - (y / height) * 0.4;
      const [r, g, b] = isGround ? ground : sky.map((v) => Math.round(v * shade));
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function saveImage(uploaderId: string, png: Buffer) {
  const image = await prisma.image.create({
    data: {
      data: new Uint8Array(png),
      mimeType: 'image/png',
      sizeBytes: png.length,
      contentHash: createHash('sha256').update(png).digest('hex'),
      uploaderId,
    },
  });
  return image.id;
}

async function upsertUser(fullName: string, email: string, password: string, role: 'USER' | 'ADMIN') {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`  = ${role} ${email} already exists (password not changed)`);
    return existing;
  }
  const user = await prisma.user.create({
    data: { fullName, email, role, passwordHash: await bcrypt.hash(password, rounds) },
  });
  console.log(`  + ${role} ${email}`);
  return user;
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? (isProd ? undefined : 'admin@momenta.local');
  const password = process.env.SEED_ADMIN_PASSWORD ?? (isProd ? undefined : 'Admin1234!');
  if (!email || !password) {
    console.log('  ! Admin not created: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD');
    return;
  }
  if (password.length < 8) throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters');
  await upsertUser('בעל המערכת', email.toLowerCase(), password, 'ADMIN');
}

interface DemoMemory {
  author: number;
  type: MemoryType;
  title: string;
  content: string;
  happenedAt?: string;
  placeUrl?: string;
  image?: [[number, number, number], [number, number, number]];
  likedBy?: number[];
}

interface DemoBoard {
  creator: number;
  members: number[];
  name: string;
  description: string;
  eventType: EventType;
  eventDate: string;
  cover?: [[number, number, number], [number, number, number]];
  memories: DemoMemory[];
}

async function seedDemo() {
  const wanted = process.env.SEED_DEMO_DATA ? process.env.SEED_DEMO_DATA === 'true' : !isProd;
  if (!wanted) {
    console.log('  - Demo data skipped (set SEED_DEMO_DATA=true to add it)');
    return;
  }
  const password = process.env.SEED_DEMO_PASSWORD ?? (isProd ? undefined : 'Demo1234!');
  if (!password) {
    console.log('  ! Demo data not created: set SEED_DEMO_PASSWORD');
    return;
  }

  const users = [
    await upsertUser('נועה לוי', 'noa@example.com', password, 'USER'),
    await upsertUser('יוסי כהן', 'yossi@example.com', password, 'USER'),
    await upsertUser('דנה מזרחי', 'dana@example.com', password, 'USER'),
  ];

  if ((await prisma.board.count({ where: { creatorId: { in: users.map((u) => u.id) } } })) > 0) {
    console.log('  = Demo boards already exist');
    return;
  }

  const date = (v: string) => new Date(`${v}T00:00:00.000Z`);
  const boards: DemoBoard[] = [
    {
      creator: 0,
      members: [1, 2],
      name: 'טיול שנתי י"ב',
      description: 'שלושה ימים בדרום: מצדה, ים המלח ומכתש רמון',
      eventType: 'TRIP',
      eventDate: '2026-04-14',
      cover: [
        [255, 170, 90],
        [194, 150, 100],
      ],
      memories: [
        {
          author: 0,
          type: 'SUMMARY',
          title: 'הזריחה במצדה',
          content: 'קמנו בארבע בלילה ועלינו בשביל הנחש. כשהגענו למעלה השמש בדיוק עלתה מעל הרי מואב.',
          happenedAt: '2026-04-15',
          likedBy: [1, 2],
        },
        {
          author: 1,
          type: 'PHOTO',
          title: 'כל הקבוצה בתצפית',
          content: 'התמונה הקבוצתית ליד שפת המכתש',
          happenedAt: '2026-04-16',
          image: [
            [120, 170, 230],
            [170, 110, 70],
          ],
          likedBy: [0],
        },
        {
          author: 2,
          type: 'PLACE',
          title: 'המסעדה בחניון הלילה',
          content: 'המקום עם הפלאפל הכי טוב בדרום',
          happenedAt: '2026-04-15',
          placeUrl: 'https://maps.google.com/?q=Mitzpe+Ramon',
        },
        {
          author: 1,
          type: 'JOKE',
          title: 'האוטובוס הלא נכון',
          content: 'מי שעלה לאוטובוס של כיתה אחרת ושם לב רק אחרי חצי שעה יודע על מי מדובר...',
          happenedAt: '2026-04-14',
          likedBy: [0, 2],
        },
        {
          author: 0,
          type: 'QUOTE',
          title: 'המדריך בבוקר',
          content: '"מי שלא מילא מים, לא יוצא לשביל"',
          happenedAt: '2026-04-15',
          likedBy: [1],
        },
      ],
    },
    {
      creator: 1,
      members: [0],
      name: 'סיום קייטנה',
      description: 'מסיבת הסיום של הקייטנה בקיץ',
      eventType: 'CAMP',
      eventDate: '2026-08-10',
      memories: [
        {
          author: 1,
          type: 'SUMMARY',
          title: 'יום הספורט',
          content: 'הקבוצה הכחולה ניצחה בתחרות החבל בפעם הראשונה',
          happenedAt: '2026-08-05',
          likedBy: [0],
        },
        {
          author: 0,
          type: 'PHOTO',
          title: 'השקיעה בחוף',
          content: 'הערב האחרון של הקייטנה',
          happenedAt: '2026-08-09',
          image: [
            [250, 120, 80],
            [230, 210, 160],
          ],
        },
      ],
    },
    {
      creator: 2,
      members: [],
      name: 'שבת משפחתית בצפון',
      description: 'לוח פרטי של דנה. נועה ויוסי לא חברים בו, כך שאפשר לבדוק שאין להם גישה.',
      eventType: 'FAMILY',
      eventDate: '2025-12-05',
      memories: [
        {
          author: 2,
          type: 'SUMMARY',
          title: 'הטיול ליד הנחל',
          content: 'הלכנו לאורך הנחל עד המפל הקטן',
          happenedAt: '2025-12-05',
        },
      ],
    },
  ];

  for (const b of boards) {
    const creator = users[b.creator];
    const coverImageId = b.cover ? await saveImage(creator.id, makePng(160, 90, ...b.cover)) : null;
    const board = await prisma.board.create({
      data: {
        name: b.name,
        description: b.description,
        eventType: b.eventType,
        eventDate: date(b.eventDate),
        coverImageId,
        joinCode: `D${b.creator}${b.eventType.slice(0, 4)}`.slice(0, 6),
        creatorId: creator.id,
        members: { create: [creator.id, ...b.members.map((i) => users[i].id)].map((userId) => ({ userId })) },
      },
    });
    for (const m of b.memories) {
      const author = users[m.author];
      const imageId = m.image ? await saveImage(author.id, makePng(160, 120, ...m.image)) : null;
      await prisma.memory.create({
        data: {
          boardId: board.id,
          authorId: author.id,
          type: m.type,
          title: m.title,
          content: m.content,
          happenedAt: m.happenedAt ? date(m.happenedAt) : null,
          placeUrl: m.placeUrl ?? null,
          imageId,
          likes: { create: (m.likedBy ?? []).map((i) => ({ userId: users[i].id })) },
        },
      });
    }
    console.log(`  + board "${b.name}" (join code ${board.joinCode}, ${b.memories.length} memories)`);
  }
}

async function main() {
  console.log(`Seeding (${isProd ? 'production' : 'development'})...`);
  await seedAdmin();
  await seedDemo();
  console.log('Seed finished.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
