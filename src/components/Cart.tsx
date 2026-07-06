import { X, Trash2, ShoppingBag, Plus, Minus, Info, ShieldAlert, Truck } from 'lucide-react';
import { motion } from 'motion/react';
import { CartItem, Language } from '../types';

interface CartProps {
  cartItems: CartItem[];
  language: Language;
  onClose: () => void;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  shippingState: 'local' | 'outstation';
  setShippingState: (state: 'local' | 'outstation') => void;
  orderingPaused?: boolean;
}

export default function Cart({
  cartItems,
  language,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  shippingState,
  setShippingState,
  orderingPaused = false,
}: CartProps) {
  const isZh = language === 'zh';

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => {
    return acc + item.product.pricePerKg * item.selectedWeightKg * item.quantity;
  }, 0);

  const FREE_SHIPPING_LIMIT = 250;
  const isFreeShipping = subtotal >= FREE_SHIPPING_LIMIT;

  const shippingFee = cartItems.length === 0
    ? 0
    : isFreeShipping
      ? 0
      : shippingState === 'local'
        ? 20
        : 30;

  const total = subtotal + shippingFee;
  const progressToFree = Math.max(0, FREE_SHIPPING_LIMIT - subtotal);
  const progressPercentage = Math.min(100, (subtotal / FREE_SHIPPING_LIMIT) * 100);

  const getCutTypeLabel = (cut: CartItem['cutType']) => {
    switch (cut) {
      case 'cleaned':
        return isZh ? '去内脏洗净 (Cleaned)' : 'Gutted & Cleaned';
      case 'whole':
        return isZh ? '整条完整 (Whole)' : 'Whole Fish';
      case 'steak':
        return isZh ? '连骨段切 (Steak Cuts)' : 'Thick Steaks';
      case 'fillet':
        return isZh ? '无骨起肉 (Fillet)' : 'Boneless Fillet';
      case 'sliced':
        return isZh ? '薄切鱼片 (Sliced)' : 'Thin Slices';
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Cart Drawer Container */}
      <motion.div
        className="relative w-full max-w-md rhs-panel border-l h-full shadow-2xl flex flex-col justify-between z-10 overflow-hidden"
        initial={{ x: '100%', scaleX: 0.94 }}
        animate={{ x: 0, scaleX: 1 }}
        exit={{ x: '100%', scaleX: 0.96 }}
        transition={{ type: 'spring', stiffness: 360, damping: 34 }}
        style={{ transformOrigin: 'right center' }}
      >
        
        {/* Header */}
        <div className="p-4 border-b border-[#c4d5d9] flex items-center justify-between rhs-panel-soft">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-sky-500" />
            <h3 className="text-lg font-bold text-slate-950">
              {isZh ? '我的购物车' : 'My Shopping Cart'}
            </h3>
            <span className="bg-sky-50 text-sky-600 border border-sky-100 text-xs px-2 py-0.5 rounded-full font-bold">
              {cartItems.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-[#edf5f4]">
          {orderingPaused && (
            <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 text-xs font-semibold leading-5 text-slate-600">
              {isZh
                ? '店铺正在更新产品，暂时不能加入购物车或提交订单。您可以查看或清空现有购物车。'
                : 'The catalog is being updated. Adding items and checkout are paused, but you can review or clear your cart.'}
            </div>
          )}
          
          {/* Empty Cart State */}
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-center space-y-4">
              <div className="p-4 bg-[#f8fbfa] rounded-full border border-[#c4d5d9] text-slate-400">
                <ShoppingBag className="w-12 h-12" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                {isZh ? '您的购物车是空的' : 'Your cart is empty'}
              </h4>
              <p className="text-slate-500 text-xs max-w-xs leading-normal">
                {isZh
                  ? '去看看我们新鲜健康的彭亨河鱼，挑一条美味犒劳家人吧！'
                  : 'Browse our selected fresh-frozen river fishes and pick a delicious cut for your table!'}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm rounded-lg transition-colors cursor-pointer"
              >
                {isZh ? '立即逛逛' : 'Shop Now'}
              </button>
            </div>
          ) : (
            <>
              {/* Free Shipping Alert/Progress */}
              <div className="bg-[#f8fbfa] p-3.5 rounded-xl border border-[#c4d5d9] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center">
                    <Truck className="w-3.5 h-3.5 mr-1.5 text-sky-500" />
                    {isZh ? '冷链免运费门槛 (RM 250)' : 'Cold Chain Free Delivery at RM 250'}
                  </span>
                  <span className="font-bold text-sky-600">
                    {isFreeShipping ? (isZh ? '已享免运费！' : 'Free Shipping Achieved!') : `RM ${subtotal.toFixed(0)} / RM 250`}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-sky-400 to-blue-600 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                {!isFreeShipping && (
                  <p className="text-[11px] text-amber-700 leading-normal font-semibold">
                    {isZh
                      ? `✨ 再凑单 RM ${progressToFree.toFixed(0)} 即可省下 RM ${shippingState === 'local' ? '20' : '30'} 运费！`
                      : `✨ Add RM ${progressToFree.toFixed(0)} more to save RM ${shippingState === 'local' ? '20' : '30'} on delivery!`}
                  </p>
                )}
              </div>

              {/* Clear Cart Button */}
              <div className="flex justify-end">
                <button
                  onClick={onClearCart}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isZh ? '清空所有' : 'Clear All'}</span>
                </button>
              </div>

              {/* Cart Items List */}
              <div className="space-y-3">
                {cartItems.map((item, index) => {
                  const itemPrice = item.product.pricePerKg * item.selectedWeightKg;
                  const itemTotal = itemPrice * item.quantity;

                  return (
                    <div
                      key={index}
                      className="flex bg-[#f8fbfa] border border-[#c4d5d9] rounded-xl p-3 gap-3 hover:border-[#a8c1c7] transition-all"
                    >
                      {/* Image */}
                      <img
                        src={item.product.image}
                        alt={isZh ? item.product.nameZh : item.product.nameEn}
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-white border border-slate-150"
                        referrerPolicy="no-referrer"
                      />

                      {/* Info & controls */}
                      <div className="flex-grow flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                              {isZh ? item.product.nameZh : item.product.nameEn}
                            </h4>
                            <button
                              onClick={() => onRemoveItem(index)}
                              className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          {/* Sizing description */}
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {item.selectedWeightKg.toFixed(1)}kg • {getCutTypeLabel(item.cutType)}
                          </p>
                        </div>

                        {/* Price & Incrementor */}
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs font-mono font-bold text-amber-600">
                            RM {itemTotal.toFixed(1)}
                          </span>

                          <div className="flex items-center border border-slate-200 bg-white rounded-lg">
                            <button
                              onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                              disabled={orderingPaused}
                              className="p-1 text-slate-400 hover:text-slate-800 font-bold cursor-pointer disabled:text-slate-300 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-slate-800 font-mono text-[11px] font-bold">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                              disabled={orderingPaused}
                              className="p-1 text-slate-400 hover:text-slate-800 font-bold cursor-pointer disabled:text-slate-300 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Shipping Destination selector */}
              <div className="bg-[#f8fbfa] p-3.5 rounded-xl border border-[#c4d5d9] space-y-2">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                  {isZh ? '选择冷链配送目的地' : 'Select Cold Chain Destination'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShippingState('local')}
                    disabled={orderingPaused}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                      orderingPaused
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : shippingState === 'local'
                        ? 'bg-sky-50 text-sky-600 border-sky-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {isZh ? '雪隆/彭亨 (RM 20)' : 'KL/Selangor/Pahang (RM 20)'}
                  </button>
                  <button
                    onClick={() => setShippingState('outstation')}
                    disabled={orderingPaused}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                      orderingPaused
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : shippingState === 'outstation'
                        ? 'bg-sky-50 text-sky-600 border-sky-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {isZh ? '西马其他外州 (RM 30)' : 'Other Peninsular (RM 30)'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Billing & Checkout */}
        {cartItems.length > 0 && (
          <div className="p-4 rhs-panel-soft border-t border-[#c4d5d9] space-y-4">
            
            {/* Bill Summary */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>{isZh ? '商品小计' : 'Items Subtotal'}</span>
                <span className="font-mono text-slate-700">RM {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{isZh ? '专业保冷箱及冷链运费' : 'Refrigerated Box & Shipping'}</span>
                <span className="font-mono text-slate-700">
                  {shippingFee === 0 ? (
                    <span className="text-emerald-600 font-bold">{isZh ? '免运费' : 'FREE'}</span>
                  ) : (
                    `RM ${shippingFee.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between items-baseline text-slate-950">
                <span className="text-sm font-bold">{isZh ? '应付总额' : 'Total Amount'}</span>
                <span className="text-xl font-black text-amber-600 font-mono">
                  RM {total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Satisfaction / Guarantee guarantee note */}
            <div className="flex items-center space-x-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-[10px] text-emerald-700 leading-normal font-medium">
                {isZh
                  ? '🔒 100% 融化包退换保障：由于是冷链物流配送，任何质量问题免费补发。'
                  : '🔒 100% Melt-Free Guarantee: Transported in special cold-chain. Melted fish replaced free.'}
              </span>
            </div>

            {/* Main Action Check out */}
            <button
              onClick={onCheckout}
              disabled={orderingPaused}
              className={`w-full flex items-center justify-center space-x-2 py-3.5 font-bold rounded-xl transition-all shadow-xs text-sm ${
                orderingPaused
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white cursor-pointer'
              }`}
            >
              <span>{orderingPaused ? (isZh ? '维护中暂不可下单' : 'Checkout Paused') : (isZh ? '填写配送资料，立即下单' : 'Proceed to Checkout')}</span>
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
