import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

let serverProcess;
let baseUrl;
let dataFile;
let tempDir;
let serverOutput = '';
let legacyPasswordHash;

const reservePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close(error => error ? reject(error) : resolve(address.port));
  });
});

const request = (pathname, options = {}) => fetch(`${baseUrl}${pathname}`, {
  method: options.method || 'GET',
  headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
  body: options.body === undefined ? undefined : JSON.stringify(options.body),
});

before(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'rhsfish-seller-migration-test-'));
  dataFile = path.join(tempDir, 'store.json');
  const salt = crypto.randomBytes(16).toString('hex');
  legacyPasswordHash = crypto.scryptSync('legacy-owner-password', salt, 64).toString('hex');
  await writeFile(dataFile, JSON.stringify({
    products: [],
    orders: [],
    settings: {},
    members: {},
    sellerPasscode: { salt, passwordHash: legacyPasswordHash, policyVersion: 2 },
  }), 'utf8');

  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      RHS_DATA_FILE: dataFile,
      RHS_UPLOAD_DIR: path.join(tempDir, 'uploads'),
      SELLER_PASSWORD: '',
      SELLER_PASSCODE: '',
      SESSION_SECRET: 'migration-test-session-secret-0123456789abcdef',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serverProcess.stdout.on('data', chunk => { serverOutput += chunk; });
  serverProcess.stderr.on('data', chunk => { serverOutput += chunk; });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await request('/api/health');
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Test server did not start:\n${serverOutput}`);
});

after(async () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
    await new Promise(resolve => serverProcess.once('exit', resolve));
  }
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

test('migrates the legacy passcode hash to the admin owner account without resetting it', async () => {
  const legacyLogin = await request('/api/seller/login', {
    method: 'POST',
    body: { username: 'admin', password: 'legacy-owner-password' },
  });
  assert.equal(legacyLogin.status, 200);

  const defaultLogin = await request('/api/seller/login', {
    method: 'POST',
    body: { username: 'admin', password: 'abcd1234' },
  });
  assert.equal(defaultLogin.status, 401);

  const persistedStore = JSON.parse(await readFile(dataFile, 'utf8'));
  assert.equal(persistedStore.sellerAccount.username, 'admin');
  assert.equal(persistedStore.sellerAccount.policyVersion, 3);
  assert.equal(persistedStore.sellerAccount.passwordHash, legacyPasswordHash);
  assert.equal(persistedStore.sellerPasscode.passwordHash, legacyPasswordHash);
  assert.equal(persistedStore.sellerPasscode.policyVersion, 2);
});
