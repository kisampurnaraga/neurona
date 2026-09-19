import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

/**
 * Test bootstrap.
 *
 * Points the application at a throwaway SQLite file and provides deterministic
 * secrets so that modules which read environment configuration at import time
 * never pick up the developer's real settings.
 */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neurona-test-'));

process.env.NEURONA_DB_PATH = path.join(tmpDir, 'test.db');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.FOUNDER_ACCESS_KEY = 'test-founder-key';
process.env.WORKER_SECRET = 'test-worker-secret';
