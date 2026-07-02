import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Products from './components/Products';
import ProductDetailModal from './components/ProductDetailModal';
import Cart from './components/Cart';
import CheckoutModal from './components/CheckoutModal';
import HowToBuy from './components/HowToBuy';
import DeliveryChecker from './components/DeliveryChecker';
import Reviews from './components/Reviews';
import ContactUs from './components/ContactUs';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import { Product, CartItem, Language, DeliveryDetails, User } from './types';
import { ShoppingBag, Eye, X, ClipboardList, CheckCircle, PhoneCall, Lock } from 'lucide-react';
import { PRODUCTS } from './data/products';
import SellerDashboard from './components/SellerDashboard';
import PolicyView from './components/PolicyView';

export default function App() {
  // Main states
  const [language, setLanguage] = useState<Language>('zh');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [shippingState, setShippingState] = useState<'local' | 'outstation'>('local');
  const [activePolicy, setActivePolicy] = useState<'privacy' | 'terms' | 'refund' | null>(null);

  // Member states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Order history
  const [orderHistory, setOrderHistory] = useState<{ id: string; items: CartItem[]; details: DeliveryDetails; total: number; date: string; status?: string; userId?: string }[]>([]);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [latestOrder, setLatestOrder] = useState<string | null>(null);

  // Seller Dashboard / Store Configuration States
  const [products, setProducts] = useState<Product[]>([]);
  const [isSellerDashboardOpen, setIsSellerDashboardOpen] = useState(false);
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(250);
  const [localShippingRate, setLocalShippingRate] = useState(20);
  const [outstationShippingRate, setOutstationShippingRate] = useState(30);
  const [storeAnnouncement, setStoreAnnouncement] = useState('【恒升河鱼公告】彭亨河主流特马鲁网箱及野生巴丁/苏丹鱼每日捕捞，西马冷链送达，消费满 RM250 免运费！');

  // Initialize all states from localStorage on mount
  useEffect(() => {
    // 1. Cart
    const savedCart = localStorage.getItem('pahang_river_fish_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart items', e);
      }
    }

    // 2. Orders
    const savedOrders = localStorage.getItem('pahang_river_fish_orders');
    if (savedOrders) {
      try {
        setOrderHistory(JSON.parse(savedOrders));
      } catch (e) {
        console.error('Failed to parse order history', e);
      }
    }

    // 3. Current User
    const savedUser = localStorage.getItem('raub_hang_seng_current_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse user session', e);
      }
    }

    // 4. Custom Products Catalog
    const savedProducts = localStorage.getItem('raub_hang_seng_products');
    if (savedProducts) {
      try {
        setProducts(JSON.parse(savedProducts));
      } catch (e) {
        console.error('Failed to parse products', e);
        setProducts(PRODUCTS);
      }
    } else {
      setProducts(PRODUCTS);
      localStorage.setItem('raub_hang_seng_products', JSON.stringify(PRODUCTS));
    }

    // 5. Store Settings
    const maintenance = localStorage.getItem('raub_hang_seng_maintenance');
    if (maintenance) {
      setIsMaintenanceMode(maintenance === 'true');
    }

    const freeShip = localStorage.getItem('raub_hang_seng_free_shipping');
    if (freeShip) {
      setFreeShippingThreshold(Number(freeShip));
    }

    const localRate = localStorage.getItem('raub_hang_seng_local_rate');
    if (localRate) {
      setLocalShippingRate(Number(localRate));
    }

    const outRate = localStorage.getItem('raub_hang_seng_outstation_rate');
    if (outRate) {
      setOutstationShippingRate(Number(outRate));
    }

    const announcement = localStorage.getItem('raub_hang_seng_announcement');
    if (announcement) {
      setStoreAnnouncement(announcement);
    }
  }, []);

  // Sync maintenance state
  useEffect(() => {
    localStorage.setItem('raub_hang_seng_maintenance', String(isMaintenanceMode));
  }, [isMaintenanceMode]);

  // Save cart to localStorage
  const saveCart = (items: CartItem[]) => {
    setCartItems(items);
    localStorage.setItem('pahang_river_fish_cart', JSON.stringify(items));
  };

  // Add Item to Cart
  const handleAddToCart = (
    product: Product,
    quantity: number,
    weightKg: number,
    cutType: 'whole' | 'cleaned' | 'sliced' | 'steak' | 'fillet'
  ) => {
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
  const handleOrderSuccess = (order: { id: string; items: CartItem[]; details: DeliveryDetails; total: number; date: string; userId?: string }) => {
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
      
      // Update in members directory
      const storedMembersStr = localStorage.getItem('raub_hang_seng_members');
      if (storedMembersStr) {
        try {
          const members = JSON.parse(storedMembersStr);
          const key = currentUser.username.toLowerCase();
          if (members[key]) {
            members[key].profile = updatedUser;
            localStorage.setItem('raub_hang_seng_members', JSON.stringify(members));
          }
        } catch (e) {
          console.error('Failed to update member points in directory', e);
        }
      }
    }

    const updatedHistory = [finalOrder, ...orderHistory];
    setOrderHistory(updatedHistory);
    localStorage.setItem('pahang_river_fish_orders', JSON.stringify(updatedHistory));

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

  // Custom function to scroll to a section on click
  const scrollToProducts = () => {
    const element = document.getElementById('products');
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection('products');
    }
  };

  const handleSellerAccess = () => {
    setPasscodeInput('');
    setPasscodeError(false);
    setIsPasscodeModalOpen(true);
  };

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput === '8888') {
      setIsPasscodeModalOpen(false);
      setIsSellerDashboardOpen(true);
    } else {
      setPasscodeError(true);
    }
  };

  const handleSetActiveSection = (section: string) => {
    setActiveSection(section);
    if (section !== 'policy') {
      setActivePolicy(null);
      // Wait a brief tick for home components to mount before scrolling
      setTimeout(() => {
        const element = document.getElementById(section);
        if (element) {
          const yOffset = -80;
          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        } else if (section === 'home') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    }
  };

  const handlePolicyClick = (policyType: 'privacy' | 'terms' | 'refund') => {
    setActivePolicy(policyType);
    setActiveSection('policy');
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 selection:bg-sky-500 selection:text-white font-sans antialiased">
      {/* Premium top Navigation */}
      <Header
        language={language}
        setLanguage={setLanguage}
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
          className="fixed bottom-6 left-6 z-40 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 px-4 py-2.5 rounded-full shadow-lg flex items-center space-x-2 text-xs font-semibold cursor-pointer transition-all"
        >
          <ClipboardList className="w-4 h-4 text-sky-500" />
          <span>{language === 'zh' ? '历史订单' : 'Order History'}</span>
          <span className="bg-sky-50 text-sky-600 border border-sky-100 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
            {orderHistory.length}
          </span>
        </button>
      )}

      {/* Dynamic Store Bulletin / Announcement Ticker */}
      <div className="pt-[76px] bg-amber-500 text-amber-950 text-xs py-2 px-4 shadow-xs font-medium flex items-center relative z-30">
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

      {activePolicy ? (
        <PolicyView
          initialPolicyType={activePolicy}
          language={language}
          onClose={() => {
            setActivePolicy(null);
            setActiveSection('home');
          }}
        />
      ) : (
        <>
          {/* Hero Section */}
          <Hero
            language={language}
            onShopNowClick={scrollToProducts}
            onWhatsAppOrderClick={scrollToProducts}
          />

          {/* Six Step Journey explanation */}
          <HowToBuy language={language} />

          {/* Interactive Products Grid */}
          <Products
            language={language}
            products={products}
            onProductClick={(prod) => setSelectedProduct(prod)}
            onAddToCart={handleAddToCart}
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
      <Footer language={language} onPolicyClick={handlePolicyClick} />

      {/* MODAL: Product Details Dialog */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          language={language}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* SIDEBAR: Shopping Cart drawer */}
      {isCartOpen && (
        <Cart
          cartItems={cartItems}
          language={language}
          onClose={() => setIsCartOpen(false)}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onCheckout={() => {
            setIsCartOpen(false);
            setIsCheckoutOpen(true);
          }}
          shippingState={shippingState}
          setShippingState={setShippingState}
        />
      )}

      {/* MODAL: Form Checkout & WhatsApp order builder */}
      {isCheckoutOpen && (
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
          <div className="max-w-md w-full bg-white border border-slate-200 p-6 rounded-2xl text-center space-y-4 shadow-2xl relative">
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
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-left text-[11px] font-mono text-slate-700">
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
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl z-10 my-8 animate-fade-in">
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

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto bg-white">
              {orderHistory.map((order) => (
                <div key={order.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
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

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setIsOrderHistoryOpen(false)}
                className="px-5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
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
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 animate-fade-in">
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
                  <p className="mt-2 text-[11px] text-slate-400">
                    {language === 'zh' ? '默认初始密码为: 8888' : 'Default initial passcode: 8888'}
                  </p>
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

      {/* MODAL: Seller Administration Dashboard */}
      {isSellerDashboardOpen && (
        <SellerDashboard
          language={language}
          onClose={() => setIsSellerDashboardOpen(false)}
          products={products}
          setProducts={setProducts}
          orderHistory={orderHistory}
          setOrderHistory={setOrderHistory}
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
        />
      )}

      {/* MAINTENANCE MODE OVERLAY */}
      {isMaintenanceMode && !isSellerDashboardOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white px-4 text-center">
          <div className="max-w-md space-y-6 animate-fade-in">
            <div className="mx-auto w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-500 animate-pulse">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight font-sans">
                {language === 'zh' ? '店铺捕捞休整中' : 'Shop Under Maintenance'}
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                {language === 'zh'
                  ? '我们正在特马鲁巴丁鱼网箱基地进行系统性维护，并升级冷链出货渠道。店铺暂时处于捕捞休整状态。如果您有紧急需求，请直接联系客服处理！'
                  : 'We are currently performing scheduled maintenance on our cage aquaculture systems and streamlining our cold-chain distribution channels. New catalog orders are paused.'}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-800 flex flex-col space-y-3">
              <a
                href="https://wa.me/60187682528"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center space-x-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all shadow-md"
              >
                <PhoneCall className="w-4 h-4" />
                <span>{language === 'zh' ? '联系专员下单 (WhatsApp)' : 'Inquire via WhatsApp'}</span>
              </a>
              <button
                onClick={handleSellerAccess}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer pt-2"
              >
                {language === 'zh' ? '【商家后台登录】' : '[Seller Portal Login]'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
