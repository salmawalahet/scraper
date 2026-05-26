import http from 'http';
import app from './app';
import { env } from './config/environment';
import { socketService } from './config/socket';
import { createScrapeWorker } from './workers/scrape.worker';
import { createExportWorker } from './workers/export.worker';
import { logger } from './utils/logger';

const server = http.createServer(app);

// Initialize Socket.IO
socketService.initialize(server);

// Start workers
const scrapeWorker = createScrapeWorker();
const exportWorker = createExportWorker();

logger.info('BullMQ workers started');

// Start server
server.listen(env.PORT, () => {
  logger.info(`🚀 LeadX Pro AI server running on port ${env.PORT}`);
  logger.info(`📡 Environment: ${env.NODE_ENV}`);
  logger.info(`🔌 Socket.IO: enabled`);
  logger.info(`⚙️  Workers: scrape + export active`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await scrapeWorker.close();
      await exportWorker.close();
      logger.info('Workers closed');
    } catch (error) {
      logger.error('Error closing workers', { error });
    }

    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

export default server;
