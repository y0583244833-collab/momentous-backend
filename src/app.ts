import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { corsOrigins } from './config/env';
import { openApiDocument } from './docs/openapi';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { adminRouter } from './modules/admin/admin.routes';
import { authRouter } from './modules/auth/auth.routes';
import { boardsRouter } from './modules/boards/boards.routes';
import { imagesRouter } from './modules/images/images.routes';
import { invitationsRouter } from './modules/invitations/invitations.routes';
import { memoriesRouter } from './modules/memories/memories.routes';
import { systemRouter } from './modules/system/system.routes';
import { usersRouter } from './modules/users/users.routes';

export function createApp() {
  const app = express();

  // Render (and most cloud hosts) sit behind a proxy.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // Lets a React app on another domain show images served by this API.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: corsOrigins === '*' ? '*' : corsOrigins,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.get('/', (_req, res) => {
    res.json({ name: 'Momenta API', docs: '/api-docs', health: '/api/health' });
  });

  // API documentation
  app.get('/openapi.json', (_req, res) => res.json(openApiDocument));
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'Momenta API',
      swaggerOptions: { persistAuthorization: true },
    }),
  );

  app.use('/api', systemRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/images', imagesRouter);
  app.use('/api/boards', boardsRouter);
  app.use('/api/invitations', invitationsRouter);
  app.use('/api/memories', memoriesRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
