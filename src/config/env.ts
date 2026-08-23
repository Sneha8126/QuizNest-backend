import dotenv from 'dotenv';
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/quiznest'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  aiServiceUrl: required('AI_SERVICE_URL', 'http://127.0.0.1:8000'),
  aiServiceApiKey: process.env.AI_SERVICE_API_KEY || '',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  publicShareBaseUrl: process.env.PUBLIC_SHARE_BASE_URL || 'https://quiznest.app/quiz',
  maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '15', 10),
};
