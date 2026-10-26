import express, { Express, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import { env } from './config/env';
import apiRouter from './routes/index.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

const app: Express = express();

// Configure CORS
const allowedOrigins = env.CORS_ORIGIN === '*'
  ? '*'
  : env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

const corsOptions: CorsOptions = {
  origin: allowedOrigins === '*' ? true : allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (env.NODE_ENV === 'development') {
  app.use((req: Request, _res: Response, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Root route (Preserves original health and greeting)
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'Amar Dokan E-Commerce API',
    status: 'running',
    version: '1.0.0',
    documentation: '/api',
    health: '/api/health',
  });
});

// Mount modular API routes under /api
app.use('/api', apiRouter);

// Unhandled route fallback (404)
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
