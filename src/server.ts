import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Amar Dokan server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  console.log(`🔗 API Base: http://localhost:${env.PORT}/api`);
  console.log(`🩺 Health check: http://localhost:${env.PORT}/api/health`);
});

const handleShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('📦 Database connections closed.');
    } catch (err) {
      console.error('Error during database disconnection:', err);
    } finally {
      process.exit(0);
    }
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default server;
