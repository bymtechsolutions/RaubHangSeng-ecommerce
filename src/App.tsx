import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import Header from './components/Header';
import Hero from './components/Hero';
import Products from './components/Products';
import ProductPage from './components/ProductPage';
import AboutUs from './components/AboutUs';
import BusinessOrder from './components/BusinessOrder';
import ProductDetailModal from './components/ProductDetailModal';
import Cart from './components/Cart';
import CheckoutModal from './components/CheckoutModal';
import HowToBuy from './components/HowToBuy';
import CollectionsShowcase from './components/CollectionsShowcase';
import DeliveryChecker from './components/DeliveryChecker';
import Reviews from './components/Reviews';
import ContactUs from './components/ContactUs';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import { Product, CartItem, Language, DeliveryDetails, User, OrderRecord, StoreSettings, ProductCategory, CollectionDisplay, ProductMedia } from './types';
import { X, CheckCircle, Lock } from 'lucide-react';
import { PRODUCTS } from './data/products';
import { DEFAULT_COLLECTIONS, normalizeCollectionDisplays } from './data/collections';
import SellerDashboard from './components/SellerDashboard';
import PolicyView from './components/PolicyView';
import { createOrder, fetchStore, replaceOrders, replaceProducts, updateSellerPasscode, updateSettings, verifySellerPasscode } from './lib/api';

type AppRoute = 'home' | 'shop' | 'product' | 'about' | 'business-order' | 'login' | 'seller' | 'privacy' | 'terms' | 'refund';

const PRODUCT_ROUTE_PREFIX = '/product/';
const DEFAULT_STORE_ANNOUNCEMENT = '【恒升河鱼公告】彭亨河主流特马鲁网箱及野生巴丁/苏丹鱼每日捕捞，西马冷链送达，消费满 RM250 免运费！';
const getRouteFromPath = (): AppRoute => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/shop') return 'shop';
  if (path === '/about') return 'about';
  if (path === '/business-order') return 'business-order';
  if (path === '/login') return 'login';
  if (path.startsWith(PRODUCT_ROUTE_PREFIX) && path.length > PRODUCT_ROUTE_PREFIX.length) return 'product';
  if (path === '/seller') return 'seller';
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

const routeToPath = (route: AppRoute, productId?: string | null) => {
  if (route === 'home') return '/';
  if (route === 'product') return productId ? `/product/${encodeURIComponent(productId)}` : '/shop';
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

export default function App() {
  // Main states
  const [route, setRoute] = useState<AppRoute>(() => getRouteFromPath());
  const [activeProductId, setActiveProductId] = useState<string | null>(() => getProductIdFromPath());
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
  const [sellerAccessGranted, setSellerAccessGranted] = useState(() => sessionStorage.getItem('raub_hang_seng_seller_access') === 'true');
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(250);
  const [localShippingRate, setLocalShippingRate] = useState(20);
  const [outstationShippingRate, setOutstationShippingRate] = useState(30);
  const [storeAnnouncement, setStoreAnnouncement] = useState(DEFAULT_STORE_ANNOUNCEMENT);
  const [collectionDisplays, setCollectionDisplays] = useState<CollectionDisplay[]>(DEFAULT_COLLECTIONS);
  const [mediaLibrary, setMediaLibrary] = useState<ProductMedia[]>([]);

  const applyStoreSettings = (settings: StoreSettings) => {
    setIsMaintenanceMode(Boolean(settings.maintenanceMode));
    setFreeShippingThreshold(Number(settings.freeShippingThreshold) || 250);
    setLocalShippingRate(Number(settings.localShippingRate) || 20);
    setOutstationShippingRate(Number(settings.outstationShippingRate) || 30);
    setStoreAnnouncement(settings.storeAnnouncement || DEFAULT_STORE_ANNOUNCEMENT);
    setCollectionDisplays(normalizeCollectionDisplays(settings.collections));
    setMediaLibrary(Array.isArray(settings.mediaLibrary) ? settings.mediaLibrary : []);
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

    const savedUser = localStorage.getItem('raub_hang_seng_current_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse user session', e);
      }
    }

    const loadLocalStoreFallback = () => {
      const savedOrders = localStorage.getItem('pahang_river_fish_orders');
      if (savedOrders) {
        try {
          setOrderHistory(JSON.parse(savedOrders));
        } catch (e) {
          console.error('Failed to parse order history', e);
        }
      }

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
          savedMediaLibrary = Array.isArray(parsedMediaLibrary) ? parsedMediaLibrary : [];
        } catch (e) {
          console.error('Failed to parse media library', e);
        }
      }

      const fallbackSettings: StoreSettings = {
        maintenanceMode: localStorage.getItem('raub_hang_seng_maintenance') === 'true',
        freeShippingThreshold: Number(localStorage.getItem('raub_hang_seng_free_shipping')) || 250,
        localShippingRate: Number(localStorage.getItem('raub_hang_seng_local_rate')) || 20,
        outstationShippingRate: Number(localStorage.getItem('raub_hang_seng_outstation_rate')) || 30,
        storeAnnouncement: localStorage.getItem('raub_hang_seng_announcement') || DEFAULT_STORE_ANNOUNCEMENT,
        collections: savedCollections,
        mediaLibrary: savedMediaLibrary,
      };
      applyStoreSettings(fallbackSettings);
    };

    const loadBackendStore = async () => {
      try {
        const store = await fetchStore();
        setProducts(store.products);
        setDraftProducts(store.draftProducts || null);
        setOrderHistory(store.orders);
        applyStoreSettings(store.settings);

        localStorage.setItem('raub_hang_seng_products', JSON.stringify(store.products));
        if (store.draftProducts) {
          localStorage.setItem('raub_hang_seng_products_draft', JSON.stringify(store.draftProducts));
        } else {
          localStorage.removeItem('raub_hang_seng_products_draft');
        }
        localStorage.setItem('pahang_river_fish_orders', JSON.stringify(store.orders));
        localStorage.setItem('raub_hang_seng_maintenance', String(store.settings.maintenanceMode));
        localStorage.setItem('raub_hang_seng_free_shipping', String(store.settings.freeShippingThreshold));
        localStorage.setItem('raub_hang_seng_local_rate', String(store.settings.localShippingRate));
        localStorage.setItem('raub_hang_seng_outstation_rate', String(store.settings.outstationShippingRate));
        localStorage.setItem('raub_hang_seng_announcement', store.settings.storeAnnouncement);
        localStorage.setItem('raub_hang_seng_collections', JSON.stringify(normalizeCollectionDisplays(store.settings.collections)));
        localStorage.setItem('raub_hang_seng_media_library', JSON.stringify(store.settings.mediaLibrary || []));
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
      setActiveSection(routeToActiveSection(nextRoute));
      setSelectedProduct(null);
      setIsCartOpen(false);
      setIsCheckoutOpen(false);
    };

    window.addEventListener('popstate', syncRouteFromBrowser);
    return () => window.removeEventListener('popstate', syncRouteFromBrowser);
  }, []);

  useEffect(() => {
    if (isMaintenanceMode) {
      setIsCheckoutOpen(false);
    }
  }, [isMaintenanceMode]);

  // Save cart to localStorage
  const saveCart = (items: CartItem[]) => {
    setCartItems(items);
    localStorage.setItem('pahang_river_fish_cart', JSON.stringify(items));
  };

  const publishProducts = async (nextProducts: Product[]) => {
    setProducts(nextProducts);
    localStorage.setItem('raub_hang_seng_products', JSON.stringify(nextProducts));

    try {
      const response = await replaceProducts(nextProducts);
      setProducts(response.products);
      setDraftProducts(response.draftProducts || null);
      localStorage.setItem('raub_hang_seng_products', JSON.stringify(response.products));
      if (response.draftProducts) {
        localStorage.setItem('raub_hang_seng_products_draft', JSON.stringify(response.draftProducts));
      } else {
        localStorage.removeItem('raub_hang_seng_products_draft');
      }
    } catch (e) {
      console.error('Failed to persist products to backend', e);
    }
  };

  const persistProducts = async (nextProducts: Product[]) => {
    if (isMaintenanceMode) {
      setDraftProducts(nextProducts);
      localStorage.setItem('raub_hang_seng_products_draft', JSON.stringify(nextProducts));

      try {
        const response = await replaceProducts(nextProducts, { draft: true });
        const nextDraft = response.draftProducts || nextProducts;
        setDraftProducts(nextDraft);
        localStorage.setItem('raub_hang_seng_products_draft', JSON.stringify(nextDraft));
      } catch (e) {
        console.error('Failed to persist draft products to backend', e);
      }
      return;
    }

    await publishProducts(nextProducts);
  };

  const persistOrders = async (nextOrders: OrderRecord[]) => {
    setOrderHistory(nextOrders);
    try {
      localStorage.setItem('pahang_river_fish_orders', JSON.stringify(nextOrders));
    } catch (e) {
      console.error('Failed to cache orders locally', e);
    }

    try {
      const response = await replaceOrders(nextOrders);
      setOrderHistory(response.orders);
      try {
        localStorage.setItem('pahang_river_fish_orders', JSON.stringify(response.orders));
      } catch (e) {
        console.error('Failed to cache orders locally', e);
      }
    } catch (e) {
      console.error('Failed to persist orders to backend', e);
    }
  };

  const persistSettings = async (settingsPatch: Partial<StoreSettings>) => {
    if (settingsPatch.maintenanceMode === true && !draftProducts) {
      setDraftProducts(products);
      localStorage.setItem('raub_hang_seng_products_draft', JSON.stringify(products));
      try {
        const response = await replaceProducts(products, { draft: true });
        const nextDraft = response.draftProducts || products;
        setDraftProducts(nextDraft);
        localStorage.setItem('raub_hang_seng_products_draft', JSON.stringify(nextDraft));
      } catch (e) {
        console.error('Failed to initialize draft products', e);
      }
    }

    if (settingsPatch.maintenanceMode === false && draftProducts) {
      await publishProducts(draftProducts);
      setDraftProducts(null);
      localStorage.removeItem('raub_hang_seng_products_draft');
    }

    if (settingsPatch.maintenanceMode !== undefined) {
      setIsMaintenanceMode(Boolean(settingsPatch.maintenanceMode));
      localStorage.setItem('raub_hang_seng_maintenance', String(settingsPatch.maintenanceMode));
    }
    if (settingsPatch.freeShippingThreshold !== undefined) {
      setFreeShippingThreshold(Number(settingsPatch.freeShippingThreshold));
      localStorage.setItem('raub_hang_seng_free_shipping', String(settingsPatch.freeShippingThreshold));
    }
    if (settingsPatch.localShippingRate !== undefined) {
      setLocalShippingRate(Number(settingsPatch.localShippingRate));
      localStorage.setItem('raub_hang_seng_local_rate', String(settingsPatch.localShippingRate));
    }
    if (settingsPatch.outstationShippingRate !== undefined) {
      setOutstationShippingRate(Number(settingsPatch.outstationShippingRate));
      localStorage.setItem('raub_hang_seng_outstation_rate', String(settingsPatch.outstationShippingRate));
    }
    if (settingsPatch.storeAnnouncement !== undefined) {
      setStoreAnnouncement(settingsPatch.storeAnnouncement);
      localStorage.setItem('raub_hang_seng_announcement', settingsPatch.storeAnnouncement);
    }
    if (settingsPatch.collections !== undefined) {
      const normalizedCollections = normalizeCollectionDisplays(settingsPatch.collections);
      setCollectionDisplays(normalizedCollections);
      localStorage.setItem('raub_hang_seng_collections', JSON.stringify(normalizedCollections));
    }
    if (settingsPatch.mediaLibrary !== undefined) {
      const nextMediaLibrary = Array.isArray(settingsPatch.mediaLibrary) ? settingsPatch.mediaLibrary : [];
      setMediaLibrary(nextMediaLibrary);
      localStorage.setItem('raub_hang_seng_media_library', JSON.stringify(nextMediaLibrary));
    }

    try {
      const response = await updateSettings(settingsPatch);
      applyStoreSettings(response.settings);
      localStorage.setItem('raub_hang_seng_maintenance', String(response.settings.maintenanceMode));
      localStorage.setItem('raub_hang_seng_free_shipping', String(response.settings.freeShippingThreshold));
      localStorage.setItem('raub_hang_seng_local_rate', String(response.settings.localShippingRate));
      localStorage.setItem('raub_hang_seng_outstation_rate', String(response.settings.outstationShippingRate));
      localStorage.setItem('raub_hang_seng_announcement', response.settings.storeAnnouncement);
      localStorage.setItem('raub_hang_seng_collections', JSON.stringify(normalizeCollectionDisplays(response.settings.collections)));
      localStorage.setItem('raub_hang_seng_media_library', JSON.stringify(response.settings.mediaLibrary || []));
    } catch (e) {
      console.error('Failed to persist settings to backend', e);
    }
  };

  // Add Item to Cart
  const handleAddToCart = (
    product: Product,
    quantity: number,
    weightKg: number,
    cutType: 'whole' | 'cleaned' | 'sliced' | 'steak' | 'fillet'
  ) => {
    if (isMaintenanceMode) return;

    const existingIndex = cartItems.findIndex(
      (item) =>
        item.product.id === product.id &&
        item.selectedWeightKg === weightKg &&
        item.cutType === cutType
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
  const handleOrderSuccess = async (order: OrderRecord) => {
    if (isMaintenanceMode) return;

    let finalOrder = { ...order };
    
    if (currentUser) {
      finalOrder.userId = currentUser.username;
      
      const earnedPoints = Math.round(order.total);
      const updatedUser: User = {
        ...currentUser,
        memberPoints: currentUser.memberPoints + earnedPoints,
      };
      
      setCurrentUser(updatedUser);
      localStorage.setItem('raub_hang_seng_current_user', JSON.stringify(updatedUser));
    }

    const updatedHistory = [finalOrder, ...orderHistory];
    setOrderHistory(updatedHistory);
    try {
      localStorage.setItem('pahang_river_fish_orders', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Failed to cache orders locally', e);
    }

    try {
      const response = await createOrder(finalOrder);
      setOrderHistory(response.orders);
      try {
        localStorage.setItem('pahang_river_fish_orders', JSON.stringify(response.orders));
      } catch (e) {
        console.error('Failed to cache orders locally', e);
      }
    } catch (e) {
      console.error('Failed to persist order to backend', e);
    }

    setLatestOrder(order.id);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    saveCart([]); // Empty cart after placing order
  };

  // Helper calculation
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const subtotal = cartItems.reduce((acc, item) => {
    return acc + item.product.pricePerKg * item.selectedWeightKg * item.quantity;
  }, 0);

  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingFee = cartItems.length === 0
    ? 0
    : isFreeShipping
      ? 0
      : shippingState === 'local'
        ? localShippingRate
        : outstationShippingRate;

  const totalAmount = subtotal + shippingFee;

  const navigateToRoute = (nextRoute: AppRoute, options?: { replace?: boolean; scrollTop?: boolean; productId?: string }) => {
    const nextPath = routeToPath(nextRoute, options?.productId);
    if (window.location.pathname !== nextPath) {
      if (options?.replace) {
        window.history.replaceState(null, '', nextPath);
      } else {
        window.history.pushState(null, '', nextPath);
      }
    }

    setRoute(nextRoute);
    setActiveProductId(nextRoute === 'product' ? options?.productId ?? null : null);
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

  const handleSellerAccess = () => {
    setPasscodeInput('');
    setPasscodeError(false);
    navigateToRoute('seller');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('raub_hang_seng_current_user');
  };

  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifySellerPasscode(passcodeInput);
      sessionStorage.setItem('raub_hang_seng_seller_access', 'true');
      setSellerAccessGranted(true);
      setPasscodeInput('');
      setPasscodeError(false);
    } catch {
      setPasscodeError(true);
    }
  };

  const handleChangeSellerPasscode = async (currentPasscode: string, nextPasscode: string) => {
    await updateSellerPasscode(currentPasscode, nextPasscode);
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
      <SellerDashboard
        language={language}
        onClose={() => {
          navigateToRoute('home');
        }}
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
        collectionDisplays={collectionDisplays}
        mediaLibrary={mediaLibrary}
        onSaveSettings={persistSettings}
        onChangeSellerPasscode={handleChangeSellerPasscode}
      />
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

              <form onSubmit={handleVerifyPasscode} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    {language === 'zh' ? '请输入管理授权密码' : 'Enter Admin Passcode'}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="????"
                    value={passcodeInput}
                    onChange={(e) => {
                      setPasscodeInput(e.target.value);
                      setPasscodeError(false);
                    }}
                    className={`w-full px-4 py-3 rounded-xl border bg-[#f8fbfa] font-mono text-center text-lg tracking-widest focus:ring-2 focus:outline-hidden transition-all ${
                      passcodeError
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : 'border-[#c4d5d9] focus:border-amber-500 focus:ring-amber-100'
                    }`}
                    autoFocus
                  />
                  {passcodeError && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium">
                      {language === 'zh' ? '密码错误，拒绝访问！' : 'Invalid passcode. Access denied.'}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs md:text-sm rounded-xl cursor-pointer transition-all shadow-md active:scale-95"
                >
                  {language === 'zh' ? '登入商家后台' : 'Open Seller Dashboard'}
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
            orderingPaused={isOrderingPaused}
          />
        )}
      </AnimatePresence>

      {/* MODAL: Form Checkout & WhatsApp order builder */}
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
          onOrderSuccess={handleOrderSuccess}
          currentUser={currentUser}
          onAuthClick={() => navigateToRoute('login')}
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
                ? '我们已在新窗口为您唤醒 WhatsApp。请点击【发送】把订单清单发给客服。您上传的银行转账水单会保存在订单中，商家核对付款后会在后台确认并安排配送。'
                : 'WhatsApp has opened with your order summary. Please press Send. Your uploaded bank transfer slip is saved with the order, and the seller will confirm payment in the dashboard before dispatch.'}
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

      {/* MODAL: Seller Passcode Authorization */}
      {isPasscodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rhs-panel rounded-2xl shadow-xl overflow-hidden border animate-fade-in">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {language === 'zh' ? '商家安全验证' : 'Seller Authentication'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {language === 'zh' ? '管理后台访问受限' : 'Restricted Admin Access'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPasscodeModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleVerifyPasscode} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    {language === 'zh' ? '请输入管理授权密码' : 'Enter Admin Passcode'}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="••••"
                      value={passcodeInput}
                      onChange={(e) => {
                        setPasscodeInput(e.target.value);
                        setPasscodeError(false);
                      }}
                      className={`w-full px-4 py-3 rounded-xl border font-mono text-center text-lg tracking-widest focus:ring-2 focus:outline-hidden transition-all ${
                        passcodeError
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-slate-200 focus:border-amber-500 focus:ring-amber-100'
                      }`}
                      autoFocus
                    />
                  </div>
                  {passcodeError && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium">
                      {language === 'zh' ? '密码错误，拒绝访问！' : 'Invalid passcode. Access Denied!'}
                    </p>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPasscodeModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs md:text-sm rounded-xl border border-slate-100 cursor-pointer transition-all"
                  >
                    {language === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs md:text-sm rounded-xl cursor-pointer transition-all shadow-md active:scale-95"
                  >
                    {language === 'zh' ? '确认登录' : 'Confirm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
