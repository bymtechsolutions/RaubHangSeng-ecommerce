import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle, Compass, Flame, MessageCircle, Package, ShoppingCart, Snowflake, Truck } from 'lucide-react';
import { Language, Product, ProductCutType, ProductMedia } from '../types';
import { resolveMediaUrl } from '../lib/media';

type CutType = ProductCutType;
const CUSTOM_VARIANT_INQUIRY_ID = 'whatsapp-custom-option';

interface ProductPageProps {
  language: Language;
  product: Product | null;
  relatedProducts: Product[];
  onBackToShop: () => void;
  onProductSelect: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number, weightKg: number, cutType: CutType) => void;
  orderingPaused?: boolean;
}

export default function ProductPage({
  language,
  product,
  relatedProducts,
  onBackToShop,
  onProductSelect,
  onAddToCart,
  orderingPaused = false,
}: ProductPageProps) {
  const isZh = language === 'zh';
  const [weightKg, setWeightKg] = useState(product?.averageWeightKg ?? 1);
  const [cutType, setCutType] = useState<CutType>('cleaned');
  const [quantity, setQuantity] = useState(1);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isMediaOverrideActive, setIsMediaOverrideActive] = useState(false);

  useEffect(() => {
    if (!product) return;
    const firstVariant = product.variants?.[0];
    setWeightKg(firstVariant?.weightKg ?? product.averageWeightKg);
    setCutType(firstVariant?.cutType ?? 'cleaned');
    setQuantity(1);
    setSelectedMediaId(product.media?.[0]?.id ?? null);
    setSelectedVariantId(firstVariant?.id ?? null);
    setIsMediaOverrideActive(false);
  }, [product]);

  if (!product) {
    return (
      <main className="min-h-screen pt-[96px] md:pt-[116px] pb-20 px-4 rhs-section-alt">
        <div className="max-w-xl mx-auto rhs-panel border rounded-2xl p-8 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-slate-950">
            {isZh ? '找不到这个产品' : 'Product Not Found'}
          </h1>
          <p className="mt-3 text-sm text-[#536c74]">
            {isZh ? '这个河鱼页面不存在，或产品已经下架。' : 'This fish page does not exist, or the product has been removed.'}
          </p>
          <button
            onClick={onBackToShop}
            className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#073c63] hover:bg-[#082f4e] text-white font-bold text-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isZh ? '返回产品系列' : 'Back to Shop'}</span>
          </button>
        </div>
      </main>
    );
  }

  const name = isZh ? product.nameZh : product.nameEn;
  const description = isZh ? product.descriptionZh : product.descriptionEn;
  const tastingNotes = isZh ? product.tastingNotesZh : product.tastingNotesEn;
  const cookingSuggestions = isZh ? product.cookingSuggestionsZh : product.cookingSuggestionsEn;
  const features = isZh ? product.featuresZh : product.featuresEn;
  const calculatedTotalPrice = product.pricePerKg * weightKg * quantity;
  const mediaItems: ProductMedia[] = product.media?.length
    ? product.media
    : product.image
      ? [{ id: 'cover', url: product.image, type: 'image', name: 'Cover image' }]
      : [];
  const selectedMedia = mediaItems.find((media) => media.id === selectedMediaId) || mediaItems[0];
  const hasVariants = Boolean(product.variants?.length);
  const selectedVariant = product.variants?.find((variant) => variant.id === selectedVariantId);
  const isCustomVariantInquiry = selectedVariantId === CUSTOM_VARIANT_INQUIRY_ID;
  const selectedVariantMedia = selectedVariant?.image
    ? { url: selectedVariant.image, type: 'image' as const }
    : null;
  const heroMedia = isMediaOverrideActive
    ? selectedMedia
    : selectedVariantMedia || selectedMedia;

  const stockLabel = {
    available: isZh ? '常备现货' : 'Ready Stock',
    limited: isZh ? '野生限量' : 'Limited Catch',
    seasonal: isZh ? '季节供应' : 'Seasonal Catch',
  }[product.stockStatus as 'available' | 'limited' | 'seasonal'] || (isZh ? '暂时售罄' : 'Out of Stock');

  const cutOptions: { value: CutType; zh: string; en: string }[] = [
    { value: 'cleaned', zh: '活杀去内脏洗净', en: 'Gutted and cleaned' },
    { value: 'whole', zh: '完整整条', en: 'Whole intact' },
    { value: 'steak', zh: '厚段轮切', en: 'Thick steak cuts' },
    { value: 'sliced', zh: '薄切鱼片', en: 'Thin slices' },
    { value: 'fillet', zh: '去骨鱼片', en: 'Boneless fillet' },
  ];

  const selectedCutLabel = cutOptions.find((option) => option.value === cutType);
  const selectedVariantCutLabel = selectedVariant
    ? cutOptions.find((option) => option.value === selectedVariant.cutType)
    : null;
  const selectedVariantName = selectedVariant
    ? (isZh ? selectedVariant.nameZh : selectedVariant.nameEn)
    : '';
  const canAddToCart = !orderingPaused && !isCustomVariantInquiry && (!hasVariants || Boolean(selectedVariant));
  const whatsappText = encodeURIComponent(
    isCustomVariantInquiry
      ? (isZh
        ? `你好，我想询问 ${name} 的其他规格或特别处理方式。`
        : `Hi, I want to ask about other options or custom processing for ${name}.`)
      : (isZh
        ? `你好，我想订购 ${name}${selectedVariantName ? `（${selectedVariantName}）` : ''}，${weightKg.toFixed(1)}kg，${selectedVariantCutLabel?.zh ?? selectedCutLabel?.zh ?? ''}，数量 ${quantity}。`
        : `Hi, I want to order ${name}${selectedVariantName ? ` (${selectedVariantName})` : ''}, ${weightKg.toFixed(1)}kg, ${selectedVariantCutLabel?.en ?? selectedCutLabel?.en ?? ''}, quantity ${quantity}.`)
  );

  return (
    <main className="min-h-screen pt-[var(--rhs-topbar-height)] rhs-section-alt">
      <section className="px-4 sm:px-6 lg:px-8 py-8 md:py-12 border-b border-[#c4d5d9]">
        <div className="max-w-[1400px] mx-auto">
          <button
            onClick={onBackToShop}
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#0b3854] hover:text-sky-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isZh ? '返回全部河鱼' : 'Back to all fish'}</span>
          </button>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_430px] gap-7 lg:gap-8 items-start">
            <article className="rhs-panel border rounded-2xl overflow-hidden shadow-sm">
              <div className="relative min-h-[320px] md:min-h-[520px] bg-slate-900 overflow-hidden">
                {heroMedia?.type === 'video' ? (
                  <video
                    key={heroMedia.url}
                    src={resolveMediaUrl(heroMedia.url)}
                    className="absolute inset-0 w-full h-full object-contain bg-slate-950 saturate-[0.9]"
                    controls
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={resolveMediaUrl(heroMedia?.url || product.image)}
                    alt={name}
                    className={`absolute inset-0 w-full h-full object-cover saturate-[0.9] ${orderingPaused ? 'grayscale opacity-70' : ''}`}
                    referrerPolicy="no-referrer"
                  />
                )}
                {orderingPaused && (
                  <div className="absolute inset-0 z-10 bg-slate-200/20 pointer-events-none" />
                )}
              </div>

              {mediaItems.length > 1 && (
                <div className="px-5 md:px-8 py-4 border-b border-[#c4d5d9] bg-[#edf5f4]">
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {mediaItems.map((media) => {
                      const isActive = isMediaOverrideActive && media.id === selectedMedia?.id;
                      return (
                        <button
                          key={media.id}
                          onClick={() => {
                            setSelectedMediaId(media.id);
                            setIsMediaOverrideActive(true);
                          }}
                          className={`relative w-24 h-20 shrink-0 rounded-xl overflow-hidden border-2 bg-slate-100 cursor-pointer transition-all ${
                            isActive ? 'border-sky-500 shadow-md' : 'border-white hover:border-sky-300'
                          }`}
                          aria-label={isZh ? '切换产品媒体' : 'Switch product media'}
                        >
                          {media.type === 'video' ? (
                            <>
                              <video src={resolveMediaUrl(media.url)} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                              <span className="absolute bottom-1 left-1 rounded bg-slate-950/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                Video
                              </span>
                            </>
                          ) : (
                            <img src={resolveMediaUrl(media.url)} alt={media.name || name} className="w-full h-full object-cover" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>

            <aside className="lg:sticky lg:top-[110px] rhs-panel border rounded-2xl shadow-lg p-5 md:p-6">
              {orderingPaused && (
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-100 p-3 text-xs font-semibold leading-5 text-slate-600">
                  {isZh
                    ? '产品资料更新中，暂时不能选择规格、加入购物车或下单。维护结束后会恢复订购。'
                    : 'Product details are being updated. Selection, cart, and ordering are paused until maintenance ends.'}
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-[#536c74]">
                    {isZh ? '每公斤价格' : 'Price per kg'}
                  </p>
                  <p className="mt-1 text-3xl font-black text-amber-600 font-mono">
                    RM {product.pricePerKg}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#edf5f4] border border-[#c4d5d9] text-xs font-bold text-[#17323d]">
                  {product.averageWeightKg.toFixed(1)}kg {isZh ? '常见规格' : 'avg'}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {product.variants && product.variants.length > 0 && (
                  <div>
                    <span className="block text-xs font-bold text-[#536c74] mb-2">
                      {isZh ? '选择规格' : 'Choose variant'}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((variant) => {
                        const isActive = variant.id === selectedVariantId;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            title={isZh ? variant.nameZh : variant.nameEn}
                            onClick={() => {
                              if (orderingPaused) return;
                              setSelectedVariantId(variant.id);
                              setWeightKg(variant.weightKg);
                              setCutType(variant.cutType);
                              setIsMediaOverrideActive(false);
                            }}
                            disabled={orderingPaused}
                            className={`inline-flex min-h-10 items-center justify-center rounded-full border px-4 py-2 text-sm font-extrabold transition-all cursor-pointer ${
                              orderingPaused
                                ? 'border-slate-200 bg-slate-100 opacity-70 cursor-not-allowed'
                                : isActive ? 'border-sky-500 bg-sky-50 shadow-sm' : 'border-[#c4d5d9] bg-[#edf5f4] hover:border-sky-300'
                            }`}
                          >
                            {variant.weightKg.toFixed(1)}kg
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          if (orderingPaused) return;
                          setSelectedVariantId(CUSTOM_VARIANT_INQUIRY_ID);
                        }}
                        disabled={orderingPaused}
                        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-extrabold transition-all cursor-pointer ${
                          orderingPaused
                            ? 'border-slate-200 bg-slate-100 opacity-70 cursor-not-allowed'
                            : isCustomVariantInquiry ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-[#c4d5d9] bg-[#edf5f4] hover:border-emerald-300'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>{isZh ? 'WhatsApp' : 'Contact WhatsApp'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {hasVariants ? (
                  <div className="rounded-xl border border-[#c4d5d9] bg-[#edf5f4] p-3">
                    <span className="block text-xs font-bold text-[#536c74] mb-2">
                      {isZh ? '已选订购选项' : 'Selected order option'}
                    </span>
                    {isCustomVariantInquiry ? (
                      <div className="flex items-start gap-2 text-sm font-semibold text-emerald-700">
                        <MessageCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{isZh ? '请使用 WhatsApp 询问其他规格或特殊处理。' : 'Use WhatsApp to ask about other options or custom processing.'}</span>
                      </div>
                    ) : selectedVariant ? (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="block text-[#536c74]">{isZh ? '规格' : 'Variant'}</span>
                          <strong className="mt-1 block text-[#17323d]">{selectedVariantName}</strong>
                        </div>
                        <div>
                          <span className="block text-[#536c74]">{isZh ? '重量 / 刀工' : 'Weight / cut'}</span>
                          <strong className="mt-1 block text-[#17323d]">
                            {selectedVariant.weightKg.toFixed(1)}kg · {isZh ? selectedVariantCutLabel?.zh : selectedVariantCutLabel?.en}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-[#536c74]">
                        {isZh ? '请选择一个规格。' : 'Choose a variant.'}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                <label className="block">
                  <span className="block text-xs font-bold text-[#536c74] mb-1.5">
                    {isZh ? '单条估重' : 'Fish weight'}
                  </span>
                  <select
                    value={weightKg}
                    onChange={(event) => setWeightKg(parseFloat(event.target.value))}
                    disabled={orderingPaused}
                    className="w-full bg-[#edf5f4] border border-[#c4d5d9] rounded-xl px-3 py-3 text-sm font-semibold text-[#17323d] focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <option value={product.averageWeightKg * 0.8}>
                      {(product.averageWeightKg * 0.8).toFixed(1)} kg ({isZh ? '小条' : 'Small'})
                    </option>
                    <option value={product.averageWeightKg}>
                      {product.averageWeightKg.toFixed(1)} kg ({isZh ? '标准' : 'Standard'})
                    </option>
                    <option value={product.averageWeightKg * 1.3}>
                      {(product.averageWeightKg * 1.3).toFixed(1)} kg ({isZh ? '大条' : 'Large'})
                    </option>
                    <option value={product.averageWeightKg * 1.6}>
                      {(product.averageWeightKg * 1.6).toFixed(1)} kg ({isZh ? '特大' : 'Extra large'})
                    </option>
                    <option value="whatsapp-custom-weight" disabled>
                      {isZh ? '其他规格请 WhatsApp 客服' : 'Other size? Contact WhatsApp'}
                    </option>
                  </select>
                </label>

                <label className="block">
                  <span className="block text-xs font-bold text-[#536c74] mb-1.5">
                    {isZh ? '清洗及刀工' : 'Processing style'}
                  </span>
                  <select
                    value={cutType}
                    onChange={(event) => setCutType(event.target.value as CutType)}
                    disabled={orderingPaused}
                    className="w-full bg-[#edf5f4] border border-[#c4d5d9] rounded-xl px-3 py-3 text-sm font-semibold text-[#17323d] focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    {cutOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {isZh ? option.zh : option.en}
                      </option>
                    ))}
                    <option value="whatsapp-custom-cut" disabled>
                      {isZh ? '特殊处理请 WhatsApp 客服' : 'Custom cut? Contact WhatsApp'}
                    </option>
                  </select>
                </label>
                  </>
                )}

                <div>
                  <span className="block text-xs font-bold text-[#536c74] mb-1.5">
                    {isZh ? '购买数量' : 'Quantity'}
                  </span>
                  <div className="inline-flex items-center rounded-xl border border-[#c4d5d9] bg-[#edf5f4] overflow-hidden">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={orderingPaused}
                      className="w-11 h-11 text-lg font-bold text-[#536c74] hover:text-[#17323d] hover:bg-[#e3eeee] cursor-pointer disabled:text-slate-300 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-mono font-black text-[#17323d]">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      disabled={orderingPaused}
                      className="w-11 h-11 text-lg font-bold text-[#536c74] hover:text-[#17323d] hover:bg-[#e3eeee] cursor-pointer disabled:text-slate-300 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-[#edf5f4] border border-[#c4d5d9] flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-[#536c74]">
                    {isZh ? '预估总价' : 'Estimated subtotal'}
                  </p>
                  <p className="mt-1 text-3xl font-black text-amber-600 font-mono">
                    {isCustomVariantInquiry ? (isZh ? 'WhatsApp' : 'Ask') : `RM ${calculatedTotalPrice.toFixed(0)}`}
                  </p>
                </div>
                <p className="text-right text-xs leading-5 text-[#536c74]">
                  {isCustomVariantInquiry ? (isZh ? '客服确认' : 'Confirm by chat') : `${weightKg.toFixed(1)}kg x ${quantity}`}
                </p>
              </div>

              <div className="mt-5 grid gap-3">
                <button
                  onClick={() => {
                    if (canAddToCart) {
                      onAddToCart(product, quantity, weightKg, cutType);
                    }
                  }}
                  disabled={!canAddToCart}
                  className={`w-full h-12 rounded-xl font-extrabold inline-flex items-center justify-center gap-2 shadow-md transition-colors ${
                    !canAddToCart
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-[#073c63] hover:bg-[#082f4e] text-white cursor-pointer'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>
                    {orderingPaused
                      ? (isZh ? '维护中暂不可下单' : 'Ordering Paused')
                      : isCustomVariantInquiry
                        ? (isZh ? '请用 WhatsApp 询问' : 'Use WhatsApp to ask')
                        : (isZh ? '加入购物车' : 'Add to Cart')}
                  </span>
                </button>
                <a
                  href={orderingPaused ? undefined : `https://wa.me/60187682528?text=${whatsappText}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={orderingPaused}
                  tabIndex={orderingPaused ? -1 : 0}
                  className={`w-full h-12 rounded-xl font-extrabold inline-flex items-center justify-center gap-2 shadow-md transition-colors ${
                    orderingPaused
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none shadow-none'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-white'
                  }`}
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>
                    {orderingPaused
                      ? (isZh ? '暂不接受 WhatsApp 下单' : 'WhatsApp ordering paused')
                      : isCustomVariantInquiry
                        ? (isZh ? 'WhatsApp 询问规格' : 'Ask on WhatsApp')
                        : (isZh ? 'WhatsApp 直接订购' : 'Order on WhatsApp')}
                  </span>
                </a>
              </div>

              <div className="mt-6 border-t border-[#c4d5d9] pt-6 space-y-6">
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-lg bg-white border border-[#c4d5d9] text-[#073c63] text-[11px] font-bold">
                      {product.isWild ? (isZh ? '彭亨野生捕捞' : 'Pahang Wild Catch') : (isZh ? '彭亨河水养殖' : 'Pahang River Raised')}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-[11px] font-bold">
                      {stockLabel}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-[#bc9655] text-white text-[11px] font-bold">
                      {isZh ? '真空冷冻配送' : 'Vacuum Frozen Delivery'}
                    </span>
                  </div>
                  <p className="text-xs font-mono tracking-wide text-sky-700">
                    {product.scientificName}
                  </p>
                  <h1 className="mt-2 text-2xl md:text-3xl font-black leading-tight text-slate-950">
                    {name}
                  </h1>
                  <p className="mt-3 text-sm leading-7 text-[#425d65]">
                    {description}
                  </p>
                </div>

                <div>
                  <h2 className="text-base font-extrabold text-slate-950">
                    {isZh ? '风味与肉质' : 'Flavor and Texture'}
                  </h2>
                  <div className="mt-3 rhs-panel-soft border rounded-xl p-4 flex gap-3">
                    <Flame className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm leading-7 text-[#425d65]">{tastingNotes}</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-base font-extrabold text-slate-950">
                    {isZh ? '推荐煮法' : 'Recommended Cooking'}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cookingSuggestions.map((suggestion) => (
                      <span
                        key={suggestion}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl rhs-panel-soft border text-xs font-semibold text-[#17323d]"
                      >
                        <Compass className="w-4 h-4 text-sky-600" />
                        {suggestion}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-base font-extrabold text-slate-950">
                    {isZh ? '我们处理到位' : 'Handled for Confidence'}
                  </h2>
                  <div className="mt-3 space-y-2">
                    {features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2 text-sm leading-6 text-[#425d65]">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rhs-panel-soft border rounded-2xl p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-sky-700 shrink-0" />
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-950">
                        {isZh ? '全马冷链配送' : 'Malaysia Cold Chain'}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-[#536c74]">
                        {isZh ? '真空包装后急速冷冻，配送到家仍保持扎实冰冻状态。' : 'Vacuum packed and flash frozen so the fish reaches you firm and chilled.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Snowflake className="w-5 h-5 text-sky-700 shrink-0" />
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-950">
                        {isZh ? '锁鲜处理' : 'Freshness Locked'}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-[#536c74]">
                        {isZh ? '活杀处理，清洗后按您选择的刀工包装。' : 'Processed fresh, cleaned, then packed to your selected cut.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Package className="w-5 h-5 text-sky-700 shrink-0" />
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-950">
                        {isZh ? '适合家庭和餐馆' : 'Home and Restaurant Ready'}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-[#536c74]">
                        {isZh ? '可整条、厚切、薄片或鱼片处理，方便下锅。' : 'Choose whole, steak, sliced, or fillet processing for easier cooking.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 rhs-section">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-950">
                  {isZh ? '也可以看看' : 'You may also like'}
                </h2>
                <p className="mt-2 text-sm text-[#536c74]">
                  {isZh ? '同类河鱼和适合一起比较的选择。' : 'Similar river fish worth comparing before ordering.'}
                </p>
              </div>
              <button
                onClick={onBackToShop}
                className="hidden sm:inline-flex px-4 py-2 rounded-xl border border-[#c4d5d9] bg-[#f4f8f7] hover:bg-[#edf5f4] text-sm font-bold text-[#17323d] cursor-pointer"
              >
                {isZh ? '全部产品' : 'All products'}
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedProducts.map((relatedProduct) => (
                <button
                  key={relatedProduct.id}
                  onClick={() => {
                    if (!orderingPaused) onProductSelect(relatedProduct);
                  }}
                  disabled={orderingPaused}
                  className={`group text-left border rounded-2xl overflow-hidden transition-all ${
                    orderingPaused
                      ? 'bg-slate-100 border-slate-200 opacity-75 cursor-not-allowed'
                      : 'rhs-panel hover:border-sky-300 hover:shadow-lg cursor-pointer'
                  }`}
                >
                  <div className="aspect-[16/10] overflow-hidden bg-slate-100">
                    <img
                      src={resolveMediaUrl(relatedProduct.image)}
                      alt={isZh ? relatedProduct.nameZh : relatedProduct.nameEn}
                      className={`w-full h-full object-cover transition-transform duration-500 ${
                        orderingPaused ? 'grayscale opacity-60' : 'group-hover:scale-105 saturate-[0.88] group-hover:saturate-100'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-mono text-sky-700">{relatedProduct.scientificName}</p>
                    <h3 className="mt-1 text-lg font-extrabold text-slate-950">
                      {isZh ? relatedProduct.nameZh : relatedProduct.nameEn}
                    </h3>
                    <p className="mt-2 text-sm font-black text-amber-600 font-mono">
                      RM {relatedProduct.pricePerKg}/kg
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
