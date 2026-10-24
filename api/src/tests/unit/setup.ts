// First import of every unit test: config.ts validates env at import time.
process.env.HAPPY2HELP_QR_SECRET = process.env.HAPPY2HELP_QR_SECRET || "unit-test-secret-0123456789abcdef";
process.env.NODE_ENV = "test";
export {};
