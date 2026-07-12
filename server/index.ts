import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_COLLECTIONS, normalizeCollectionDisplays } from '../src/data/collections';
import { PRODUCTS } from '../src/data/products';
import { calculateDiscounts } from '../src/lib/discounts';
import { getVariantPricePerKg } from '../src/lib/productOptions';
import type { CartItem, DeliveryDetails, OrderRecord, PaymentSlip, Product, ProductMedia, StoreDiscount, StoreSettings, StoreState, User } from '../src/types';

interface MemberRecord {
  passwordHash: string;
  salt: string;
  profile: User;
}

type PasscodeRecord = Pick<MemberRecord, 'passwordHash' | 'salt'> & { policyVersion?: number };

interface PersistedStore extends StoreState {
  members: Record<string, MemberRecord>;
  sellerPasscode?: PasscodeRecord;
}

interface SessionPayload {
  sub: string;
  role: 'member' | 'seller';
  version: string;
  expiresAt: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataFile = process.env.RHS_DATA_FILE || path.join(__dirname, 'data', 'store.json');
const uploadDir = process.env.RHS_UPLOAD_DIR || path.join(path.dirname(dataFile), 'uploads');
const storefrontUploadDir = path.join(uploadDir, 'storefront');
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production');
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? '' : 'rhs-development-session-secret-change-me');
const memberCookieName = 'rhs_member_session';
const sellerCookieName = 'rhs_seller_session';
const memberSessionSeconds = 60 * 60 * 24 * 7;
const sellerSessionSeconds = 60 * 60 * 8;
const maxPaymentSlipBytes = 2 * 1024 * 1024;
const paymentSlipDir = path.join(uploadDir, 'payment-slips');

const maxImageUploadBytes = 2 * 1024 * 1024;
const maxVideoUploadBytes = 10 * 1024 * 1024;
const allowedUploadTypes: Record<string, { extension: string; type: ProductMedia['type']; maxBytes: number }> = {
  'image/jpeg': { extension: 'jpg', type: 'image', maxBytes: maxImageUploadBytes },
  'image/png': { extension: 'png', type: 'image', maxBytes: maxImageUploadBytes },
  'image/webp': { extension: 'webp', type: 'image', maxBytes: maxImageUploadBytes },
  'image/gif': { extension: 'gif', type: 'image', maxBytes: maxImageUploadBytes },
  'video/mp4': { extension: 'mp4', type: 'video', maxBytes: maxVideoUploadBytes },
  'video/webm': { extension: 'webm', type: 'video', maxBytes: maxVideoUploadBytes },
  'video/quicktime': { extension: 'mov', type: 'video', maxBytes: maxVideoUploadBytes },
};
const allowedProductMediaAspectRatios = new Set(['square', 'portrait', 'landscape', 'wide', 'original']);

const defaultSettings: StoreSettings = {
  maintenanceMode: false,
  freeShippingThreshold: 250,
  localShippingRate: 20,
  outstationShippingRate: 30,
  storeAnnouncement: '【恒升河鱼公告】彭亨河主流特马鲁网箱及野生巴丁/苏丹鱼每日捕捞，西马冷链送达，消费满 RM250 免运费！',
  bankName: '',
  bankAccountHolder: '',
  bankAccountNumber: '',
  bankTransferInstructions: 'Transfer the exact total amount, then upload your payment slip before submitting the order.',
  collections: DEFAULT_COLLECTIONS,
  mediaLibrary: [],
  discounts: [],
};

const normalizeStoredMediaUrl = (url: unknown) => {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(value)) return value;
  if (value.startsWith('/')) return value;
  if (value.startsWith('uploads/')) return `/${value}`;
  if (value.startsWith('storefront/')) return `/uploads/${value}`;
  if (/^[^/?#]+\.(jpe?g|png|webp|gif|mp4|webm|mov)$/i.test(value)) return `/uploads/storefront/${encodeURIComponent(value)}`;
  return value;
};

const normalizeMediaLibrary = (mediaLibrary: unknown): ProductMedia[] => {
  if (!Array.isArray(mediaLibrary)) return [];

  return mediaLibrary
    .filter(media => media?.id && media?.url && (media?.type === 'image' || media?.type === 'video'))
    .map(media => ({
      id: String(media.id),
      url: normalizeStoredMediaUrl(media.url),
      type: media.type,
      name: media.name ? String(media.name) : undefined,
      size: Number.isFinite(Number(media.size)) ? Number(media.size) : undefined,
      mimeType: media.mimeType ? String(media.mimeType) : undefined,
      uploadedAt: media.uploadedAt ? String(media.uploadedAt) : undefined,
    }));
};

const normalizeDiscounts = (discounts: unknown): StoreDiscount[] => {
  if (!Array.isArray(discounts)) return [];

  return discounts
    .filter(discount => discount?.id && discount?.titleZh && discount?.titleEn)
    .map(discount => {
      const scope = discount.scope === 'shipping' ? 'shipping' : 'order';
      const valueType = discount.valueType === 'fixed' || discount.valueType === 'free_shipping'
        ? discount.valueType
        : 'percentage';

      return {
        id: String(discount.id),
        titleZh: String(discount.titleZh),
        titleEn: String(discount.titleEn),
        scope,
        valueType: scope === 'order' && valueType === 'free_shipping' ? 'percentage' : valueType,
        value: Math.max(0, Number(discount.value) || 0),
        minSubtotal: Math.max(0, Number(discount.minSubtotal) || 0),
        isActive: Boolean(discount.isActive),
      };
    });
};

const createDefaultStore = (): PersistedStore => ({
  products: PRODUCTS,
  orders: [],
  settings: defaultSettings,
  members: {},
});

const ensureStoreShape = (value: Partial<PersistedStore> | null | undefined): PersistedStore => ({
  products: Array.isArray(value?.products) ? value.products : PRODUCTS,
  draftProducts: Array.isArray(value?.draftProducts) ? value.draftProducts : undefined,
  orders: Array.isArray(value?.orders) ? value.orders : [],
  settings: {
    ...defaultSettings,
    ...(value?.settings || {}),
    collections: normalizeCollectionDisplays(value?.settings?.collections),
    mediaLibrary: normalizeMediaLibrary(value?.settings?.mediaLibrary),
    discounts: normalizeDiscounts(value?.settings?.discounts),
  },
  members: value?.members && typeof value.members === 'object' ? value.members : {},
  sellerPasscode: value?.sellerPasscode?.passwordHash && value?.sellerPasscode?.salt
    ? value.sellerPasscode
    : undefined,
});

const sellerStore = (store: PersistedStore): StoreState => ({
  products: store.products,
  draftProducts: store.draftProducts,
  orders: store.orders.map(withoutPrivateSlipStorage),
  settings: store.settings,
});

const publicStore = (store: PersistedStore) => ({
  products: store.products,
  settings: {
    ...store.settings,
    mediaLibrary: [],
  },
});

const hashPassword = (password: string, salt = crypto.randomBytes(16).toString('hex')) => ({
  salt,
  passwordHash: crypto.scryptSync(password, salt, 64).toString('hex'),
});

const verifyPassword = (password: string, member: PasscodeRecord) => {
  const candidate = crypto.scryptSync(password, member.salt, 64);
  const stored = Buffer.from(member.passwordHash, 'hex');
  return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
};

const verifySellerPasscodeValue = (passcode: string, store: PersistedStore) => {
  if (store.sellerPasscode) {
    return verifyPassword(passcode, store.sellerPasscode);
  }

  return passcode === (process.env.SELLER_PASSCODE || '8888');
};

const storeBackupFile = `${dataFile}.backup`;

const readStore = async (): Promise<PersistedStore> => {
  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    return ensureStoreShape(JSON.parse(raw));
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      const defaults = createDefaultStore();
      await writeStore(defaults, false);
      return defaults;
    }

    try {
      const backupRaw = await fs.readFile(storeBackupFile, 'utf8');
      const recoveredStore = ensureStoreShape(JSON.parse(backupRaw));
      await fs.copyFile(storeBackupFile, dataFile);
      console.error('Recovered store data from the last known-good backup:', error);
      return recoveredStore;
    } catch {
      throw error;
    }
  }
};

const writeStore = async (store: PersistedStore, createBackup = true) => {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  const tempFile = `${dataFile}.${process.pid}.${crypto.randomBytes(5).toString('hex')}.tmp`;
  try {
    await fs.writeFile(tempFile, JSON.stringify(store, null, 2), 'utf8');
    if (createBackup) {
      await fs.copyFile(dataFile, storeBackupFile).catch((error: any) => {
        if (error?.code !== 'ENOENT') throw error;
      });
    }
    await fs.rename(tempFile, dataFile);
  } finally {
    await fs.rm(tempFile, { force: true }).catch(() => undefined);
  }
};

let storeUpdateQueue: Promise<void> = Promise.resolve();

const updateStore = <T>(updater: (store: PersistedStore) => { store: PersistedStore; result: T } | Promise<{ store: PersistedStore; result: T }>) => {
  const operation = storeUpdateQueue.then(async () => {
    const currentStore = await readStore();
    const update = await updater(currentStore);
    const nextStore = ensureStoreShape(update.store);
    await writeStore(nextStore);
    return { store: nextStore, result: update.result };
  });

  storeUpdateQueue = operation.then(() => undefined, () => undefined);
  return operation;
};

const sanitizeFileBaseName = (fileName: string) => (
  path
    .parse(fileName)
    .name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'storefront-media'
);

class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const credentialVersion = (value: string) => (
  crypto.createHash('sha256').update(value).digest('hex').slice(0, 24)
);

const sellerCredentialVersion = (store: PersistedStore) => (
  credentialVersion(store.sellerPasscode?.passwordHash || String(process.env.SELLER_PASSCODE || ''))
);

const signSession = (payload: SessionPayload) => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
};

const verifySession = (value: string | undefined): SessionPayload | null => {
  if (!value) return null;
  const [encodedPayload, suppliedSignature] = value.split('.');
  if (!encodedPayload || !suppliedSignature) return null;

  const expectedSignature = crypto.createHmac('sha256', sessionSecret).update(encodedPayload).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(suppliedSignature, 'base64url');
  } catch {
    return null;
  }
  if (supplied.length !== expectedSignature.length || !crypto.timingSafeEqual(supplied, expectedSignature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.sub || !payload.role || !payload.version || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

const readCookies = (req: express.Request) => {
  const cookies: Record<string, string> = {};
  String(req.headers.cookie || '').split(';').forEach(part => {
    const separator = part.indexOf('=');
    if (separator <= 0) return;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  });
  return cookies;
};

const sessionCookie = (name: string, value: string, maxAgeSeconds: number) => (
  `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${isProduction ? '; Secure' : ''}`
);

const clearSessionCookie = (name: string) => (
  `${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${isProduction ? '; Secure' : ''}`
);

const issueMemberSession = (res: express.Response, key: string, member: MemberRecord) => {
  const value = signSession({
    sub: key,
    role: 'member',
    version: credentialVersion(member.passwordHash),
    expiresAt: Date.now() + memberSessionSeconds * 1000,
  });
  res.append('Set-Cookie', sessionCookie(memberCookieName, value, memberSessionSeconds));
};

const issueSellerSession = (res: express.Response, store: PersistedStore) => {
  const value = signSession({
    sub: 'seller',
    role: 'seller',
    version: sellerCredentialVersion(store),
    expiresAt: Date.now() + sellerSessionSeconds * 1000,
  });
  res.append('Set-Cookie', sessionCookie(sellerCookieName, value, sellerSessionSeconds));
};

const getMemberSession = (req: express.Request, store: PersistedStore) => {
  const session = verifySession(readCookies(req)[memberCookieName]);
  if (!session || session.role !== 'member') return null;
  const member = store.members[session.sub];
  if (!member || session.version !== credentialVersion(member.passwordHash)) return null;
  return { key: session.sub, member };
};

const hasSellerSession = (req: express.Request, store: PersistedStore) => {
  const session = verifySession(readCookies(req)[sellerCookieName]);
  return Boolean(
    session &&
    session.role === 'seller' &&
    session.version === sellerCredentialVersion(store)
  );
};

const requireMember: express.RequestHandler = async (req, res, next) => {
  try {
    const store = await readStore();
    const session = getMemberSession(req, store);
    if (!session) throw new HttpError(401, 'AUTH_REQUIRED', 'Member login required');
    res.locals.memberKey = session.key;
    res.locals.member = session.member;
    next();
  } catch (error) {
    next(error);
  }
};

const requireSeller: express.RequestHandler = async (req, res, next) => {
  try {
    const store = await readStore();
    if (!hasSellerSession(req, store)) throw new HttpError(401, 'SELLER_AUTH_REQUIRED', 'Seller authentication required');
    next();
  } catch (error) {
    next(error);
  }
};

const rateLimit = (limit: number, windowMs: number): express.RequestHandler => {
  const requests = new Map<string, { count: number; resetAt: number }>();
  return (req, res, next) => {
    const now = Date.now();
    if (requests.size > 5000) {
      requests.forEach((entry, key) => {
        if (entry.resetAt <= now) requests.delete(key);
      });
    }
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const current = requests.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;
    entry.count += 1;
    requests.set(key, entry);

    if (entry.count > limit) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      res.status(429).json({ error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' });
      return;
    }
    next();
  };
};

const cleanText = (value: unknown, maxLength: number) => String(value || '').trim().slice(0, maxLength);
const validEmail = (value: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const allowedCutTypes = new Set(['whole', 'cleaned', 'sliced', 'steak', 'fillet']);

const sanitizeProfile = (profile: Partial<User>, username: string, memberPoints = 0): User => {
  const fullName = cleanText(profile.fullName, 100);
  const phoneNumber = cleanText(profile.phoneNumber, 30);
  const email = cleanText(profile.email, 254);
  if (!fullName || !phoneNumber) throw new HttpError(400, 'INVALID_PROFILE', 'Full name and phone number are required');
  if (!validEmail(email)) throw new HttpError(400, 'INVALID_EMAIL', 'Enter a valid email address');

  return {
    username,
    fullName,
    phoneNumber,
    address: cleanText(profile.address, 200),
    city: cleanText(profile.city, 80),
    state: cleanText(profile.state, 80),
    postcode: cleanText(profile.postcode, 12),
    email,
    memberPoints,
  };
};

const sanitizeDeliveryDetails = (details: Partial<DeliveryDetails> | undefined): DeliveryDetails => {
  const sanitized: DeliveryDetails = {
    fullName: cleanText(details?.fullName, 100),
    phoneNumber: cleanText(details?.phoneNumber, 30),
    email: cleanText(details?.email, 254) || undefined,
    address: cleanText(details?.address, 200),
    city: cleanText(details?.city, 80),
    state: cleanText(details?.state, 80),
    postcode: cleanText(details?.postcode, 12),
    deliveryDate: cleanText(details?.deliveryDate, 20),
    notes: cleanText(details?.notes, 500),
  };

  if (!sanitized.fullName || !sanitized.phoneNumber || !sanitized.address || !sanitized.city || !/^\d{5}$/.test(sanitized.postcode)) {
    throw new HttpError(400, 'INVALID_DELIVERY_DETAILS', 'Complete delivery details are required');
  }
  if (!validEmail(sanitized.email || '')) throw new HttpError(400, 'INVALID_EMAIL', 'Enter a valid email address');
  return sanitized;
};

const sanitizeSnapshotUrl = (value: string) => (/^data:/i.test(value) ? '' : value);

const productSnapshot = (product: Product): Product => ({
  ...product,
  image: sanitizeSnapshotUrl(product.image),
  media: undefined,
  variants: product.variants?.map(variant => ({ ...variant, image: sanitizeSnapshotUrl(variant.image) })),
  descriptionZh: '',
  descriptionEn: '',
  tastingNotesZh: '',
  tastingNotesEn: '',
  cookingSuggestionsZh: [],
  cookingSuggestionsEn: [],
  featuresZh: [],
  featuresEn: [],
});

const sanitizeOrderItems = (items: CartItem[] | undefined, products: Product[]) => {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw new HttpError(400, 'INVALID_ORDER_ITEMS', 'Order requires between 1 and 50 items');
  }

  let subtotal = 0;
  const sanitizedItems = items.map(item => {
    const product = products.find(candidate => candidate.id === item?.product?.id);
    const quantity = Number(item?.quantity);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new HttpError(400, 'INVALID_ORDER_ITEM', 'An order item is invalid');
    }

    const variant = item.variantId ? product.variants?.find(candidate => candidate.id === item.variantId) : undefined;
    if (item.variantId && (!variant || variant.isAvailable === false)) {
      throw new HttpError(409, 'VARIANT_UNAVAILABLE', 'A selected product variant is unavailable');
    }

    const selectedWeightKg = variant?.weightKg ?? Number(item.selectedWeightKg);
    const cutType = variant?.cutType ?? item.cutType;
    if (!Number.isFinite(selectedWeightKg) || selectedWeightKg <= 0 || selectedWeightKg > 100 || !allowedCutTypes.has(cutType)) {
      throw new HttpError(400, 'INVALID_ORDER_ITEM', 'An order item selection is invalid');
    }
    if (!variant) {
      const permittedWeights = [0.8, 1, 1.3, 1.6].map(multiplier => product.averageWeightKg * multiplier);
      if (!permittedWeights.some(weight => Math.abs(weight - selectedWeightKg) < 0.001)) {
        throw new HttpError(400, 'INVALID_ORDER_WEIGHT', 'The selected product weight is unavailable');
      }
    }

    const pricePerKg = getVariantPricePerKg(product, variant?.id);
    subtotal += pricePerKg * selectedWeightKg * quantity;
    return {
      product: productSnapshot(product),
      quantity,
      selectedWeightKg,
      cutType,
      variantId: variant?.id,
    } satisfies CartItem;
  });

  return { items: sanitizedItems, subtotal: Number(subtotal.toFixed(2)) };
};

const savePaymentSlip = async (slip: PaymentSlip | undefined, orderId: string): Promise<PaymentSlip> => {
  const allowedTypes: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  const mimeType = cleanText(slip?.type, 80).toLowerCase();
  const match = String(slip?.dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!slip?.name || !allowedTypes[mimeType] || !match || match[1].toLowerCase() !== mimeType) {
    throw new HttpError(400, 'INVALID_PAYMENT_SLIP', 'A valid payment slip is required');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0 || buffer.length > maxPaymentSlipBytes) {
    throw new HttpError(400, 'INVALID_PAYMENT_SLIP', 'Payment slip must be 2MB or smaller');
  }
  const validSignature = mimeType === 'image/jpeg'
    ? buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    : mimeType === 'image/png'
      ? buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      : mimeType === 'image/webp'
        ? buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
        : buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (!validSignature) throw new HttpError(400, 'INVALID_PAYMENT_SLIP', 'Payment slip content does not match its file type');

  await fs.mkdir(paymentSlipDir, { recursive: true });
  const storageKey = `${orderId}-${crypto.randomBytes(8).toString('hex')}.${allowedTypes[mimeType]}`;
  await fs.writeFile(path.join(paymentSlipDir, storageKey), buffer, { flag: 'wx' });
  return {
    name: cleanText(slip.name, 120),
    type: mimeType,
    size: buffer.length,
    dataUrl: `/api/seller/orders/${encodeURIComponent(orderId)}/payment-slip`,
    uploadedAt: new Date().toISOString(),
    storageKey,
  };
};

const withoutPrivateSlipStorage = (order: OrderRecord): OrderRecord => ({
  ...order,
  payment: order.payment
    ? {
        ...order.payment,
        slip: order.payment.slip ? { ...order.payment.slip, storageKey: undefined } : undefined,
      }
    : undefined,
});

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; object-src 'none'",
    );
  }
  next();
});

app.use(express.json({ limit: '16mb' }));
app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    next();
    return;
  }
  const origin = req.get('origin');
  if (!origin) {
    next();
    return;
  }
  try {
    if (new URL(origin).host !== req.get('host')) throw new Error('Origin mismatch');
    next();
  } catch {
    res.status(403).json({ error: 'Cross-origin request blocked', code: 'INVALID_ORIGIN' });
  }
});
app.use('/uploads/storefront', express.static(storefrontUploadDir, { dotfiles: 'deny', index: false }));

app.post('/api/media', requireSeller, async (req, res, next) => {
  try {
    const media = req.body?.media as { name?: string; type?: string; size?: number; dataUrl?: string } | undefined;
    const mimeType = String(media?.type || '').toLowerCase();
    const uploadType = allowedUploadTypes[mimeType];
    const dataUrl = String(media?.dataUrl || '');
    const dataMatch = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!media?.name || !uploadType || !dataMatch || dataMatch[1].toLowerCase() !== mimeType) {
      throw new HttpError(400, 'INVALID_MEDIA', 'Supported image or video media is required');
    }

    const fileBuffer = Buffer.from(dataMatch[2], 'base64');
    if (fileBuffer.length === 0 || fileBuffer.length > uploadType.maxBytes) {
      throw new HttpError(400, 'MEDIA_TOO_LARGE', `Media exceeds the ${Math.round(uploadType.maxBytes / 1024 / 1024)}MB upload limit`);
    }

    await fs.mkdir(storefrontUploadDir, { recursive: true });
    const safeBaseName = sanitizeFileBaseName(media.name);
    const fileName = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}-${safeBaseName}.${uploadType.extension}`;
    await fs.writeFile(path.join(storefrontUploadDir, fileName), fileBuffer, { flag: 'wx' });

    const savedMedia: ProductMedia = {
      id: `media-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      url: `/uploads/storefront/${fileName}`,
      type: uploadType.type,
      name: cleanText(media.name, 120),
      size: fileBuffer.length,
      mimeType,
      uploadedAt: new Date().toISOString(),
    };
    res.status(201).json({ media: savedMedia });
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/store', async (_req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(publicStore(await readStore()));
  } catch (error) {
    next(error);
  }
});

app.get('/api/session', async (req, res, next) => {
  try {
    const store = await readStore();
    const memberSession = getMemberSession(req, store);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      profile: memberSession?.member.profile || null,
      sellerAuthenticated: hasSellerSession(req, store),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/seller/store', requireSeller, async (_req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(sellerStore(await readStore()));
  } catch (error) {
    next(error);
  }
});

app.get('/api/products', async (_req, res, next) => {
  try {
    const store = await readStore();
    res.json({ products: store.products });
  } catch (error) {
    next(error);
  }
});

app.put('/api/products', requireSeller, async (req, res, next) => {
  try {
    const products = req.body?.products as Product[];
    const draft = Boolean(req.body?.draft);
    if (!Array.isArray(products) || products.length > 1000) {
      throw new HttpError(400, 'INVALID_PRODUCTS', 'Products must be an array with at most 1000 entries');
    }
    const invalidProduct = products.find(product => (
      !product?.id || !product.nameZh || !product.nameEn ||
      (product.mediaAspectRatio !== undefined && !allowedProductMediaAspectRatios.has(product.mediaAspectRatio)) ||
      (product.options?.length || 0) > 3 || (product.variants?.length || 0) > 2048
    ));
    if (invalidProduct) throw new HttpError(400, 'INVALID_PRODUCT', `Product ${invalidProduct.id || 'unknown'} is invalid`);

    const update = await updateStore(current => ({
      store: {
        ...current,
        ...(draft ? { draftProducts: products } : { products, draftProducts: undefined }),
      },
      result: null,
    }));
    res.json({ products: update.store.products, draftProducts: update.store.draftProducts });
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders', requireSeller, async (_req, res, next) => {
  try {
    const store = await readStore();
    res.setHeader('Cache-Control', 'no-store');
    res.json({ orders: store.orders.map(withoutPrivateSlipStorage) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/member/orders', requireMember, async (_req, res, next) => {
  try {
    const store = await readStore();
    const memberKey = String(res.locals.memberKey);
    const orders = store.orders
      .filter(order => order.userId?.toLowerCase() === memberKey)
      .map(withoutPrivateSlipStorage);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders', rateLimit(12, 10 * 60 * 1000), async (req, res, next) => {
  let savedSlip: PaymentSlip | undefined;
  try {
    const submitted = req.body?.order as OrderRecord | undefined;

    const update = await updateStore(async current => {
      if (current.settings.maintenanceMode) throw new HttpError(503, 'ORDERING_PAUSED', 'Ordering is temporarily paused');
      if (!current.settings.bankName || !current.settings.bankAccountHolder || !current.settings.bankAccountNumber) {
        throw new HttpError(503, 'PAYMENT_NOT_CONFIGURED', 'Bank transfer details are not configured');
      }
      const { items, subtotal } = sanitizeOrderItems(submitted?.items, current.products);
      const details = sanitizeDeliveryDetails(submitted?.details);
      const normalizedState = details.state.toLowerCase().replace(/[^a-z]/g, '');
      const shippingRegion = ['pahang', 'selangor', 'kualalumpur', 'kl'].includes(normalizedState) ? 'local' : 'outstation';
      let orderId: string;
      do {
        orderId = `PFR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      } while (current.orders.some(order => order.id === orderId));

      savedSlip = await savePaymentSlip(submitted?.payment?.slip, orderId);
      const baseShippingFee = subtotal >= current.settings.freeShippingThreshold
        ? 0
        : shippingRegion === 'local'
          ? current.settings.localShippingRate
          : current.settings.outstationShippingRate;
      const totals = calculateDiscounts(current.settings.discounts, subtotal, baseShippingFee);
      const memberSession = getMemberSession(req, current);
      const members = { ...current.members };
      let profile: User | null = null;

      if (memberSession) {
        const nextMember = {
          ...memberSession.member,
          profile: {
            ...memberSession.member.profile,
            memberPoints: memberSession.member.profile.memberPoints + Math.round(totals.totalAmount),
          },
        };
        members[memberSession.key] = nextMember;
        profile = nextMember.profile;
      }

      const order: OrderRecord = {
        id: orderId,
        items,
        details,
        total: totals.totalAmount,
        date: new Date().toISOString(),
        status: 'pending',
        userId: memberSession?.member.profile.username,
        shippingRegion,
        subtotal: totals.subtotal,
        baseShippingFee: totals.baseShippingFee,
        shippingFee: totals.shippingFee,
        discountTotal: totals.totalDiscount,
        discounts: totals.applications,
        payment: {
          method: 'bank_transfer',
          status: 'pending_review',
          amount: totals.totalAmount,
          bankName: current.settings.bankName,
          accountHolder: current.settings.bankAccountHolder,
          accountNumber: current.settings.bankAccountNumber,
          reference: cleanText(submitted?.payment?.reference, 100) || undefined,
          slip: savedSlip,
        },
      };

      return {
        store: { ...current, orders: [order, ...current.orders], members },
        result: { order: withoutPrivateSlipStorage(order), profile },
      };
    });

    res.status(201).json(update.result);
  } catch (error) {
    if (savedSlip?.storageKey) {
      await fs.rm(path.join(paymentSlipDir, savedSlip.storageKey), { force: true }).catch(() => undefined);
    }
    next(error);
  }
});

app.put('/api/orders', requireSeller, async (req, res, next) => {
  try {
    const proposedOrders = req.body?.orders as OrderRecord[];
    if (!Array.isArray(proposedOrders)) throw new HttpError(400, 'INVALID_ORDERS', 'Orders must be an array');
    const proposedById = new Map(proposedOrders.map(order => [order.id, order]));
    const allowedStatuses = new Set(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
    const allowedPaymentStatuses = new Set(['pending_review', 'confirmed', 'rejected']);

    const update = await updateStore(current => {
      const orders = current.orders.map(order => {
        const proposed = proposedById.get(order.id);
        if (!proposed) return order;
        const status = allowedStatuses.has(String(proposed.status)) ? proposed.status : order.status;
        const paymentStatus = allowedPaymentStatuses.has(String(proposed.payment?.status))
          ? proposed.payment?.status
          : order.payment?.status;
        return {
          ...order,
          status,
          payment: order.payment
            ? {
                ...order.payment,
                status: paymentStatus || order.payment.status,
                confirmedAt: paymentStatus === 'confirmed' ? cleanText(proposed.payment?.confirmedAt, 40) || new Date().toISOString() : undefined,
                confirmedBy: paymentStatus === 'confirmed' ? cleanText(proposed.payment?.confirmedBy, 80) || 'seller' : undefined,
                rejectedAt: paymentStatus === 'rejected' ? cleanText(proposed.payment?.rejectedAt, 40) || new Date().toISOString() : undefined,
                rejectionReason: paymentStatus === 'rejected' ? cleanText(proposed.payment?.rejectionReason, 300) : undefined,
              }
            : undefined,
        };
      });
      return { store: { ...current, orders }, result: orders.map(withoutPrivateSlipStorage) };
    });
    res.json({ orders: update.result });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/settings', requireSeller, async (req, res, next) => {
  try {
    const settings = req.body?.settings as Partial<StoreSettings>;
    if (!settings || typeof settings !== 'object') throw new HttpError(400, 'INVALID_SETTINGS', 'Settings patch is required');
    const settingsPatch: Partial<StoreSettings> = {
      ...settings,
      ...(settings.discounts !== undefined ? { discounts: normalizeDiscounts(settings.discounts) } : {}),
      ...(settings.collections !== undefined ? { collections: normalizeCollectionDisplays(settings.collections) } : {}),
      ...(settings.mediaLibrary !== undefined ? { mediaLibrary: normalizeMediaLibrary(settings.mediaLibrary) } : {}),
    };
    const update = await updateStore(current => ({
      store: { ...current, settings: { ...current.settings, ...settingsPatch } },
      result: null,
    }));
    res.json({ settings: update.store.settings });
  } catch (error) {
    next(error);
  }
});

app.post('/api/seller/verify-passcode', rateLimit(8, 15 * 60 * 1000), async (req, res, next) => {
  try {
    const passcode = String(req.body?.passcode || '');
    const store = await readStore();
    if (!verifySellerPasscodeValue(passcode, store)) throw new HttpError(401, 'INVALID_SELLER_PASSCODE', 'Invalid seller passcode');
    issueSellerSession(res, store);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/seller/logout', (_req, res) => {
  res.append('Set-Cookie', clearSessionCookie(sellerCookieName));
  res.json({ ok: true });
});

app.patch('/api/seller/passcode', requireSeller, async (req, res, next) => {
  try {
    const currentPasscode = String(req.body?.currentPasscode || '');
    const nextPasscode = String(req.body?.nextPasscode || '').trim();
    const store = await readStore();
    if (!verifySellerPasscodeValue(currentPasscode, store)) throw new HttpError(401, 'INVALID_SELLER_PASSCODE', 'Current passcode is invalid');
    if (nextPasscode.length < 8 || nextPasscode.length > 128) {
      throw new HttpError(400, 'WEAK_SELLER_PASSCODE', 'New passcode must be between 8 and 128 characters');
    }
    const update = await updateStore(current => ({
      store: { ...current, sellerPasscode: { ...hashPassword(nextPasscode), policyVersion: 2 } },
      result: null,
    }));
    issueSellerSession(res, update.store);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/members/register', rateLimit(8, 15 * 60 * 1000), async (req, res, next) => {
  try {
    const username = cleanText(req.body?.username, 32);
    const password = String(req.body?.password || '');
    const key = username.toLowerCase();
    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
      throw new HttpError(400, 'INVALID_USERNAME', 'Username must be 3-32 letters, numbers, dots, dashes, or underscores');
    }
    if (password.length < 8 || password.length > 128) {
      throw new HttpError(400, 'WEAK_PASSWORD', 'Password must be between 8 and 128 characters');
    }

    const update = await updateStore(current => {
      if (current.members[key]) throw new HttpError(409, 'USERNAME_EXISTS', 'Username already exists');
      const passwordRecord = hashPassword(password);
      const member: MemberRecord = {
        ...passwordRecord,
        profile: sanitizeProfile(req.body?.profile || {}, username),
      };
      return {
        store: { ...current, members: { ...current.members, [key]: member } },
        result: member,
      };
    });
    issueMemberSession(res, key, update.result);
    res.status(201).json({ profile: update.result.profile });
  } catch (error) {
    next(error);
  }
});

app.post('/api/members/login', rateLimit(10, 15 * 60 * 1000), async (req, res, next) => {
  try {
    const key = cleanText(req.body?.username, 32).toLowerCase();
    const password = String(req.body?.password || '');
    const store = await readStore();
    const member = store.members[key];
    if (!member || !verifyPassword(password, member)) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    issueMemberSession(res, key, member);
    res.json({ profile: member.profile });
  } catch (error) {
    next(error);
  }
});

app.post('/api/members/logout', (_req, res) => {
  res.append('Set-Cookie', clearSessionCookie(memberCookieName));
  res.json({ ok: true });
});

app.patch('/api/members/:username', requireMember, async (req, res, next) => {
  try {
    const key = cleanText(req.params.username, 32).toLowerCase();
    if (key !== String(res.locals.memberKey)) throw new HttpError(403, 'PROFILE_FORBIDDEN', 'You can only update your own profile');
    const update = await updateStore(current => {
      const member = current.members[key];
      if (!member) throw new HttpError(404, 'MEMBER_NOT_FOUND', 'Member not found');
      const nextMember = {
        ...member,
        profile: sanitizeProfile(req.body?.profile || {}, member.profile.username, member.profile.memberPoints),
      };
      return {
        store: { ...current, members: { ...current.members, [key]: nextMember } },
        result: nextMember.profile,
      };
    });
    res.json({ profile: update.result });
  } catch (error) {
    next(error);
  }
});

app.get('/api/seller/orders/:orderId/payment-slip', requireSeller, async (req, res, next) => {
  try {
    const orderId = cleanText(req.params.orderId, 80);
    const store = await readStore();
    const order = store.orders.find(candidate => candidate.id === orderId);
    const storageKey = order?.payment?.slip?.storageKey;
    if (!storageKey || path.basename(storageKey) !== storageKey) throw new HttpError(404, 'SLIP_NOT_FOUND', 'Payment slip not found');
    const filePath = path.join(paymentSlipDir, storageKey);
    res.setHeader('Cache-Control', 'private, no-store');
    res.type(order?.payment?.slip?.type || 'application/octet-stream');
    res.sendFile(filePath, error => {
      if (error && !res.headersSent) next(new HttpError(404, 'SLIP_NOT_FOUND', 'Payment slip not found'));
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found', code: 'NOT_FOUND' });
});

if (isProduction) {
  app.use(express.static(path.join(rootDir, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(rootDir, 'dist', 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  if (error instanceof SyntaxError) {
    res.status(400).json({ error: 'Invalid JSON request body', code: 'INVALID_JSON' });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
});

if (sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be configured with at least 32 characters');
}

if (isProduction) {
  const fallbackPasscode = String(process.env.SELLER_PASSCODE || '');
  if (fallbackPasscode.length < 8 || fallbackPasscode === '8888') {
    throw new Error('Configure a non-default SELLER_PASSCODE with at least 8 characters before starting production');
  }
  const startupStore = await readStore();
  if (startupStore.sellerPasscode?.policyVersion !== 2) {
    await updateStore(current => ({
      store: { ...current, sellerPasscode: { ...hashPassword(fallbackPasscode), policyVersion: 2 } },
      result: null,
    }));
  }
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Raub Hang Seng app running at http://localhost:${port}`);
});
