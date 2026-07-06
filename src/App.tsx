import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import Header from './components/Header';
import Hero from './components/Hero';
import Products from './components/Products';
import ProductPage from './components/ProductPage';
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
import { Product, CartItem, Language, DeliveryDetails, User, OrderRecord, StoreSettings, ProductCategory, CollectionDisplay } from './types';
import { ShoppingBag, Eye, X, ClipboardList, CheckCircle, Lock } from 'lucide-react';
import { PRODUCTS } from './data/products';
import { DEFAULT_COLLECTIONS, normalizeCollectionDisplays } from './data/collections';
import SellerDashboard from './components/SellerDashboard';
import PolicyView from './components/PolicyView';
import { createOrder, fetchStore, replaceOrders, replaceProducts, updateSellerPasscode, updateSettings, verifySellerPasscode } from './lib/api';

type AppRoute = 'home' | 'shop' | 'product' | 'seller' | 'privacy' | 'terms' | 'refund';

const PRODUCT_ROUTE_PREFIX = '/product/';
const DEFAULT_STORE_ANNOUNCEMENT = '【恒升河鱼公告】彭亨河主流特马鲁网箱及野生巴丁/苏丹鱼每日捕捞，西马冷链送达，消费满 RM250 免运费！';
const getRouteFromPath = (): AppRoute => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/shop') return 'shop';
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
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Order history
  const [orderHistory, setOrderHistory] = useState<OrderRecord[]>([]);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
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

  const applyStoreSettings = (settings: StoreSettings) => {
    setIsMaintenanceMode(Boolean(settings.maintenanceMode));
    setFreeShippingThreshold(Number(settings.freeShippingThreshold) || 250);
    setLocalShippingRate(Number(settings.localShippingRate) || 20);
    setOutstationShippingRate(Number(settings.outstationShippingRate) || 30);
    setStoreAnnouncement(settings.storeAnnouncement || DEFAULT_STORE_ANNOUNCEMENT);
    setCollectionDisplays(normalizeCollectionDisplays(settings.collections));
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
      const savedCollectionsRaw = localStorage.getItem('raub_hang_seng_collections');
      if (savedCollectionsRaw) {
        try {
          savedCollections = normalizeCollectionDisplays(JSON.parse(savedCollectionsRaw));
        } catch (e) {
          console.error('Failed to parse collection displays', e);
        }
      }

      const fallbackSettings: StoreSettings = {
        maintenanceMode: localStorage.getItem('raub_hang_seng_maintenance') === 'true',
        freeShippingThreshold: Number(localStorage.getItem('raub_hang_seng_free_shipping')) || 250,
        localShippingRate: Number(localStorage.getItem('raub_hang_seng_local_rate')) || 20,
        outstationShippingRate: Number(localStorage.getItem('raub_hang_seng_outstation_rate')) || 30,
        storeAnnouncement: localStorage.getItem('raub_hang_seng_announcement') || DEFAULT_STORE_ANNOUNCEMENT,
        collections: savedCollections,
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
    localStorage.setItem('pahang_river_fish_orders', JSON.stringify(nextOrders));

    try {
      const response = await replaceOrders(nextOrders);
      setOrderHistory(response.orders);
      localStorage.setItem('pahang_river_fish_orders', JSON.stringify(response.orders));
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

    try {
      const response = await updateSettings(settingsPatch);
      applyStoreSettings(response.settings);
      localStorage.setItem('raub_hang_seng_maintenance', String(response.settings.maintenanceMode));
      localStorage.setItem('raub_hang_seng_free_shipping', String(response.settings.freeShippingThreshold));
      localStorage.setItem('raub_hang_seng_local_rate', String(response.settings.localShippingRate));
      localStorage.setItem('raub_hang_seng_outstation_rate', String(response.settings.outstationShippingRate));
      localStorage.setItem('raub_hang_seng_announcement', response.settings.storeAnnouncement);
      localStorage.setItem('raub_hang_seng_collections', JSON.stringify(normalizeCollectionDisplays(response.settings.collections)));
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
    localStorage.setItem('pahang_river_fish_orders', JSON.stringify(updatedHistory));

    try {
      const response = await createOrder(finalOrder);
      setOrderHistory(response.orders);
      localStorage.setItem('pahang_river_fish_orders', JSON.stringify(response.orders));
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
    const shopCategoryMatch = section.match(/^shop:(premium|wild|aquaculture|wellness)$/);
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
        onAuthClick={() => setIsAuthOpen(true)}
        onSellerClick={handleSellerAccess}
      />

      {/* Floating floating order history trigger if they have placed orders */}
      {orderHistory.length > 0 && (
        <button
          onClick={() => setIsOrderHistoryOpen(true)}
          className="fixed bottom-6 left-6 z-40 rhs-panel hover:bg-[#f8fbfa] border text-slate-600 hover:text-slate-900 px-4 py-2.5 rounded-full shadow-lg flex items-center space-x-2 text-xs font-semibold cursor-pointer transition-all"
        >
          <ClipboardList className="w-4 h-4 text-sky-500" />
          <span>{language === 'zh' ? '历史订单' : 'Order History'}</span>
          <span className="bg-sky-50 text-sky-600 border border-sky-100 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
            {orderHistory.length}
          </span>
        </button>
      )}

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
            initialCategory={shopCategory}
            onProductClick={navigateToProduct}
            onAddToCart={handleAddToCart}
            orderingPaused={isOrderingPaused}
          />
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
          onAuthClick={() => setIsAuthOpen(true)}
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
              {language === 'zh' ? '订单模板已发送！' : 'Order Invoice Built!'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {language === 'zh'
                ? '我们已在新窗口为您唤醒了 WhatsApp。发票清单已自动复制在您的输入框中，请点击【发送】联系客服专员。客服会立即与您确认网银付款并安排配送！'
                : 'Your WhatsApp order has been prepared. Please send the pre-filled text in the chat to complete your booking. Support will reply immediately with credentials.'}
            </p>
            <div className="rhs-panel-soft border p-3 rounded-lg text-left text-[11px] font-mono text-slate-700">
              <span className="font-bold text-sky-600">Order ID: #{latestOrder}</span>
              <p className="mt-1 text-slate-500">{language === 'zh' ? '请在 WhatsApp 聊天框中按发送键。' : 'Remember to click Send on the WhatsApp screen.'}</p>
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

      {/* MODAL: Past Order History review */}
      {isOrderHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="absolute inset-0" onClick={() => setIsOrderHistoryOpen(false)} />
          <div className="relative w-full max-w-2xl rhs-panel border rounded-2xl overflow-hidden shadow-2xl z-10 my-8 animate-fade-in">
            <button
              onClick={() => setIsOrderHistoryOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-5 border-b border-slate-150 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <ClipboardList className="w-5 h-5 mr-2 text-sky-600" />
                {language === 'zh' ? '我的历史订单' : 'My Past Orders'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'zh' ? '本列表基于您的浏览器本地存储，记录您最近提交的预购订单：' : 'Saved locally in this browser. Here is your current order list:'}
              </p>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto rhs-panel">
              {orderHistory.map((order) => (
                <div key={order.id} className="rhs-panel-soft border p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-sky-600">Order ID: #{order.id}</span>
                    <span className="text-slate-500 font-mono">{order.date}</span>
                  </div>

                  <div className="space-y-1.5">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-slate-700">
                        <span>
                          {item.quantity}条 × {language === 'zh' ? item.product.nameZh : item.product.nameEn} ({item.selectedWeightKg.toFixed(1)}kg)
                        </span>
                        <span className="font-mono text-slate-600">RM {(item.product.pricePerKg * item.selectedWeightKg * item.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-slate-200" />

                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <div>
                      <p>{language === 'zh' ? '收件人:' : 'Ship to:'} <span className="text-slate-900 font-semibold">{order.details.fullName}</span></p>
                      <p className="text-[10px] mt-0.5">{order.details.address}, {order.details.city}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">{language === 'zh' ? '总付金额' : 'Total'}</span>
                      <strong className="text-sm font-black text-amber-600 font-mono">RM {order.total.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rhs-panel-soft border-t border-[#c4d5d9] text-right">
              <button
                onClick={() => setIsOrderHistoryOpen(false)}
                className="px-5 py-2 bg-[#f8fbfa] border border-[#c4d5d9] hover:border-[#a8c1c7] text-slate-600 rounded-lg text-xs font-semibold hover:bg-[#edf5f4] cursor-pointer"
              >
                {language === 'zh' ? '关闭' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Optional Member Login & Registration */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        language={language}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        orderHistory={orderHistory}
      />

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
