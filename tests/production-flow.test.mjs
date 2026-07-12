import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

let serverProcess;
let baseUrl;
let tempDir;
let serverOutput = '';

const reservePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close(error => error ? reject(error) : resolve(address.port));
  });
});

const request = async (pathname, options = {}) => {
  const headers = { ...(options.headers || {}) };
  if (options.cookie) headers.Cookie = options.cookie;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(`${baseUrl}${pathname}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
};

const json = async response => {
  const body = await response.json();
  return { response, body };
};

const cookieFrom = response => {
  const value = response.headers.get('set-cookie');
  assert.ok(value, 'response should set an authentication cookie');
  return value.split(';', 1)[0];
};

before(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'rhsfish-production-test-'));
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      RHS_DATA_FILE: path.join(tempDir, 'store.json'),
      RHS_UPLOAD_DIR: path.join(tempDir, 'uploads'),
      SELLER_PASSCODE: 'production-test-passcode',
      SESSION_SECRET: 'production-test-session-secret-0123456789abcdef',
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

test('production auth and order boundaries', async () => {
  const publicStoreResult = await json(await request('/api/store'));
  assert.equal(publicStoreResult.response.status, 200);
  assert.ok(Array.isArray(publicStoreResult.body.products));
  assert.equal('orders' in publicStoreResult.body, false);
  assert.equal('draftProducts' in publicStoreResult.body, false);

  assert.equal((await request('/api/seller/store')).status, 401);
  assert.equal((await request('/api/orders')).status, 401);
  assert.equal((await request('/api/products', { method: 'PUT', body: { products: [] } })).status, 401);

  const sellerLogin = await request('/api/seller/verify-passcode', {
    method: 'POST',
    body: { passcode: 'production-test-passcode' },
  });
  assert.equal(sellerLogin.status, 200);
  const sellerCookie = cookieFrom(sellerLogin);

  const settingsUpdate = await request('/api/settings', {
    method: 'PATCH',
    cookie: sellerCookie,
    body: {
      settings: {
        bankName: 'Test Bank',
        bankAccountHolder: 'Raub Hang Seng',
        bankAccountNumber: '1234567890',
      },
    },
  });
  assert.equal(settingsUpdate.status, 200);

  const username = `member_${Date.now()}`;
  const password = 'correct-horse-battery-staple';
  const registration = await request('/api/members/register', {
    method: 'POST',
    body: {
      username,
      password,
      profile: {
        username,
        fullName: 'Production Test Member',
        phoneNumber: '0180000000',
        address: '1 Test Road',
        city: 'Raub',
        state: 'Pahang',
        postcode: '27600',
        email: 'member@example.com',
        memberPoints: 999999,
      },
    },
  });
  assert.equal(registration.status, 201);
  assert.match(registration.headers.get('set-cookie') || '', /HttpOnly/i);
  assert.match(registration.headers.get('set-cookie') || '', /SameSite=Strict/i);
  assert.match(registration.headers.get('set-cookie') || '', /Secure/i);
  const memberCookie = cookieFrom(registration);
  const registrationBody = await registration.json();
  assert.equal(registrationBody.profile.memberPoints, 0);

  const forbiddenProfileUpdate = await request('/api/members/someone-else', {
    method: 'PATCH',
    cookie: memberCookie,
    body: { profile: { fullName: 'Tampered', phoneNumber: '0100000000' } },
  });
  assert.equal(forbiddenProfileUpdate.status, 403);

  const product = publicStoreResult.body.products[0];
  const variant = product.variants?.find(item => item.isAvailable !== false);
  const paymentSlip = {
    name: 'payment.png',
    type: 'image/png',
    size: 68,
    dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    uploadedAt: new Date().toISOString(),
  };
  const orderResult = await request('/api/orders', {
    method: 'POST',
    cookie: memberCookie,
    body: {
      order: {
        id: 'CLIENT-CONTROLLED-ID',
        userId: 'someone-else',
        total: 0.01,
        shippingRegion: 'local',
        items: [{
          product: { id: product.id },
          quantity: 1,
          selectedWeightKg: variant?.weightKg || product.averageWeightKg,
          cutType: variant?.cutType || 'cleaned',
          variantId: variant?.id,
        }],
        details: {
          fullName: 'Production Test Member',
          phoneNumber: '0180000000',
          email: 'member@example.com',
          address: '1 Test Road',
          city: 'Raub',
          state: 'Pahang',
          postcode: '27600',
          deliveryDate: '2030-01-01',
          notes: '',
        },
        payment: { method: 'bank_transfer', status: 'confirmed', amount: 0.01, slip: paymentSlip },
      },
    },
  });
  assert.equal(orderResult.status, 201);
  const orderBody = await orderResult.json();
  assert.notEqual(orderBody.order.id, 'CLIENT-CONTROLLED-ID');
  assert.equal(orderBody.order.userId, username);
  assert.ok(orderBody.order.total > 0.01);
  assert.equal(orderBody.order.payment.status, 'pending_review');
  assert.equal(orderBody.order.payment.slip.storageKey, undefined);
  assert.ok(orderBody.profile.memberPoints > 0);

  const memberOrders = await json(await request('/api/member/orders', { cookie: memberCookie }));
  assert.equal(memberOrders.response.status, 200);
  assert.equal(memberOrders.body.orders.length, 1);
  assert.equal(memberOrders.body.orders[0].userId, username);

  const memberSlipAttempt = await request(`/api/seller/orders/${encodeURIComponent(orderBody.order.id)}/payment-slip`, { cookie: memberCookie });
  assert.equal(memberSlipAttempt.status, 401);
  const sellerSlip = await request(`/api/seller/orders/${encodeURIComponent(orderBody.order.id)}/payment-slip`, { cookie: sellerCookie });
  assert.equal(sellerSlip.status, 200);
  assert.equal(sellerSlip.headers.get('content-type'), 'image/png');

  const sellerStoreResult = await json(await request('/api/seller/store', { cookie: sellerCookie }));
  assert.equal(sellerStoreResult.response.status, 200);
  assert.equal(sellerStoreResult.body.orders.length, 1);

  assert.equal((await request('/api/members/logout', { method: 'POST', cookie: memberCookie })).status, 200);
  const login = await request('/api/members/login', { method: 'POST', body: { username, password } });
  assert.equal(login.status, 200);
  const loginCookie = cookieFrom(login);
  const session = await json(await request('/api/session', { cookie: loginCookie }));
  assert.equal(session.body.profile.username, username);
});
