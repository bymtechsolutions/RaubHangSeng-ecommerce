import { OrderRecord, Product, ProductMedia, StoreSettings, StoreState, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string; code?: string } | null;
    throw new ApiError(response.status, body?.error || response.statusText || `Request failed with ${response.status}`, body?.code);
  }

  return response.json() as Promise<T>;
};

export const fetchStore = () => requestJson<Pick<StoreState, 'products' | 'settings'>>('/api/store');

export const fetchSession = () => requestJson<{ profile: User | null; sellerAuthenticated: boolean }>('/api/session');

export const fetchSellerStore = () => requestJson<StoreState>('/api/seller/store');

export const fetchMemberOrders = () => requestJson<{ orders: OrderRecord[] }>('/api/member/orders');

export const replaceProducts = (products: Product[], options?: { draft?: boolean }) => (
  requestJson<{ products: Product[]; draftProducts?: Product[] }>('/api/products', {
    method: 'PUT',
    body: JSON.stringify({ products, draft: options?.draft }),
  })
);

export const createOrder = (order: OrderRecord) => (
  requestJson<{ order: OrderRecord; profile: User | null }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify({ order }),
  })
);

export const replaceOrders = (orders: OrderRecord[]) => (
  requestJson<{ orders: OrderRecord[] }>('/api/orders', {
    method: 'PUT',
    body: JSON.stringify({ orders }),
  })
);

export const updateSettings = (settings: Partial<StoreSettings>) => (
  requestJson<{ settings: StoreSettings }>('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify({ settings }),
  })
);

export const uploadStorefrontMedia = (media: {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}) => (
  requestJson<{ media: ProductMedia }>('/api/media', {
    method: 'POST',
    body: JSON.stringify({ media }),
  })
);

export const verifySellerPasscode = (passcode: string) => (
  requestJson<{ ok: boolean }>('/api/seller/verify-passcode', {
    method: 'POST',
    body: JSON.stringify({ passcode }),
  })
);

export const logoutSeller = () => (
  requestJson<{ ok: boolean }>('/api/seller/logout', { method: 'POST' })
);

export const updateSellerPasscode = (currentPasscode: string, nextPasscode: string) => (
  requestJson<{ ok: boolean }>('/api/seller/passcode', {
    method: 'PATCH',
    body: JSON.stringify({ currentPasscode, nextPasscode }),
  })
);

export const loginMember = (username: string, password: string) => (
  requestJson<{ profile: User }>('/api/members/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
);

export const logoutMember = () => (
  requestJson<{ ok: boolean }>('/api/members/logout', { method: 'POST' })
);

export const registerMember = (username: string, password: string, profile: User) => (
  requestJson<{ profile: User }>('/api/members/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, profile }),
  })
);

export const updateMemberProfile = (username: string, profile: User) => (
  requestJson<{ profile: User }>(`/api/members/${encodeURIComponent(username)}`, {
    method: 'PATCH',
    body: JSON.stringify({ profile }),
  })
);
