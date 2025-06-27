// Jest global teardown to close database connections and prevent worker process hanging
module.exports = async () => {
  try {
    // Import and close database connections
    const { closeDatabase } = require('./lib/database/connection');
    await closeDatabase();
    console.log('✅ Database connections closed successfully');
  } catch (error) {
    // Log but don't throw - teardown errors shouldn't fail tests
    console.warn('Database cleanup warning (non-critical):', error.message);
  }

  // Give a moment for any remaining async operations to complete
  await new Promise((resolve) => setTimeout(resolve, 100));
};
