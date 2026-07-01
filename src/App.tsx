import { useState, useEffect } from 'react';
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
import { Product, CartItem, Language, DeliveryDetails } from './types';
import { ShoppingBag, Eye, X, ClipboardList, CheckCircle } from 'lucide-react';

export default function App() {
  // Main states
  const [language, setLanguage] = useState<Language>('zh');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [shippingState, setShippingState] = useState<'local' | 'outstation'>('local');

  // Order history
  const [orderHistory, setOrderHistory] = useState<{ id: string; items: CartItem[]; details: DeliveryDetails; total: number; date: string }[]>([]);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [latestOrder, setLatestOrder] = useState<string | null>(null);

  // Initialize cart & order history from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('pahang_river_fish_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart items', e);
      }
    }

    const savedOrders = localStorage.getItem('pahang_river_fish_orders');
    if (savedOrders) {
      try {
        setOrderHistory(JSON.parse(savedOrders));
      } catch (e) {
        console.error('Failed to parse order history', e);
      }
    }
  }, []);

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
  const handleOrderSuccess = (order: { id: string; items: CartItem[]; details: DeliveryDetails; total: number; date: string }) => {
    const updatedHistory = [order, ...orderHistory];
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

  const isFreeShipping = subtotal >= 250;
  const shippingFee = cartItems.length === 0
    ? 0
    : isFreeShipping
      ? 0
      : shippingState === 'local'
        ? 20
        : 30;

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

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 selection:bg-sky-500 selection:text-white font-sans antialiased">
      {/* Premium top Navigation */}
      <Header
        language={language}
        setLanguage={setLanguage}
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
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
        onProductClick={(prod) => setSelectedProduct(prod)}
        onAddToCart={handleAddToCart}
      />

      {/* Interactive Postcode checker */}
      <DeliveryChecker language={language} />

      {/* Customer Testimonials reviews */}
      <Reviews language={language} />

      {/* Frequently Asked Questions + Location map + inquiry form */}
      <ContactUs language={language} />

      {/* Professional structured Footer */}
      <Footer language={language} />

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
    </div>
  );
}
