import mongoose from 'mongoose';

const setupShutdown = () => {
  const gracefulShutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Graceful shutdown initiated...`);

    // Close server
    if (global.server) {
      global.server.close(() => {
        console.log('✅ HTTP server closed');
      });
    }

    // Close database connection
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close()
        .then(() => {
          console.log('✅ MongoDB connection closed');
          process.exit(0);
        })
        .catch((err) => {
          console.error('Error closing MongoDB connection:', err);
          process.exit(1);
        });
    } else {
      process.exit(0);
    }
  };

  // Handle shutdown signals
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Handle uncaught exceptions
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