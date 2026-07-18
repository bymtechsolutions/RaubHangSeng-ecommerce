import React, { lazy, Suspense, useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import Header from './components/Header';
import Hero from './components/Hero';
import ProductDetailModal from './components/ProductDetailModal';
import Cart from './components/Cart';
import CheckoutModal from './components/CheckoutModal';
import HowToBuy from './components/HowToBuy';
import CollectionsShowcase from './components/CollectionsShowcase';
import DeliveryChecker from './components/DeliveryChecker';
import Reviews from './components/Reviews';
import ContactUs from './components/ContactUs';
import Footer from './components/Footer';
import { Product, CartItem, Language, DeliveryDetails, User, OrderRecord, StoreSettings, ProductCategory, CollectionDisplay, ProductMedia, StoreDiscount } from './types';
import { X, CheckCircle, Lock } from 'lucide-react';
import { PRODUCTS } from './data/products';
import { DEFAULT_COLLECTIONS, normalizeCollectionDisplays } from './data/collections';
import type { SellerDashboardTab } from './components/SellerDashboard';
import { createOrder, fetchMemberOrders, fetchSellerStore, fetchSession, fetchStore, loginSeller, logoutMember, logoutSeller, replaceOrders, replaceProducts, updateSellerPassword, updateSettings } from './lib/api';
import { calculateDiscounts } from './lib/discounts';
import { resolveMediaUrl } from './lib/media';
import { getCartItemPricePerKg } from './lib/productOptions';
import { updateDocumentSeo } from './lib/seo';

const SellerDashboard = lazy(() => import('./components/SellerDashboard'));
const Products = lazy(() => import('./components/Products'));
const ProductPage = lazy(() => import('./components/ProductPage'));
const AboutUs = lazy(() => import('./components/AboutUs'));
const BusinessOrder = lazy(() => import('./components/BusinessOrder'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const PolicyView = lazy(() => import('./components/PolicyView'));

const StorefrontRouteFallback = ({ language }: { language: Language }) => (
  <main className="min-h-[65vh] pt-[calc(var(--rhs-topbar-height)+48px)] px-4 rhs-section-alt" role="status" aria-live="polite" aria-busy="true">
    <div className="mx-auto max-w-5xl">
      <p className="text-sm font-semibold text-[#36545e]">
        {language === 'zh' ? '正在载入页面…' : 'Loading page…'}
      </p>
      <div className="mt-6 space-y-4 motion-safe:animate-pulse" aria-hidden="true">
        <div className="h-9 w-2/3 max-w-lg rounded-lg bg-[#c9d9dc]" />
        <div className="h-4 w-full max-w-2xl rounded bg-[#d1dfe1]" />
        <div className="h-72 rounded-2xl bg-[#cfdddf]" />
      </div>
    </div>
  </main>
);

type AppRoute = 'home' | 'shop' | 'product' | 'about' | 'business-order' | 'login' | 'seller' | 'privacy' | 'terms' | 'refund';

const PRODUCT_ROUTE_PREFIX = '/product/';
const SELLER_ROUTE_PREFIX = '/seller';
const SELLER_OWNER_ID = 'admin';
const SELLER_TABS: SellerDashboardTab[] = ['overview', 'orders', 'customers', 'products', 'collections', 'discounts', 'shipping', 'settings'];
const DEFAULT_STORE_ANNOUNCEMENT = '【恒升河鱼公告】彭亨河主流特马鲁网箱及野生巴丁/苏丹鱼每日捕捞，西马冷链送达，消费满 RM250 免运费！';
const DEFAULT_BANK_TRANSFER_INSTRUCTIONS = 'Transfer the exact total amount, then upload your payment slip before submitting the order.';
const getRouteFromPath = (): AppRoute => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/shop') return 'shop';
  if (path === '/about') return 'about';
  if (path === '/business-order') return 'business-order';
  if (path === '/login') return 'login';
  if (path.startsWith(PRODUCT_ROUTE_PREFIX) && path.length > PRODUCT_ROUTE_PREFIX.length) return 'product';
  if (path === SELLER_ROUTE_PREFIX || path.startsWith(`${SELLER_ROUTE_PREFIX}/`)) return 'seller';
  if (path === '/privacy') return 'privacy';
  if (path === '/terms') return 'terms';
  if (path === '/refund') return 'refund';
  return 'home';
};

const getProductIdFromPath = () => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (!path.startsWith(PRODUCT_ROUTE_PREFIX)) return null;

  const productId = path.slice(PRODUCT_ROUTE_PREFIX.length);
  return productId ? decodeURIComponent(productId) : null;
};

const getSellerTabFromPath = (): SellerDashboardTab => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (!path.startsWith(`${SELLER_ROUTE_PREFIX}/`)) return 'overview';

  const tab = decodeURIComponent(path.slice(SELLER_ROUTE_PREFIX.length + 1)).split('/')[0];
  return SELLER_TABS.includes(tab as SellerDashboardTab) ? tab as SellerDashboardTab : 'overview';
};

const routeToPath = (route: AppRoute, productId?: string | null, sellerTab?: SellerDashboardTab | null) => {
  if (route === 'home') return '/';
  if (route === 'product') return productId ? `/product/${encodeURIComponent(productId)}` : '/shop';
  if (route === 'seller') return sellerTab ? `/seller/${sellerTab}` : '/seller';
  return `/${route}`;
};

const routeToActiveSection = (route: AppRoute) => {
  if (route === 'shop' || route === 'product') return 'products';
  if (route === 'about') return 'about';
  if (route === 'business-order') return 'business-order';
  if (route === 'login') return 'login';
  if (route === 'seller') return 'seller';
  if (route === 'privacy' || route === 'terms' || route === 'refund') return 'policy';
  return 'home';
};

const normalizeMediaLibraryUrls = (mediaLibrary: ProductMedia[]) => (
  mediaLibrary.map(media => ({
    ...media,
    url: resolveMediaUrl(media.url),
  }))
);

export default function App() {
  // Main states
  const [route, setRoute] = useState<AppRoute>(() => getRouteFromPath());
  const [activeProductId, setActiveProductId] = useState<string | null>(() => getProductIdFromPath());
  const [sellerTab, setSellerTab] = useState<SellerDashboardTab>(() => getSellerTabFromPath());
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('raub_hang_seng_language');
    return savedLanguage === 'en' || savedLanguage === 'zh' ? savedLanguage : 'zh';
  });
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(() => routeToActiveSection(getRouteFromPath()));
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [shippingState, setShippingState] = useState<'local' | 'outstation'>('local');
  const [shopCategory, setShopCategory] = useState<ProductCategory | 'all'>('all');

  // Member states
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Order history
  const [orderHistory, setOrderHistory] = useState<OrderRecord[]>([]);
  const [latestOrder, setLatestOrder] = useState<string | null>(null);

  // Seller Dashboard / Store Configuration States
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [draftProducts, setDraftProducts] = useState<Product[] | null>(null);
  const [sellerAccessGranted, setSellerAccessGranted] = useState(false);
  const [sellerPasswordChangeRequired, setSellerPasswordChangeRequired] = useState(false);
  const [sellerPasswordInput, setSellerPasswordInput] = useState('');
  const [sellerLoginError, setSellerLoginError] = useState(false);
  const [isSellerLoginPending, setIsSellerLoginPending] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(250);
  const [localShippingRate, setLocalShippingRate] = useState(20);
  const [outstationShippingRate, setOutstationShippingRate] = useState(30);
  const [storeAnnouncement, setStoreAnnouncement] = useState(DEFAULT_STORE_ANNOUNCEMENT);
  const [bankName, setBankName] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankTransferInstructions, setBankTransferInstructions] = useState(DEFAULT_BANK_TRANSFER_INSTRUCTIONS);
  const [collectionDisplays, setCollectionDisplays] = useState<CollectionDisplay[]>(DEFAULT_COLLECTIONS);
  const [mediaLibrary, setMediaLibrary] = useState<ProductMedia[]>([]);
  const [discounts, setDiscounts] = useState<StoreDiscount[]>([]);

  const applyStoreSettings = (settings: StoreSettings) => {
    setIsMaintenanceMode(Boolean(settings.maintenanceMode));
    setFreeShippingThreshold(Number(settings.freeShippingThreshold) || 250);
    setLocalShippingRate(Number(settings.localShippingRate) || 20);
    setOutstationShippingRate(Number(settings.outstationShippingRate) || 30);
    setStoreAnnouncement(settings.storeAnnouncement || DEFAULT_STORE_ANNOUNCEMENT);
    setBankName(settings.bankName || '');
    setBankAccountHolder(settings.bankAccountHolder || '');
    setBankAccountNumber(settings.bankAccountNumber || '');
    setBankTransferInstructions(settings.bankTransferInstructions || DEFAULT_BANK_TRANSFER_INSTRUCTIONS);
    setCollectionDisplays(normalizeCollectionDisplays(settings.collections));
    setMediaLibrary(Array.isArray(settings.mediaLibrary) ? normalizeMediaLibraryUrls(settings.mediaLibrary) : []);
    setDiscounts(Array.isArray(settings.discounts) ? settings.discounts : []);
  };

  const applySellerStore = (store: Awaited<ReturnType<typeof fetchSellerStore>>) => {
    setProducts(store.products);
    setDraftProducts(store.draftProducts || null);
    setOrderHistory(store.orders);
    applyStoreSettings(store.settings);
  };

  const loadSellerStore = async () => {
    const store = await fetchSellerStore();
    applySellerStore(store);
  };

  // Initialize session state locally and shared store data from backend.
  useEffect(() => {
    const savedCart = localStorage.getItem('pahang_river_fish_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart items', e);
      }
    }

    localStorage.removeItem('raub_hang_seng_current_user');
    localStorage.removeItem('pahang_river_fish_orders');
    sessionStorage.removeItem('raub_hang_seng_seller_access');

    const loadLocalStoreFallback = () => {
      const savedProducts = localStorage.getItem('raub_hang_seng_products');
      if (savedProducts) {
        try {
          setProducts(JSON.parse(savedProducts));
        } catch (e) {
          console.error('Failed to parse products', e);
          setProducts(PRODUCTS);
        }
      }

      const savedDraftProducts = localStorage.getItem('raub_hang_seng_products_draft');
      if (savedDraftProducts) {
        try {
          setDraftProducts(JSON.parse(savedDraftProducts));
        } catch (e) {
          console.error('Failed to parse draft products', e);
          setDraftProducts(null);
        }
      }

      let savedCollections: CollectionDisplay[] = DEFAULT_COLLECTIONS;
      let savedMediaLibrary: ProductMedia[] = [];
      let savedDiscounts: StoreDiscount[] = [];
      const savedCollectionsRaw = localStorage.getItem('raub_hang_seng_collections');
      if (savedCollectionsRaw) {
        try {
          savedCollections = normalizeCollectionDisplays(JSON.parse(savedCollectionsRaw));
        } catch (e) {
          console.error('Failed to parse collection displays', e);
        }
      }

      const savedMediaLibraryRaw = localStorage.getItem('raub_hang_seng_media_library');
      if (savedMediaLibraryRaw) {
        try {
          const parsedMediaLibrary = JSON.parse(savedMediaLibraryRaw);
          savedMediaLibrary = Array.isArray(parsedMediaLibrary) ? normalizeMediaLibraryUrls(parsedMediaLibrary) : [];
        } catch (e) {
          console.error('Failed to parse media library', e);
        }
      }

      const savedDiscountsRaw = localStorage.getItem('raub_hang_seng_discounts');
      if (savedDiscountsRaw) {
        try {
          const parsedDiscounts = JSON.parse(savedDiscountsRaw);
          savedDiscounts = Array.isArray(parsedDiscounts) ? parsedDiscounts : [];
        } catch (e) {
          console.error('Failed to parse discounts', e);
        }
      }

      const fallbackSettings: StoreSettings = {
        maintenanceMode: localStorage.getItem('raub_hang_seng_maintenance') === 'true',
        freeShippingThreshold: Number(localStorage.getItem('raub_hang_seng_free_shipping')) || 250,
        localShippingRate: Number(localStorage.getItem('raub_hang_seng_local_rate')) || 20,
        outstationShippingRate: Number(localStorage.getItem('raub_hang_seng_outstation_rate')) || 30,
        storeAnnouncement: localStorage.getItem('raub_hang_seng_announcement') || DEFAULT_STORE_ANNOUNCEMENT,
        bankName: localStorage.getItem('raub_hang_seng_bank_name') || '',
        bankAccountHolder: localStorage.getItem('raub_hang_seng_bank_holder') || '',
        bankAccountNumber: localStorage.getItem('raub_hang_seng_bank_number') || '',
        bankTransferInstructions: localStorage.getItem('raub_hang_seng_bank_instructions') || DEFAULT_BANK_TRANSFER_INSTRUCTIONS,
        collections: savedCollections,
        mediaLibrary: savedMediaLibrary,
        discounts: savedDiscounts,
      };
      applyStoreSettings(fallbackSettings);
    };

    const loadBackendStore = async () => {
      try {
        const [store, session] = await Promise.all([fetchStore(), fetchSession()]);
        setProducts(store.products);
        setDraftProducts(null);
        setOrderHistory([]);
        applyStoreSettings(store.settings);
        setCurrentUser(session.profile);
        setSellerAccessGranted(session.sellerAuthenticated);
        setSellerPasswordChangeRequired(session.sellerPasswordChangeRequired);

        if (session.profile) {
          const memberOrders = await fetchMemberOrders();
          setOrderHistory(memberOrders.orders);
        }
        if (session.sellerAuthenticated && getRouteFromPath() === 'seller') {
          await loadSellerStore();
        }

        localStorage.setItem('raub_hang_seng_products', JSON.stringify(store.products));
        localStorage.removeItem('raub_hang_seng_products_draft');
        localStorage.setItem('raub_hang_seng_maintenance', String(store.settings.maintenanceMode));
        localStorage.setItem('raub_hang_seng_free_shipping', String(store.settings.freeShippingThreshold));
        localStorage.setItem('raub_hang_seng_local_rate', String(store.settings.localShippingRate));
        localStorage.setItem('raub_hang_seng_outstation_rate', String(store.settings.outstationShippingRate));
        localStorage.setItem('raub_hang_seng_announcement', store.settings.storeAnnouncement);
        localStorage.setItem('raub_hang_seng_bank_name', store.settings.bankName || '');
        localStorage.setItem('raub_hang_seng_bank_holder', store.settings.bankAccountHolder || '');
        localStorage.setItem('raub_hang_seng_bank_number', store.settings.bankAccountNumber || '');
        localStorage.setItem('raub_hang_seng_bank_instructions', store.settings.bankTransferInstructions || DEFAULT_BANK_TRANSFER_INSTRUCTIONS);
        localStorage.setItem('raub_hang_seng_collections', JSON.stringify(normalizeCollectionDisplays(store.settings.collections)));
        localStorage.setItem('raub_hang_seng_media_library', JSON.stringify(normalizeMediaLibraryUrls(store.settings.mediaLibrary || [])));
        localStorage.setItem('raub_hang_seng_discounts', JSON.stringify(store.settings.discounts || []));
      } catch (e) {
        console.error('Failed to load backend store, using local fallback', e);
        loadLocalStoreFallback();
      }
    };

    void loadBackendStore();
  }, []);

  useEffect(() => {
    const syncRouteFromBrowser = () => {
      const nextRoute = getRouteFromPath();
      setRoute(nextRoute);
      setActiveProductId(getProductIdFromPath());
      setSellerTab(getSellerTabFromPath());
      setActiveSection(routeToActiveSection(nextRoute));
      setSelectedProduct(null);
      setIsCartOpen(false);
      setIsCheckoutOpen(false);
    };

    window.addEventListener('popstate', syncRouteFromBrowser);
    return () => window.removeEventListener('popstate', syncRouteFromBrowser);
  }, []);

  useEffect(() => {
    updateDocumentSeo({
      route,
      language,
      product: route === 'product'
        ? products.find(product => product.id === activeProductId) || null
        : null,
    });
  }, [route, language, activeProductId, products]);

  useEffect(() => {
    if (isMaintenanceMode) {
      setIsCheckoutOpen(false);
    }
  }, [isMaintenanceMode]);

  useEffect(() => {
    if (sellerAccessGranted && route === 'seller') return;
    if (!currentUser) {
      setOrderHistory([]);
      return;
    }
    void fetchMemberOrders()
      .then(response => setOrderHistory(response.orders))
      .catch(error => console.error('Failed to load member orders', error));
  }, [currentUser?.username, sellerAccessGranted, route]);

  // Save cart to localStorage
  const saveCart = (items: CartItem[]) => {
    setCartItems(items);
    localStorage.setItem('pahang_river_fish_cart', JSON.stringify(items));
  };

  const publishProducts = async (nextProducts: Product[]) => {
    const response = await replaceProducts(nextProducts);
    setProducts(response.products);
    setDraftProducts(response.draftProducts || null);
    localStorage.setItem('raub_hang_seng_products', JSON.stringify(response.products));
    if (response.draftProducts) {
      localStorage.setItem('raub_hang_seng_products_draft', JSON.stringify(response.draftProducts));
    } else {
      localStorage.removeItem('raub_hang_seng_products_draft');
    }
  };

  const persistProducts = async (nextProducts: Product[]) => {
    if (isMaintenanceMode) {
      const response = await replaceProducts(nextProducts, { draft: true });
      const nextDraft = response.draftProducts || nextProducts;
      setDraftProducts(nextDraft);
      localStorage.setItem('raub_hang_seng_products_draft', JSON.stringify(nextDraft));
      return;
    }

    await publishProducts(nextProducts);
  };

  const persistOrders = async (nextOrders: OrderRecord[]) => {
    const response = await replaceOrders(nextOrders);
    setOrderHistory(response.orders);
  };

  const persistSettings = async (settingsPatch: Partial<StoreSettings>) => {
    if (settingsPatch.maintenanceMode === true && !draftProducts) {
      const response = await replaceProducts(products, { draft: true });
      const nextDraft = response.draftProducts || products;
      setDraftProducts(nextDraft);
      localStorage.setItem('raub_hang_seng_products_draft', JSON.stringify(nextDraft));
    }

    if (settingsPatch.maintenanceMode === false && draftProducts) {
      await publishProducts(draftProducts);
      setDraftProducts(null);
      localStorage.removeItem('raub_hang_seng_products_draft');
    }

    try {
      const response = await updateSettings(settingsPatch);
      applyStoreSettings(response.settings);
      localStorage.setItem('raub_hang_seng_maintenance', String(response.settings.maintenanceMode));
      localStorage.setItem('raub_hang_seng_free_shipping', String(response.settings.freeShippingThreshold));
      localStorage.setItem('raub_hang_seng_local_rate', String(response.settings.localShippingRate));
      localStorage.setItem('raub_hang_seng_outstation_rate', String(response.settings.outstationShippingRate));
      localStorage.setItem('raub_hang_seng_announcement', response.settings.storeAnnouncement);
      localStorage.setItem('raub_hang_seng_bank_name', response.settings.bankName || '');
      localStorage.setItem('raub_hang_seng_bank_holder', response.settings.bankAccountHolder || '');
      localStorage.setItem('raub_hang_seng_bank_number', response.settings.bankAccountNumber || '');
      localStorage.setItem('raub_hang_seng_bank_instructions', response.settings.bankTransferInstructions || DEFAULT_BANK_TRANSFER_INSTRUCTIONS);
      localStorage.setItem('raub_hang_seng_collections', JSON.stringify(normalizeCollectionDisplays(response.settings.collections)));
      localStorage.setItem('raub_hang_seng_media_library', JSON.stringify(normalizeMediaLibraryUrls(response.settings.mediaLibrary || [])));
      localStorage.setItem('raub_hang_seng_discounts', JSON.stringify(response.settings.discounts || []));
    } catch (e) {
      console.error('Failed to persist settings to backend', e);
      throw e;
    }
  };

  // Add Item to Cart
  const handleAddToCart = (
    product: Product,
    quantity: number,
    weightKg: number,
    cutType: 'whole' | 'cleaned' | 'sliced' | 'steak' | 'fillet',
    variantId?: string,
  ) => {
    if (isMaintenanceMode || product.stockStatus === 'out_of_stock') return;

    const existingIndex = cartItems.findIndex(
      (item) =>
        item.product.id === product.id &&
        (variantId
          ? item.variantId === variantId
          : !item.variantId && item.selectedWeightKg === weightKg && item.cutType === cutType)
    );

    let updatedCart = [...cartItems];
    if (existingIndex > -1) {
      updatedCart[existingIndex].quantity += quantity;
    } else {
      updatedCart.push({
        product,
        quantity,
        selectedWeightKg: weightKg,
        cutType,
        variantId,
      });
    }

    saveCart(updatedCart);
    setIsCartOpen(true); // Open the drawer so they can see feedback
  };

  // Update Cart Quantity
  const handleUpdateQuantity = (index: number, quantity: number) => {
    let updatedCart = [...cartItems];
    if (quantity <= 0) {
      updatedCart.splice(index, 1);
    } else {
      updatedCart[index].quantity = quantity;
    }
    saveCart(updatedCart);
  };

  // Remove single item
  const handleRemoveItem = (index: number) => {
    let updatedCart = [...cartItems];
    updatedCart.splice(index, 1);
    saveCart(updatedCart);
  };

  // Clear Cart
  const handleClearCart = () => {
    saveCart([]);
  };

  // Order success registration
  const handleOrderSuccess = async (order: OrderRecord, idempotencyKey: string) => {
    if (isMaintenanceMode) throw new Error('Ordering is paused');

    const response = await createOrder(order, idempotencyKey);
    if (response.profile) setCurrentUser(response.profile);
    if (currentUser) {
      setOrderHistory(previous => [response.order, ...previous.filter(existing => existing.id !== response.order.id)]);
    }

    setLatestOrder(response.order.id);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    saveCart([]);
  };

  // Helper calculation
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const subtotal = cartItems.reduce((acc, item) => {
    return acc + getCartItemPricePerKg(item) * item.selectedWeightKg * item.quantity;
  }, 0);

  const isFreeShipping = subtotal >= freeShippingThreshold;
  const baseShippingFee = cartItems.length === 0
    ? 0
    : isFreeShipping
      ? 0
      : shippingState === 'local'
        ? localShippingRate
        : outstationShippingRate;

  const discountTotals = calculateDiscounts(discounts, subtotal, baseShippingFee);
  const shippingFee = discountTotals.shippingFee;
  const totalAmount = discountTotals.totalAmount;

  const navigateToRoute = (nextRoute: AppRoute, options?: { replace?: boolean; scrollTop?: boolean; productId?: string; sellerTab?: SellerDashboardTab }) => {
    const nextPath = routeToPath(nextRoute, options?.productId, options?.sellerTab);
    if (window.location.pathname !== nextPath) {
      if (options?.replace) {
        window.history.replaceState(null, '', nextPath);
      } else {
        window.history.pushState(null, '', nextPath);
      }
    }

    setRoute(nextRoute);
    setActiveProductId(nextRoute === 'product' ? options?.productId ?? null : null);
    setSellerTab(nextRoute === 'seller' ? options?.sellerTab ?? 'overview' : 'overview');
    setActiveSection(routeToActiveSection(nextRoute));
    setSelectedProduct(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);

    if (options?.scrollTop !== false) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToHomeSection = (section: string) => {
    const scroll = () => {
      if (section === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const element = document.getElementById(section);
      if (element) {
        const yOffset = -70;
        const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    };

    if (route !== 'home') {
      window.history.pushState(null, '', '/');
      setRoute('home');
      setActiveProductId(null);
    }

    setActiveSection(section);
    setSelectedProduct(null);
    setTimeout(scroll, 60);
  };

  // Custom function for hero CTA and shop navigation
  const scrollToProducts = () => {
    setShopCategory('all');
    navigateToRoute('shop');
  };

  const handleCollectionSelect = (category: ProductCategory) => {
    setShopCategory(category);
    navigateToRoute('shop');
  };

  const navigateToProduct = (product: Product) => {
    navigateToRoute('product', { productId: product.id });
  };

  const openWhatsAppOrder = () => {
    if (isMaintenanceMode) return;

    window.open('https://wa.me/60187682528', '_blank', 'noopener,noreferrer');
  };

  const handleSellerAccess = async () => {
    setSellerPasswordInput('');
    setSellerLoginError(false);
    if (sellerAccessGranted) {
      try {
        await loadSellerStore();
      } catch {
        setSellerAccessGranted(false);
      }
    }
    navigateToRoute('seller');
  };

  const handleLogout = async () => {
    await logoutMember().catch(() => undefined);
    setCurrentUser(null);
    setOrderHistory([]);
  };

  const handleSellerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSellerLoginPending(true);
    try {
      const response = await loginSeller(SELLER_OWNER_ID, sellerPasswordInput);
      await loadSellerStore();
      setSellerAccessGranted(true);
      setSellerPasswordChangeRequired(response.passwordChangeRequired);
      setSellerPasswordInput('');
      setSellerLoginError(false);
    } catch {
      setSellerLoginError(true);
    } finally {
      setIsSellerLoginPending(false);
    }
  };

  const handleChangeSellerPassword = async (currentPassword: string, nextPassword: string) => {
    await updateSellerPassword(currentPassword, nextPassword);
    setSellerPasswordChangeRequired(false);
  };

  const handleSellerLogout = async () => {
    await logoutSeller().catch(() => undefined);
    setSellerAccessGranted(false);
    setSellerPasswordChangeRequired(false);
    if (currentUser) {
      const response = await fetchMemberOrders().catch(() => ({ orders: [] }));
      setOrderHistory(response.orders);
    } else {
      setOrderHistory([]);
    }
    navigateToRoute('home');
  };

  const handleSellerTabChange = (tab: SellerDashboardTab) => {
    const nextPath = routeToPath('seller', null, tab);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }

    setSellerTab(tab);
    setRoute('seller');
    setActiveSection('seller');
  };

  const handleSetActiveSection = (section: string) => {
    const shopCategoryMatch = section.match(/^shop:(.+)$/);
    if (shopCategoryMatch) {
      setShopCategory(shopCategoryMatch[1] as ProductCategory);
      navigateToRoute('shop');
      return;
    }

    if (section === 'products') {
      setShopCategory('all');
      navigateToRoute('shop');
      return;
    }

    if (section === 'about') {
      navigateToRoute('about');
      return;
    }

    if (section === 'business-order') {
      navigateToRoute('business-order');
      return;
    }

    if (section === 'seller') {
      handleSellerAccess();
      return;
    }

    scrollToHomeSection(section);
  };

  const handlePolicyClick = (policyType: 'privacy' | 'terms' | 'refund') => {
    navigateToRoute(policyType);
  };

  const handleLanguageChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    localStorage.setItem('raub_hang_seng_language', nextLanguage);
  };

  if (route === 'seller' && sellerAccessGranted) {
    return (
      <Suspense fallback={(
        <div className="rhs-admin-shell min-h-screen bg-slate-100 text-slate-800" role="status" aria-live="polite">
          <div className="rhs-admin-topbar h-[72px] bg-slate-900 px-5 flex items-center">
            <span className="text-sm font-bold text-white">{language === 'zh' ? '恒升河鱼商家后台' : 'Raub Hang Seng Seller Dashboard'}</span>
          </div>
          <div className="flex min-h-[calc(100vh-72px)]">
            <div className="rhs-admin-sidebar hidden w-64 bg-slate-900 md:block" aria-hidden="true" />
            <main className="rhs-admin-main flex-1 p-5 md:p-7" aria-busy="true">
              <p className="text-sm font-semibold text-slate-700">
                {language === 'zh' ? '正在载入商家后台…' : 'Loading seller dashboard…'}
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3 motion-safe:animate-pulse" aria-hidden="true">
                <div className="h-28 rounded-xl bg-slate-200" />
                <div className="h-28 rounded-xl bg-slate-200" />
                <div className="h-28 rounded-xl bg-slate-200" />
              </div>
            </main>
          </div>
        </div>
      )}>
        <SellerDashboard
          language={language}
          onClose={handleSellerLogout}
          onViewStorefront={() => navigateToRoute('home')}
          onLanguageChange={handleLanguageChange}
          initialTab={sellerTab}
          onTabChange={handleSellerTabChange}
          products={isMaintenanceMode ? draftProducts || products : products}
          setProducts={persistProducts}
          orderHistory={orderHistory}
          setOrderHistory={persistOrders}
          isMaintenanceMode={isMaintenanceMode}
          setIsMaintenanceMode={setIsMaintenanceMode}
          freeShippingThreshold={freeShippingThreshold}
          setFreeShippingThreshold={setFreeShippingThreshold}
          localShippingRate={localShippingRate}
          setLocalShippingRate={setLocalShippingRate}
          outstationShippingRate={outstationShippingRate}
          setOutstationShippingRate={setOutstationShippingRate}
          storeAnnouncement={storeAnnouncement}
          setStoreAnnouncement={setStoreAnnouncement}
          bankName={bankName}
          setBankName={setBankName}
          bankAccountHolder={bankAccountHolder}
          setBankAccountHolder={setBankAccountHolder}
          bankAccountNumber={bankAccountNumber}
          setBankAccountNumber={setBankAccountNumber}
          bankTransferInstructions={bankTransferInstructions}
          setBankTransferInstructions={setBankTransferInstructions}
          collectionDisplays={collectionDisplays}
          mediaLibrary={mediaLibrary}
          discounts={discounts}
          setDiscounts={setDiscounts}
          onSaveSettings={persistSettings}
          sellerPasswordChangeRequired={sellerPasswordChangeRequired}
          onChangeSellerPassword={handleChangeSellerPassword}
        />
      </Suspense>
    );
  }

  const policyRoute = route === 'privacy' || route === 'terms' || route === 'refund' ? route : null;
  const routeProduct = route === 'product'
    ? products.find((product) => product.id === activeProductId) ?? null
    : null;
  const relatedProducts = routeProduct
    ? products
      .filter((product) => product.id !== routeProduct.id)
      .sort((a, b) => Number(b.category === routeProduct.category) - Number(a.category === routeProduct.category))
      .slice(0, 3)
    : [];
  const isOrderingPaused = isMaintenanceMode && route !== 'seller';

  return (
    <div className="rhs-page-shell min-h-screen text-[#17323d] selection:bg-sky-500 selection:text-white font-sans antialiased">
      {/* Premium top Navigation */}
      <Header
        language={language}
        setLanguage={handleLanguageChange}
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
        activeSection={activeSection}
        setActiveSection={handleSetActiveSection}
        currentUser={currentUser}
        collections={collectionDisplays}
        onAuthClick={() => navigateToRoute('login')}
        onLogout={handleLogout}
        onSellerClick={handleSellerAccess}
      />

      <a
        href="https://wa.me/60187682528"
        target="_blank"
        rel="noreferrer"
        aria-label={language === 'zh' ? 'WhatsApp 客服' : 'WhatsApp support'}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_12px_24px_rgba(16,185,129,0.35)] flex items-center justify-center border border-white/80 transition-all hover:-translate-y-0.5"
      >
        <i className="bi bi-whatsapp text-[27px] leading-none" />
      </a>

      {/* Dynamic Store Bulletin / Announcement Ticker */}
      <div className="hidden">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-center space-x-3">
          <span className="flex-shrink-0 bg-amber-950 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-ping"></span>
            {language === 'zh' ? '店铺公告' : 'Announcement'}
          </span>
          <p className="text-amber-950 line-clamp-1 font-bold text-center">
            {storeAnnouncement}
          </p>
        </div>
      </div>

      <Suspense fallback={<StorefrontRouteFallback language={language} />}>
        {policyRoute ? (
          <PolicyView
          initialPolicyType={policyRoute}
          language={language}
          onClose={() => navigateToRoute('home')}
          onPolicyChange={(policyType) => navigateToRoute(policyType, { replace: true, scrollTop: false })}
        />
      ) : route === 'product' ? (
        <ProductPage
          language={language}
          product={routeProduct}
          relatedProducts={relatedProducts}
          onBackToShop={() => navigateToRoute('shop')}
          onProductSelect={navigateToProduct}
          onAddToCart={handleAddToCart}
          orderingPaused={isOrderingPaused}
        />
      ) : route === 'shop' ? (
        <main className="pt-[var(--rhs-topbar-height)]">
          <Products
            language={language}
            products={products}
            collections={collectionDisplays}
            initialCategory={shopCategory}
            onProductClick={navigateToProduct}
            onAddToCart={handleAddToCart}
            orderingPaused={isOrderingPaused}
          />
        </main>
      ) : route === 'about' ? (
        <main className="pt-[var(--rhs-topbar-height)]">
          <AboutUs
            language={language}
            onShopClick={scrollToProducts}
            onBusinessOrderClick={() => navigateToRoute('business-order')}
          />
        </main>
      ) : route === 'business-order' ? (
        <main className="pt-[var(--rhs-topbar-height)]">
          <BusinessOrder
            language={language}
            orderingPaused={isOrderingPaused}
          />
        </main>
      ) : route === 'login' ? (
        <main className="min-h-screen pt-[calc(var(--rhs-topbar-height)+40px)] pb-20 px-4 rhs-section-alt">
          <div className="max-w-lg mx-auto">
            <AuthModal
              isOpen
              mode="page"
              onClose={() => navigateToRoute('shop')}
              language={language}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              orderHistory={orderHistory}
            />
          </div>
        </main>
      ) : route === 'seller' ? (
        <main className="min-h-screen pt-[96px] md:pt-[116px] pb-20 px-4">
          <div className="max-w-md mx-auto rhs-panel border rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#c4d5d9]">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900">
                      {language === 'zh' ? '商家安全验证' : 'Seller Authentication'}
                    </h1>
                    <p className="text-xs text-slate-500">
                      {language === 'zh' ? '访问商家管理页面 /seller' : 'Access seller dashboard at /seller'}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSellerLogin} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    {language === 'zh' ? '店主账号' : 'Owner ID'}
                  </label>
                  <input
                    type="text"
                    value={SELLER_OWNER_ID}
                    readOnly
                    autoComplete="username"
                    className="w-full px-4 py-3 rounded-xl border border-[#c4d5d9] bg-slate-100 text-slate-700 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    {language === 'zh' ? '店主密码' : 'Owner Password'}
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={128}
                    placeholder="••••••••"
                    value={sellerPasswordInput}
                    onChange={(e) => {
                      setSellerPasswordInput(e.target.value);
                      setSellerLoginError(false);
                    }}
                    className={`w-full px-4 py-3 rounded-xl border bg-[#f8fbfa] font-mono text-center text-lg tracking-widest focus:ring-2 focus:outline-hidden transition-all ${
                      sellerLoginError
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : 'border-[#c4d5d9] focus:border-amber-500 focus:ring-amber-100'
                    }`}
                    autoComplete="current-password"
                    autoFocus
                  />
                  {sellerLoginError && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium">
                      {language === 'zh' ? '店主账号或密码不正确。' : 'Invalid owner ID or password.'}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSellerLoginPending}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 disabled:cursor-wait text-white font-bold text-xs md:text-sm rounded-xl cursor-pointer transition-all shadow-md active:scale-95"
                >
                  {isSellerLoginPending
                    ? (language === 'zh' ? '登录中…' : 'Signing in…')
                    : (language === 'zh' ? '登入商家后台' : 'Open Seller Dashboard')}
                </button>
              </form>
            </div>
          </div>
        </main>
      ) : (
        <>
          {/* Hero Section */}
          <Hero
            language={language}
            onShopNowClick={scrollToProducts}
            onWhatsAppOrderClick={openWhatsAppOrder}
            orderingPaused={isOrderingPaused}
          />

          {/* Six Step Journey explanation */}
          <HowToBuy language={language} />

          <CollectionsShowcase
            language={language}
            products={products}
            collections={collectionDisplays}
            onCollectionSelect={handleCollectionSelect}
          />

          {/* Interactive Postcode checker */}
          <DeliveryChecker language={language} />

          {/* Customer Testimonials reviews */}
          <Reviews language={language} />

          {/* Frequently Asked Questions + Location map + inquiry form */}
          <ContactUs language={language} />
        </>
        )}
      </Suspense>

      {/* Professional structured Footer */}
      <Footer language={language} setLanguage={handleLanguageChange} onNavigate={handleSetActiveSection} onPolicyClick={handlePolicyClick} />

      {/* MODAL: Product Details Dialog */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          language={language}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          orderingPaused={isOrderingPaused}
        />
      )}

      {/* SIDEBAR: Shopping Cart drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <Cart
            cartItems={cartItems}
            language={language}
            onClose={() => setIsCartOpen(false)}
            onShopNow={scrollToProducts}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onCheckout={() => {
              if (isOrderingPaused) return;
              setIsCartOpen(false);
              setIsCheckoutOpen(true);
            }}
            shippingState={shippingState}
            setShippingState={setShippingState}
            freeShippingThreshold={freeShippingThreshold}
            localShippingRate={localShippingRate}
            outstationShippingRate={outstationShippingRate}
            discounts={discounts}
            orderingPaused={isOrderingPaused}
          />
        )}
      </AnimatePresence>

      {/* MODAL: Checkout order submission */}
      {!isOrderingPaused && isCheckoutOpen && (
        <CheckoutModal
          cartItems={cartItems}
          language={language}
          onClose={() => {
            setIsCheckoutOpen(false);
            setIsCartOpen(true);
          }}
          shippingFee={shippingFee}
          totalAmount={totalAmount}
          shippingRegion={shippingState}
          onShippingRegionChange={setShippingState}
          onOrderSuccess={handleOrderSuccess}
          currentUser={currentUser}
          onAuthClick={() => navigateToRoute('login')}
          subtotal={discountTotals.subtotal}
          baseShippingFee={discountTotals.baseShippingFee}
          itemDiscountTotal={discountTotals.itemDiscountTotal}
          shippingDiscountTotal={discountTotals.shippingDiscountTotal}
          discountApplications={discountTotals.applications}
          bankTransferSettings={{
            bankName,
            accountHolder: bankAccountHolder,
            accountNumber: bankAccountNumber,
            instructions: bankTransferInstructions,
          }}
        />
      )}

      {/* MODAL: Order Placement Success Overlay */}
      {latestOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="max-w-md w-full rhs-panel border p-6 rounded-2xl text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setLatestOrder(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full w-14 h-14 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-950">
              {language === 'zh' ? '订单与水单已提交！' : 'Order & Payment Slip Submitted!'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {language === 'zh'
                ? '订单已保存到商家后台。您上传的银行转账水单会等待商家核对，确认收到款项后会更新订单状态并安排配送。'
                : 'Your order has been saved to the seller dashboard. The uploaded bank transfer slip is waiting for seller review; once payment is confirmed, the order status will update for dispatch.'}
            </p>
            <div className="rhs-panel-soft border p-3 rounded-lg text-left text-[11px] font-mono text-slate-700">
              <span className="font-bold text-sky-600">Order ID: #{latestOrder}</span>
              <p className="mt-1 text-slate-500">{language === 'zh' ? '付款状态：等待商家核对水单。' : 'Payment status: waiting for seller slip review.'}</p>
            </div>
            <button
              onClick={() => setLatestOrder(null)}
              className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
            >
              {language === 'zh' ? '好的，返回商城' : 'Got it, return to Store'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
