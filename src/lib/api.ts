import { OrderRecord, Product, StoreSettings, StoreState, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const fetchStore = () => requestJson<StoreState>('/api/store');

export const replaceProducts = (products: Product[], options?: { draft?: boolean }) => (
  requestJson<{ products: Product[]; draftProducts?: Product[] }>('/api/products', {
    method: 'PUT',
    body: JSON.stringify({ products, draft: options?.draft }),
  })
);

export const createOrder = (order: OrderRecord) => (
  requestJson<{ order: OrderRecord; orders: OrderRecord[] }>('/api/orders', {
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

export const verifySellerPasscode = (passcode: string) => (
  requestJson<{ ok: boolean }>('/api/seller/verify-passcode', {
    method: 'POST',
    body: JSON.stringify({ passcode }),
  })
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
