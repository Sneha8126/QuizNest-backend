import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import authRoutes from './routes/authRoutes';
import documentRoutes from './routes/documentRoutes';
import quizRoutes from './routes/quizRoutes';
import attemptRoutes from './routes/attemptRoutes';
import userRoutes from './routes/userRoutes';
import shareRoutes from './routes/shareRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  // Generous but real rate limiting on write-heavy/auth endpoints.
  const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
  app.use('/api', apiLimiter);

  app.get('/health', (_req, res) => res.json({ status: 'ok', env: env.nodeEnv }));
  app.use('/', shareRoutes);

  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/quizzes', quizRoutes);
  app.use('/api/attempts', attemptRoutes);
  app.use('/api/users', userRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
