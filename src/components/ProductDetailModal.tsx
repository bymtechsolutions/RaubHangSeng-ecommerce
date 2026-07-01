import { X, CheckCircle, Flame, Compass, Snowflake, Info, ShoppingCart } from 'lucide-react';
import { Product, Language } from '../types';
import { useState } from 'react';

interface ProductDetailModalProps {
  product: Product;
  language: Language;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, weightKg: number, cutType: 'whole' | 'cleaned' | 'sliced' | 'steak' | 'fillet') => void;
}

export default function ProductDetailModal({ product, language, onClose, onAddToCart }: ProductDetailModalProps) {
  const isZh = language === 'zh';

  // Modal local settings
  const [weightKg, setWeightKg] = useState(product.averageWeightKg);
  const [cutType, setCutType] = useState<'whole' | 'cleaned' | 'sliced' | 'steak' | 'fillet'>('cleaned');
  const [quantity, setQuantity] = useState(1);

  const calculatedTotalPrice = product.pricePerKg * weightKg * quantity;

  const handleAdd = () => {
    onAddToCart(product, quantity, weightKg, cutType);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl z-10 my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-850 border border-slate-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12">
          
          {/* Left Column: Image with overlays */}
          <div className="relative md:col-span-5 aspect-[4/3] md:aspect-auto md:h-full min-h-[300px] bg-slate-100">
            <img
              src={product.image}
              alt={isZh ? product.nameZh : product.nameEn}
              className="w-full h-full object-cover saturate-[0.9]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-100 via-transparent to-transparent opacity-90 md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-slate-100/60" />

            {/* Float badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <span className="px-3 py-1 bg-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-md shadow-md">
                {product.isWild ? (isZh ? '彭亨野生' : 'Pahang Wild') : (isZh ? '优质饲养' : 'Pahang Raised')}
              </span>
              <span className="px-3 py-1 bg-white text-sky-600 border border-sky-200 font-bold text-xs rounded-md shadow-md">
                {isZh ? '真空锁鲜' : 'Vacuum Sealed'}
              </span>
            </div>
          </div>

          {/* Right Column: Detailed info */}
          <div className="p-6 md:p-8 md:col-span-7 flex flex-col justify-between space-y-6 max-h-[85vh] overflow-y-auto bg-white">
            
            {/* Title block */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold tracking-widest text-sky-600 uppercase">
                {product.scientificName}
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900">
                {isZh ? product.nameZh : product.nameEn}
              </h2>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-amber-600 font-mono">RM {product.pricePerKg}</span>
                <span className="text-sm text-slate-500">/ kg</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-600 leading-relaxed">
              {isZh ? product.descriptionZh : product.descriptionEn}
            </p>

            {/* Tasting Notes */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 font-mono flex items-center">
                <Flame className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                {isZh ? '风味特征 & 肉质' : 'Flavor Profile & Texture'}
              </span>
              <p className="text-xs text-slate-600">
                {isZh ? product.tastingNotesZh : product.tastingNotesEn}
              </p>
            </div>

            {/* Cooking suggestions */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-600 flex items-center">
                <Compass className="w-4 h-4 mr-1.5 text-sky-600" />
                {isZh ? '推荐烹饪法' : 'Chef’s Recommendations'}
              </h4>
              <div className="flex flex-wrap gap-2">
                {(isZh ? product.cookingSuggestionsZh : product.cookingSuggestionsEn).map((style, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    {style}
                  </span>
                ))}
              </div>
            </div>

            {/* Guarantees / Features list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {(isZh ? product.featuresZh : product.featuresEn).map((feat, idx) => (
                <div key={idx} className="flex items-center space-x-2 text-xs text-slate-700">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* Configuration selection parameters */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Weight selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">
                    {isZh ? '单条估重' : 'Single Fish Weight'}
                  </label>
                  <select
                    value={weightKg}
                    onChange={(e) => setWeightKg(parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 font-mono text-slate-850 text-xs focus:outline-none focus:border-sky-500 cursor-pointer focus:ring-1 focus:ring-sky-500"
                  >
                    <option value={product.averageWeightKg * 0.8}>
                      {(product.averageWeightKg * 0.8).toFixed(1)} kg ({isZh ? '小' : 'Small'})
                    </option>
                    <option value={product.averageWeightKg}>
                      {product.averageWeightKg.toFixed(1)} kg ({isZh ? '标准' : 'Standard'})
                    </option>
                    <option value={product.averageWeightKg * 1.3}>
                      {(product.averageWeightKg * 1.3).toFixed(1)} kg ({isZh ? '肥美大条' : 'Large'})
                    </option>
                    <option value={product.averageWeightKg * 1.6}>
                      {(product.averageWeightKg * 1.6).toFixed(1)} kg ({isZh ? '极品特大' : 'Extra Large'})
                    </option>
                  </select>
                </div>

                {/* Cut Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">
                    {isZh ? '清洗及刀工' : 'Processing Style'}
                  </label>
                  <select
                    value={cutType}
                    onChange={(e) => setCutType(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-850 text-xs focus:outline-none focus:border-sky-500 cursor-pointer focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="cleaned">{isZh ? '活杀去鳃去肚 (Cleaned)' : 'Gutted & Scaled'}</option>
                    <option value="whole">{isZh ? '完整整条 (Whole Fish)' : 'Whole intact'}</option>
                    <option value="steak">{isZh ? '切大厚片 (Steak Cut)' : 'Thick Steaks'}</option>
                    <option value="fillet">{isZh ? '无刺纯鱼片 (Fillet Cut)' : 'Boneless Fillet'}</option>
                  </select>
                </div>
              </div>

              {/* Quantity counter */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 block uppercase tracking-wide">
                    {isZh ? '购买数量' : 'Quantity'}
                  </span>
                  <div className="flex items-center border border-slate-200 bg-white rounded-lg mt-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-1.5 text-slate-500 hover:text-slate-800 font-bold cursor-pointer text-xs"
                    >
                      -
                    </button>
                    <span className="px-3 text-slate-800 font-mono font-bold text-xs">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-1.5 text-slate-500 hover:text-slate-800 font-bold cursor-pointer text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Price feedback */}
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                    {isZh ? '预估总价' : 'Estimated Subtotal'}
                  </span>
                  <span className="text-2xl font-black text-amber-600 font-mono">
                    RM {calculatedTotalPrice.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Add to Cart Drawer */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 font-semibold text-xs md:text-sm cursor-pointer transition-colors"
              >
                {isZh ? '返回选购' : 'Cancel'}
              </button>
              <button
                onClick={handleAdd}
                className="w-2/3 flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-bold text-xs md:text-sm cursor-pointer transition-all shadow-lg active:scale-95 shadow-xs"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{isZh ? '加入购物车' : 'Add To Cart'}</span>
                <span className="font-mono bg-sky-950/20 px-2 py-0.5 rounded text-[10px] ml-1">
                  RM {calculatedTotalPrice.toFixed(0)}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
