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
      SELLER_PASSWORD: '',
      SELLER_PASSCODE: '',
      SESSION_SECRET: 'production-test-session-secret-0123456789abcdef',
      APP_RELEASE_ID: 'production-test-release',
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
  const healthResult = await json(await request('/api/health'));
  assert.equal(healthResult.response.status, 200);
  assert.equal(healthResult.body.release, 'production-test-release');
  assert.match(healthResult.response.headers.get('x-request-id'), /^[a-f0-9-]{36}$/);

  const robotsResponse = await request('/robots.txt');
  assert.equal(robotsResponse.status, 200);
  const robots = await robotsResponse.text();
  assert.match(robots, /Disallow: \/seller/);
  assert.match(robots, /Sitemap: https:\/\/rhsfish\.com\/sitemap\.xml/);

  const sitemapResponse = await request('/sitemap.xml');
  assert.equal(sitemapResponse.status, 200);
  const sitemap = await sitemapResponse.text();
  assert.match(sitemap, /<loc>https:\/\/rhsfish\.com\/shop<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/rhsfish\.com\/product\/patin-buah<\/loc>/);

  const publicStoreResult = await json(await request('/api/store'));
  assert.equal(publicStoreResult.response.status, 200);
  assert.equal(publicStoreResult.response.headers.get('cache-control'), 'no-store');
  assert.ok(Array.isArray(publicStoreResult.body.products));
  assert.equal('orders' in publicStoreResult.body, false);
  assert.equal('draftProducts' in publicStoreResult.body, false);

  const missingUpload = await json(await request('/uploads/storefront/not-present.jpg'));
  assert.equal(missingUpload.response.status, 404);
  assert.equal(missingUpload.body.code, 'NOT_FOUND');

  assert.equal((await request('/api/seller/store')).status, 401);
  assert.equal((await request('/api/orders')).status, 401);
  assert.equal((await request('/api/products', { method: 'PUT', body: { products: [] } })).status, 401);

  const invalidOwnerLogin = await request('/api/seller/login', {
    method: 'POST',
    body: { username: 'not-admin', password: 'abcd1234' },
  });
  assert.equal(invalidOwnerLogin.status, 401);

  const invalidPasswordLogin = await request('/api/seller/login', {
    method: 'POST',
    body: { username: 'admin', password: 'wrong-password' },
  });
  assert.equal(invalidPasswordLogin.status, 401);

  const sellerLogin = await request('/api/seller/login', {
    method: 'POST',
    body: { username: 'admin', password: 'abcd1234' },
  });
  assert.equal(sellerLogin.status, 200);
  const sellerLoginBody = await sellerLogin.json();
  assert.equal(sellerLoginBody.username, 'admin');
  assert.equal(sellerLoginBody.passwordChangeRequired, true);
  const initialSellerCookie = cookieFrom(sellerLogin);

  const passwordUpdate = await request('/api/seller/password', {
    method: 'PATCH',
    cookie: initialSellerCookie,
    body: { currentPassword: 'abcd1234', nextPassword: 'owner-test-password' },
  });
  assert.equal(passwordUpdate.status, 200);
  assert.equal((await passwordUpdate.json()).passwordChangeRequired, false);
  const sellerCookie = cookieFrom(passwordUpdate);
  assert.equal((await request('/api/seller/store', { cookie: initialSellerCookie })).status, 401);

  assert.equal((await request('/api/seller/login', {
    method: 'POST',
    body: { username: 'admin', password: 'abcd1234' },
  })).status, 401);
  assert.equal((await request('/api/seller/login', {
    method: 'POST',
    body: { username: 'admin', password: 'owner-test-password' },
  })).status, 200);

  const sellerSession = await json(await request('/api/session', { cookie: sellerCookie }));
  assert.equal(sellerSession.body.sellerAuthenticated, true);
  assert.equal(sellerSession.body.sellerUsername, 'admin');
  assert.equal(sellerSession.body.sellerPasswordChangeRequired, false);

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

  const productsWithMediaRatio = publicStoreResult.body.products.map((product, index) => (
    index === 0 ? { ...product, mediaAspectRatio: 'square' } : product
  ));
  const productRatioUpdate = await json(await request('/api/products', {
    method: 'PUT',
    cookie: sellerCookie,
    body: { products: productsWithMediaRatio },
  }));
  assert.equal(productRatioUpdate.response.status, 200);
  assert.equal(productRatioUpdate.body.products[0].mediaAspectRatio, 'square');

  const invalidProductRatioUpdate = await request('/api/products', {
    method: 'PUT',
    cookie: sellerCookie,
    body: { products: [{ ...productsWithMediaRatio[0], mediaAspectRatio: 'invalid-ratio' }] },
  });
  assert.equal(invalidProductRatioUpdate.status, 400);

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
  const deliveryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const orderPayload = {
    id: 'CLIENT-CONTROLLED-ID',
    userId: 'someone-else',
    total: 0.01,
    shippingRegion: 'outstation',
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
      state: 'Johor',
      postcode: '27600',
      deliveryDate,
      notes: '',
    },
    payment: { method: 'bank_transfer', status: 'confirmed', amount: 0.01, slip: paymentSlip },
  };

  assert.equal((await request('/api/orders', {
    method: 'POST',
    cookie: memberCookie,
    body: { order: orderPayload },
  })).status, 400);

  assert.equal((await request('/api/orders', {
    method: 'POST',
    cookie: memberCookie,
    headers: { 'Idempotency-Key': 'unsupported-postcode-order-key' },
    body: { order: { ...orderPayload, details: { ...orderPayload.details, postcode: '90000' } } },
  })).status, 422);

  const soldOutProducts = productsWithMediaRatio.map((candidate, index) => (
    index === 0 ? { ...candidate, stockStatus: 'out_of_stock' } : candidate
  ));
  assert.equal((await request('/api/products', {
    method: 'PUT',
    cookie: sellerCookie,
    body: { products: soldOutProducts },
  })).status, 200);
  assert.equal((await request('/api/orders', {
    method: 'POST',
    cookie: memberCookie,
    headers: { 'Idempotency-Key': 'sold-out-product-order-key' },
    body: { order: orderPayload },
  })).status, 409);
  assert.equal((await request('/api/products', {
    method: 'PUT',
    cookie: sellerCookie,
    body: { products: productsWithMediaRatio },
  })).status, 200);

  const idempotencyKey = 'production-order-idempotency-key';
  const orderResult = await request('/api/orders', {
    method: 'POST',
    cookie: memberCookie,
    headers: { 'Idempotency-Key': idempotencyKey },
    body: { order: orderPayload },
  });
  assert.equal(orderResult.status, 201);
  const orderBody = await orderResult.json();
  assert.notEqual(orderBody.order.id, 'CLIENT-CONTROLLED-ID');
  assert.equal(orderBody.order.userId, username);
  assert.ok(orderBody.order.total > 0.01);
  assert.equal(orderBody.order.payment.status, 'pending_review');
  assert.equal(orderBody.order.payment.slip.storageKey, undefined);
  assert.equal(orderBody.order.idempotencyKeyHash, undefined);
  assert.equal(orderBody.order.requestFingerprint, undefined);
  assert.equal(orderBody.order.shippingRegion, 'local');
  assert.equal(orderBody.profile.memberPoints, 0);

  const repeatedOrder = await request('/api/orders', {
    method: 'POST',
    cookie: memberCookie,
    headers: { 'Idempotency-Key': idempotencyKey },
    body: { order: orderPayload },
  });
  assert.equal(repeatedOrder.status, 200);
  const repeatedOrderBody = await repeatedOrder.json();
  assert.equal(repeatedOrderBody.order.id, orderBody.order.id);
  assert.equal(repeatedOrderBody.profile.memberPoints, orderBody.profile.memberPoints);

  assert.equal((await request('/api/orders', {
    method: 'POST',
    cookie: memberCookie,
    headers: { 'Idempotency-Key': idempotencyKey },
    body: { order: { ...orderPayload, details: { ...orderPayload.details, notes: 'different request' } } },
  })).status, 409);

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

  const confirmedOrder = {
    ...sellerStoreResult.body.orders[0],
    payment: { ...sellerStoreResult.body.orders[0].payment, status: 'confirmed' },
  };
  assert.equal((await request('/api/orders', {
    method: 'PUT',
    cookie: sellerCookie,
    body: { orders: [confirmedOrder] },
  })).status, 200);
  const confirmedSession = await json(await request('/api/session', { cookie: memberCookie }));
  assert.equal(confirmedSession.body.profile.memberPoints, Math.round(orderBody.order.total));

  assert.equal((await request('/api/orders', {
    method: 'PUT',
    cookie: sellerCookie,
    body: { orders: [confirmedOrder] },
  })).status, 200);
  const repeatedConfirmationSession = await json(await request('/api/session', { cookie: memberCookie }));
  assert.equal(repeatedConfirmationSession.body.profile.memberPoints, Math.round(orderBody.order.total));

  const shippedOrder = {
    ...confirmedOrder,
    status: 'shipped',
    trackingNumber: '  RHS-MY-123456  ',
  };
  const shippedResult = await json(await request('/api/orders', {
    method: 'PUT',
    cookie: sellerCookie,
    body: { orders: [shippedOrder] },
  }));
  assert.equal(shippedResult.response.status, 200);
  assert.equal(shippedResult.body.orders[0].status, 'shipped');
  assert.equal(shippedResult.body.orders[0].trackingNumber, 'RHS-MY-123456');

  const trackedMemberOrders = await json(await request('/api/member/orders', { cookie: memberCookie }));
  assert.equal(trackedMemberOrders.response.status, 200);
  assert.equal(trackedMemberOrders.body.orders[0].trackingNumber, 'RHS-MY-123456');

  assert.equal((await request('/api/members/logout', { method: 'POST', cookie: memberCookie })).status, 200);
  const login = await request('/api/members/login', { method: 'POST', body: { username, password } });
  assert.equal(login.status, 200);
  const loginCookie = cookieFrom(login);
  const session = await json(await request('/api/session', { cookie: loginCookie }));
  assert.equal(session.body.profile.username, username);
});
