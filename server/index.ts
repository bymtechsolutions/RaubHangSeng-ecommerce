import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_COLLECTIONS, normalizeCollectionDisplays } from '../src/data/collections';
import { PRODUCTS } from '../src/data/products';
import type { OrderRecord, Product, ProductMedia, StoreDiscount, StoreSettings, StoreState, User } from '../src/types';

interface MemberRecord {
  passwordHash: string;
  salt: string;
  profile: User;
}

type PasscodeRecord = Pick<MemberRecord, 'passwordHash' | 'salt'>;

interface PersistedStore extends StoreState {
  members: Record<string, MemberRecord>;
  sellerPasscode?: PasscodeRecord;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataFile = process.env.RHS_DATA_FILE || path.join(__dirname, 'data', 'store.json');
const uploadDir = process.env.RHS_UPLOAD_DIR || path.join(path.dirname(dataFile), 'uploads');
const storefrontUploadDir = path.join(uploadDir, 'storefront');
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production');

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

const publicStore = (store: PersistedStore): StoreState => ({
  products: store.products,
  draftProducts: store.draftProducts,
  orders: store.orders,
  settings: store.settings,
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

const readStore = async (): Promise<PersistedStore> => {
  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    return ensureStoreShape(JSON.parse(raw));
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.error('Failed to read store data, falling back to defaults:', error);
    }

    const defaults = createDefaultStore();
    await writeStore(defaults);
    return defaults;
  }
};

const writeStore = async (store: PersistedStore) => {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  const tempFile = `${dataFile}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(store, null, 2), 'utf8');
  await fs.rename(tempFile, dataFile);
};

const updateStore = async (updater: (store: PersistedStore) => PersistedStore | Promise<PersistedStore>) => {
  const currentStore = await readStore();
  const nextStore = ensureStoreShape(await updater(currentStore));
  await writeStore(nextStore);
  return nextStore;
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

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(uploadDir));

app.post('/api/media', async (req, res, next) => {
  try {
    const media = req.body?.media as { name?: string; type?: string; size?: number; dataUrl?: string } | undefined;
    const mimeType = String(media?.type || '').toLowerCase();
    const uploadType = allowedUploadTypes[mimeType];
    const dataUrl = String(media?.dataUrl || '');
    const dataMatch = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

    if (!media?.name || !uploadType || !dataMatch || dataMatch[1].toLowerCase() !== mimeType) {
      res.status(400).json({ error: 'supported image or video media is required' });
      return;
    }

    const fileBuffer = Buffer.from(dataMatch[2], 'base64');
    if (fileBuffer.length === 0 || fileBuffer.length > uploadType.maxBytes) {
      res.status(400).json({ error: `media exceeds ${Math.round(uploadType.maxBytes / 1024 / 1024)}MB upload limit` });
      return;
    }

    await fs.mkdir(storefrontUploadDir, { recursive: true });
    const safeBaseName = sanitizeFileBaseName(media.name);
    const fileName = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}-${safeBaseName}.${uploadType.extension}`;
    const filePath = path.join(storefrontUploadDir, fileName);
    await fs.writeFile(filePath, fileBuffer);

    const savedMedia: ProductMedia = {
      id: `media-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      url: `/uploads/storefront/${fileName}`,
      type: uploadType.type,
      name: media.name,
      size: fileBuffer.length,
      mimeType,
      uploadedAt: new Date().toISOString(),
    };

    res.status(201).json({ media: savedMedia });
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/store', async (_req, res, next) => {
  try {
    res.json(publicStore(await readStore()));
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

app.put('/api/products', async (req, res, next) => {
  try {
    const products = req.body?.products as Product[];
    const draft = Boolean(req.body?.draft);
    if (!Array.isArray(products)) {
      res.status(400).json({ error: 'products must be an array' });
      return;
    }

    const invalidProduct = products.find(product => (
      (product.options?.length || 0) > 3 || (product.variants?.length || 0) > 2048
    ));
    if (invalidProduct) {
      res.status(400).json({ error: `product ${invalidProduct.id || 'unknown'} exceeds option or variant limits` });
      return;
    }

    const store = await updateStore(current => ({
      ...current,
      ...(draft
        ? { draftProducts: products }
        : { products, draftProducts: undefined }),
    }));
    res.json({ products: store.products, draftProducts: store.draftProducts });
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders', async (_req, res, next) => {
  try {
    const store = await readStore();
    res.json({ orders: store.orders });
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders', async (req, res, next) => {
  try {
    const order = req.body?.order as OrderRecord;
    if (!order?.id || !Array.isArray(order.items) || !order.details) {
      res.status(400).json({ error: 'order requires id, items, and details' });
      return;
    }

    const store = await updateStore(current => {
      const existingIndex = current.orders.findIndex(item => item.id === order.id);
      const orders = [...current.orders];
      const members = { ...current.members };
      if (existingIndex >= 0) {
        orders[existingIndex] = order;
      } else {
        orders.unshift(order);
        const memberKey = order.userId?.toLowerCase();
        if (memberKey && members[memberKey]) {
          members[memberKey] = {
            ...members[memberKey],
            profile: {
              ...members[memberKey].profile,
              memberPoints: members[memberKey].profile.memberPoints + Math.round(order.total),
            },
          };
        }
      }

      return {
        ...current,
        orders,
        members,
      };
    });

    res.status(201).json({ order, orders: store.orders });
  } catch (error) {
    next(error);
  }
});

app.put('/api/orders', async (req, res, next) => {
  try {
    const orders = req.body?.orders as OrderRecord[];
    if (!Array.isArray(orders)) {
      res.status(400).json({ error: 'orders must be an array' });
      return;
    }

    const store = await updateStore(current => ({
      ...current,
      orders,
    }));
    res.json({ orders: store.orders });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/settings', async (req, res, next) => {
  try {
    const settings = req.body?.settings as Partial<StoreSettings>;
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'settings patch is required' });
      return;
    }

    const settingsPatch: Partial<StoreSettings> = {
      ...settings,
      ...(settings.discounts !== undefined ? { discounts: normalizeDiscounts(settings.discounts) } : {}),
    };

    const store = await updateStore(current => ({
      ...current,
      settings: {
        ...current.settings,
        ...settingsPatch,
      },
    }));
    res.json({ settings: store.settings });
  } catch (error) {
    next(error);
  }
});

app.post('/api/seller/verify-passcode', async (req, res, next) => {
  try {
    const passcode = String(req.body?.passcode || '');
    const store = await readStore();
    if (!verifySellerPasscodeValue(passcode, store)) {
      res.status(401).json({ ok: false });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/seller/passcode', async (req, res, next) => {
  try {
    const currentPasscode = String(req.body?.currentPasscode || '');
    const nextPasscode = String(req.body?.nextPasscode || '').trim();
    const store = await readStore();

    if (!verifySellerPasscodeValue(currentPasscode, store)) {
      res.status(401).json({ error: 'current passcode is invalid' });
      return;
    }

    if (nextPasscode.length < 4) {
      res.status(400).json({ error: 'new passcode must be at least 4 characters' });
      return;
    }

    await updateStore(current => ({
      ...current,
      sellerPasscode: hashPassword(nextPasscode),
    }));

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/members/register', async (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const profile = req.body?.profile as User | undefined;
    const key = username.toLowerCase();

    if (!username || !password || !profile?.fullName || !profile?.phoneNumber) {
      res.status(400).json({ error: 'username, password, fullName, and phoneNumber are required' });
      return;
    }

    const existingStore = await readStore();
    if (existingStore.members[key]) {
      res.status(409).json({ error: 'username already exists' });
      return;
    }

    const store = await updateStore(current => {
      const { passwordHash, salt } = hashPassword(password);
      return {
        ...current,
        members: {
          ...current.members,
          [key]: {
            passwordHash,
            salt,
            profile: {
              ...profile,
              username,
            },
          },
        },
      };
    });

    res.status(201).json({ profile: store.members[key].profile });
  } catch (error) {
    next(error);
  }
});

app.post('/api/members/login', async (req, res, next) => {
  try {
    const key = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const store = await readStore();
    const member = store.members[key];

    if (!member || !verifyPassword(password, member)) {
      res.status(401).json({ error: 'invalid username or password' });
      return;
    }

    res.json({ profile: member.profile });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/members/:username', async (req, res, next) => {
  try {
    const key = String(req.params.username || '').trim().toLowerCase();
    const profile = req.body?.profile as User | undefined;

    if (!key || !profile) {
      res.status(400).json({ error: 'profile is required' });
      return;
    }

    const store = await updateStore(current => {
      const member = current.members[key];
      if (!member) return current;

      return {
        ...current,
        members: {
          ...current.members,
          [key]: {
            ...member,
            profile: {
              ...member.profile,
              ...profile,
              username: member.profile.username,
              memberPoints: member.profile.memberPoints,
            },
          },
        },
      };
    });

    if (!store.members[key]) {
      res.status(404).json({ error: 'member not found' });
      return;
    }

    res.json({ profile: store.members[key].profile });
  } catch (error) {
    next(error);
  }
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
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Raub Hang Seng app running at http://localhost:${port}`);
});
