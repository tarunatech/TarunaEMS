import { pool } from '../db/index.js';

const setupShutdown = () => {
  const gracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Graceful shutdown initiated...`);

    if (global.server) {
      global.server.close(() => {
        console.log('HTTP server closed');
      });
    }

    try {
      await pool.end();
      console.log('PostgreSQL connection pool closed');
      process.exit(0);
    } catch (err) {
      console.error('Error closing PostgreSQL connection pool:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
  });
};

export default setupShutdown;
