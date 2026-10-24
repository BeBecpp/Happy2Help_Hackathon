// Must be the FIRST import of every e2e file: erxes-api-shared reads REDIS_* and
// MONGO_URL at module load, and its default Mongo connection exits the process on
// failure. Pointing Redis at the stub port before the SDK loads keeps tests clean.
process.env.NODE_ENV = "test";
process.env.REDIS_HOST = "127.0.0.1";
process.env.REDIS_PORT = process.env.H2H_TEST_REDIS_PORT || "6481";
process.env.HAPPY2HELP_QR_SECRET = process.env.HAPPY2HELP_QR_SECRET || "e2e-qr-secret-not-for-production-0001";
export const TEST_REDIS_PORT = Number(process.env.REDIS_PORT);
