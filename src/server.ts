import { env } from './config/env';
import { createApp } from './app';
import { prisma } from './db/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Momenta API is running on port ${env.PORT}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger: http://localhost:${env.PORT}/api-docs`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
