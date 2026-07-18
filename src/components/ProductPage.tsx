import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle, Compass, Flame, MessageCircle, Package, ShoppingCart, Snowflake, Truck } from 'lucide-react';
import { Language, Product, ProductCutType, ProductMedia, ProductOption } from '../types';
import { resolveMediaUrl } from '../lib/media';
import { getProductMediaAspectRatio } from '../lib/productMedia';
import { getInitialVariantSelection, getProductConfiguration, getVariantForSelection, getVariantPricePerKg } from '../lib/productOptions';

type CutType = ProductCutType;
const CUSTOM_VARIANT_INQUIRY_ID = 'whatsapp-custom-option';

interface ProductPageProps {
  language: Language;
  product: Product | null;
  relatedProducts: Product[];
  onBackToShop: () => void;
  onProductSelect: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number, weightKg: number, cutType: CutType, variantId?: string) => void;
  orderingPaused?: boolean;
}

const formatPrice = (value: number) => (
  Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)
);

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
  const [selectedValueIds, setSelectedValueIds] = useState<Record<string, string>>({});
  const [isMediaOverrideActive, setIsMediaOverrideActive] = useState(false);

  useEffect(() => {
    if (!product) return;
    const configuration = getProductConfiguration(product);
    const initialSelection = getInitialVariantSelection(configuration.options, configuration.variants);
    const firstVariant = initialSelection.variant;
    setWeightKg(firstVariant?.weightKg ?? product.averageWeightKg);
    setCutType(firstVariant?.cutType ?? 'cleaned');
    setQuantity(1);
    setSelectedMediaId(product.media?.[0]?.id ?? null);
    setSelectedVariantId(firstVariant?.id ?? null);
    setSelectedValueIds(initialSelection.selectedValueIds);
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
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#073c63] px-5 text-sm font-bold text-white transition-colors hover:bg-[#082f4e] cursor-pointer"
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
  const configuration = getProductConfiguration(product);
  const selectedVariant = configuration.variants.find(variant => variant.id === selectedVariantId);
  const selectedPricePerKg = getVariantPricePerKg(product, selectedVariant?.id);
  const calculatedTotalPrice = selectedPricePerKg * weightKg * quantity;
  const mediaItems: ProductMedia[] = product.media?.length
    ? product.media
    : [{ id: 'cover', url: product.image, type: 'image', name: 'Cover image' }];
  const selectedMedia = mediaItems.find(media => media.id === selectedMediaId) || mediaItems[0];
  const hasVariants = configuration.options.length > 0 && configuration.variants.length > 0;
  const isCustomVariantInquiry = selectedVariantId === CUSTOM_VARIANT_INQUIRY_ID;
  const selectedVariantMedia = selectedVariant?.image
    ? { url: selectedVariant.image, type: 'image' as const }
    : null;
  const heroMedia = isMediaOverrideActive ? selectedMedia : selectedVariantMedia || selectedMedia;
  const mediaAspect = getProductMediaAspectRatio(product.mediaAspectRatio);
  const isOriginalMediaRatio = mediaAspect.value === 'original';

  const stockLabel = {
    available: isZh ? '常备现货' : 'Ready stock',
    limited: isZh ? '野生限量' : 'Limited catch',
    seasonal: isZh ? '季节供应' : 'Seasonal catch',
  }[product.stockStatus as 'available' | 'limited' | 'seasonal'] || (isZh ? '暂时售罄' : 'Out of stock');

  const cutOptions: { value: CutType; zh: string; en: string }[] = [
    { value: 'cleaned', zh: '活杀去内脏洗净', en: 'Gutted and cleaned' },
    { value: 'whole', zh: '完整整条', en: 'Whole intact' },
    { value: 'steak', zh: '厚段轮切', en: 'Thick steak cuts' },
    { value: 'sliced', zh: '薄切鱼片', en: 'Thin slices' },
    { value: 'fillet', zh: '去骨鱼片', en: 'Boneless fillet' },
  ];

  const selectedCutLabel = cutOptions.find(option => option.value === cutType);
  const selectedVariantCutLabel = selectedVariant
    ? cutOptions.find(option => option.value === selectedVariant.cutType)
    : null;
  const selectedVariantName = selectedVariant ? (isZh ? selectedVariant.nameZh : selectedVariant.nameEn) : '';
  const isSoldOut = product.stockStatus === 'out_of_stock';
  const canAddToCart = !orderingPaused && !isSoldOut && !isCustomVariantInquiry && (!hasVariants || (Boolean(selectedVariant) && selectedVariant?.isAvailable !== false));
  const whatsappText = encodeURIComponent(
    isCustomVariantInquiry
      ? (isZh
        ? `你好，我想询问 ${name} 的其他规格或特别处理方式。`
        : `Hi, I want to ask about other options or custom processing for ${name}.`)
      : (isZh
        ? `你好，我想订购 ${name}${selectedVariantName ? `（${selectedVariantName}）` : ''}，${weightKg.toFixed(1)}kg，${selectedVariantCutLabel?.zh ?? selectedCutLabel?.zh ?? ''}，数量 ${quantity}。`
        : `Hi, I want to order ${name}${selectedVariantName ? ` (${selectedVariantName})` : ''}, ${weightKg.toFixed(1)}kg, ${selectedVariantCutLabel?.en ?? selectedCutLabel?.en ?? ''}, quantity ${quantity}.`)
  );

  const chooseOptionValue = (option: ProductOption, valueId: string) => {
    if (orderingPaused) return;
    const nextSelectedValueIds = { ...selectedValueIds, [option.id]: valueId };
    const variant = getVariantForSelection(configuration.variants, nextSelectedValueIds, configuration.options);
    setSelectedValueIds(nextSelectedValueIds);
    setSelectedVariantId(variant?.id ?? null);
    if (variant) {
      setWeightKg(variant.weightKg);
      setCutType(variant.cutType);
      setIsMediaOverrideActive(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7f6] pt-[var(--rhs-topbar-height)] text-[#17323d]">
      <section className="border-b border-[#d5e1e2] px-4 py-5 sm:px-6 md:py-8 lg:px-8">
        <div className="mx-auto max-w-[1360px]">
          <nav aria-label={isZh ? '面包屑导航' : 'Breadcrumb'} className="mb-5 flex items-center gap-2 text-sm text-[#61767d]">
            <button onClick={onBackToShop} className="inline-flex min-h-11 items-center gap-2 font-semibold transition-colors hover:text-[#073c63] cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
              <span>{isZh ? '全部产品' : 'All products'}</span>
            </button>
            <span aria-hidden="true" className="text-[#a0b0b4]">/</span>
            <span className="truncate" aria-current="page">{name}</span>
          </nav>

          <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1.16fr)_minmax(390px,0.84fr)] lg:gap-10 xl:gap-14">
            <section aria-label={isZh ? '产品图库' : 'Product gallery'} className="min-w-0">
              <div className="grid min-w-0 gap-3 sm:grid-cols-[76px_minmax(0,1fr)] sm:gap-4">
                {mediaItems.length > 1 && (
                  <div className="order-2 flex gap-3 overflow-x-auto pb-1 sm:order-1 sm:max-h-[760px] sm:flex-col sm:overflow-y-auto sm:pr-1">
                    {mediaItems.map((media, index) => {
                      const isActive = isMediaOverrideActive
                        ? media.id === selectedMedia?.id
                        : !selectedVariantMedia && media.id === selectedMedia?.id;
                      return (
                        <button
                          key={media.id}
                          type="button"
                          onClick={() => {
                            setSelectedMediaId(media.id);
                            setIsMediaOverrideActive(true);
                          }}
                          aria-label={`${isZh ? '查看媒体' : 'View media'} ${index + 1}`}
                          aria-pressed={isActive}
                          className={`relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-all cursor-pointer ${
                            isActive
                              ? 'border-[#0b7fa8] shadow-[0_0_0_2px_rgba(11,127,168,0.12)]'
                              : 'border-transparent ring-1 ring-[#cfdddd] hover:border-[#8ec8d8]'
                          }`}
                        >
                          {media.type === 'video' ? (
                            <>
                              <video src={resolveMediaUrl(media.url)} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                              <span className="absolute inset-x-1 bottom-1 rounded bg-slate-950/75 px-1 py-0.5 text-[9px] font-bold text-white">Video</span>
                            </>
                          ) : (
                            <img src={resolveMediaUrl(media.url)} alt={media.name || name} className="h-full w-full object-cover" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className={`order-1 min-w-0 max-w-full overflow-hidden rounded-2xl border border-[#d5e1e2] bg-[#eaf0ef] shadow-[0_18px_50px_rgba(19,50,61,0.08)] sm:order-2 ${mediaItems.length <= 1 ? 'sm:col-span-2' : ''}`}>
                  <div
                    className={`relative flex w-full items-center justify-center overflow-hidden ${isOriginalMediaRatio ? 'min-h-[320px]' : ''}`}
                    style={mediaAspect.ratio ? { aspectRatio: mediaAspect.ratio } : undefined}
                  >
                    {heroMedia?.type === 'video' ? (
                      <video
                        key={heroMedia.url}
                        src={resolveMediaUrl(heroMedia.url)}
                        className={isOriginalMediaRatio ? 'aspect-video w-full bg-slate-950 object-contain' : 'absolute inset-0 h-full w-full bg-slate-950 object-contain'}
                        controls
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={resolveMediaUrl(heroMedia?.url || product.image)}
                        alt={name}
                        className={`${isOriginalMediaRatio ? 'block h-auto max-h-[820px] w-full object-contain' : 'absolute inset-0 h-full w-full object-contain'} ${orderingPaused ? 'grayscale opacity-70' : ''}`}
                        referrerPolicy="no-referrer"
                      />
                    )}
                    {orderingPaused && <div className="pointer-events-none absolute inset-0 bg-slate-100/25" />}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-[#71868c]">
                {isZh ? '点击缩略图查看更多图片或视频' : 'Select a thumbnail to view more images or video'}
              </p>
            </section>

            <aside className="min-w-0 max-w-full rounded-2xl border border-[#d5e1e2] bg-white p-5 shadow-[0_18px_50px_rgba(19,50,61,0.08)] sm:p-7 lg:sticky lg:top-[calc(var(--rhs-topbar-height)+24px)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#e6f4f1] px-3 py-1 text-xs font-bold text-[#176b62]">{stockLabel}</span>
                <span className="rounded-full border border-[#d5e1e2] px-3 py-1 text-xs font-bold text-[#48636b]">
                  {product.isWild ? (isZh ? '彭亨野生捕捞' : 'Pahang wild catch') : (isZh ? '彭亨河水养殖' : 'River raised')}
                </span>
              </div>

              <p className="mt-5 font-mono text-xs uppercase tracking-[0.14em] text-[#2483a2]">{product.scientificName}</p>
              <h1 className="mt-2 break-words text-3xl font-black leading-tight tracking-[-0.025em] text-slate-950 [overflow-wrap:anywhere] sm:text-4xl">{name}</h1>
              <p className="mt-4 text-base leading-7 text-[#526a72]">{description}</p>

              <div className="mt-6 border-y border-[#dbe5e6] py-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#71868c]">{isZh ? '每公斤价格' : 'Price per kg'}</p>
                    <p className="mt-1 text-3xl font-black tabular-nums text-[#c76a12]">RM {formatPrice(selectedPricePerKg)}</p>
                  </div>
                  <p className="rounded-full bg-[#f0f5f4] px-3 py-1.5 text-xs font-bold text-[#48636b]">
                    {product.averageWeightKg.toFixed(1)}kg {isZh ? '常见重量' : 'average weight'}
                  </p>
                </div>
              </div>

              {orderingPaused && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-800">
                  {isZh ? '产品资料更新中，暂时不能选择规格或下单。' : 'Product details are being updated. Selection and ordering are temporarily paused.'}
                </div>
              )}

              <div className="mt-6 space-y-6">
                {hasVariants ? configuration.options.map(option => {
                  const selectedValue = option.values.find(value => value.id === selectedValueIds[option.id]);
                  return (
                    <fieldset key={option.id}>
                      <legend className="flex w-full items-center justify-between gap-3 text-sm font-bold text-slate-900">
                        <span>{isZh ? option.nameZh : option.nameEn}</span>
                        <span className="font-normal text-[#61767d]">{selectedValue ? (isZh ? selectedValue.nameZh : selectedValue.nameEn) : ''}</span>
                      </legend>
                      <div className="mt-3 flex flex-wrap gap-2.5">
                        {option.values.map(value => {
                          const candidateSelection = { ...selectedValueIds, [option.id]: value.id };
                          const candidateVariant = getVariantForSelection(configuration.variants, candidateSelection, configuration.options);
                          const isAvailable = Boolean(candidateVariant) && candidateVariant?.isAvailable !== false;
                          const isSelected = selectedValueIds[option.id] === value.id;
                          return (
                            <button
                              key={value.id}
                              type="button"
                              onClick={() => chooseOptionValue(option, value.id)}
                              disabled={orderingPaused || !isAvailable}
                              aria-pressed={isSelected}
                              className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                                isSelected
                                  ? 'border-[#0b7fa8] bg-[#eaf6f8] text-[#075c79] shadow-[0_0_0_1px_#0b7fa8]'
                                  : isAvailable
                                    ? 'border-[#cbdadd] bg-white text-[#2c4a54] hover:border-[#70b8cc] cursor-pointer'
                                    : 'border-[#e3e9ea] bg-[#f4f6f6] text-[#a3b0b3] line-through cursor-not-allowed'
                              }`}
                            >
                              {isZh ? value.nameZh : value.nameEn}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                }) : (
                  <>
                    <fieldset>
                      <legend className="flex w-full items-center justify-between text-sm font-bold text-slate-900">
                        <span>{isZh ? '单条估重' : 'Fish weight'}</span>
                        <span className="font-normal text-[#61767d]">{weightKg.toFixed(1)} kg</span>
                      </legend>
                      <div className="mt-3 flex flex-wrap gap-2.5">
                        {[0.8, 1, 1.3, 1.6].map(multiplier => {
                          const value = product.averageWeightKg * multiplier;
                          const isSelected = Math.abs(weightKg - value) < 0.001;
                          return (
                            <button
                              key={multiplier}
                              type="button"
                              onClick={() => setWeightKg(value)}
                              disabled={orderingPaused}
                              aria-pressed={isSelected}
                              className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-bold transition-all cursor-pointer ${
                                isSelected ? 'border-[#0b7fa8] bg-[#eaf6f8] text-[#075c79] shadow-[0_0_0_1px_#0b7fa8]' : 'border-[#cbdadd] text-[#2c4a54] hover:border-[#70b8cc]'
                              }`}
                            >
                              {value.toFixed(1)} kg
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend className="flex w-full items-center justify-between text-sm font-bold text-slate-900">
                        <span>{isZh ? '清洗及刀工' : 'Processing style'}</span>
                        <span className="font-normal text-[#61767d]">{isZh ? selectedCutLabel?.zh : selectedCutLabel?.en}</span>
                      </legend>
                      <div className="mt-3 flex flex-wrap gap-2.5">
                        {cutOptions.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setCutType(option.value)}
                            disabled={orderingPaused}
                            aria-pressed={cutType === option.value}
                            className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-bold transition-all cursor-pointer ${
                              cutType === option.value ? 'border-[#0b7fa8] bg-[#eaf6f8] text-[#075c79] shadow-[0_0_0_1px_#0b7fa8]' : 'border-[#cbdadd] text-[#2c4a54] hover:border-[#70b8cc]'
                            }`}
                          >
                            {isZh ? option.zh : option.en}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  </>
                )}

                {hasVariants && (
                  <button
                    type="button"
                    onClick={() => !orderingPaused && setSelectedVariantId(CUSTOM_VARIANT_INQUIRY_ID)}
                    disabled={orderingPaused}
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-emerald-700 transition-colors hover:text-emerald-600 cursor-pointer disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{isZh ? '需要其他规格或特别处理？联系我们' : 'Need another size or custom processing?'}</span>
                  </button>
                )}

                <div className="flex items-end justify-between gap-4 border-t border-[#dbe5e6] pt-5">
                  <div>
                    <span className="block text-sm font-bold text-slate-900">{isZh ? '数量' : 'Quantity'}</span>
                    <div className="mt-2 inline-flex h-12 items-center overflow-hidden rounded-xl border border-[#cbdadd] bg-white">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={orderingPaused} aria-label={isZh ? '减少数量' : 'Decrease quantity'} className="h-12 w-12 text-lg font-bold text-[#526a72] hover:bg-[#f0f5f4] cursor-pointer disabled:cursor-not-allowed disabled:text-slate-300">−</button>
                      <span className="w-12 text-center text-base font-black tabular-nums text-slate-950">{quantity}</span>
                      <button onClick={() => setQuantity(quantity + 1)} disabled={orderingPaused} aria-label={isZh ? '增加数量' : 'Increase quantity'} className="h-12 w-12 text-lg font-bold text-[#526a72] hover:bg-[#f0f5f4] cursor-pointer disabled:cursor-not-allowed disabled:text-slate-300">+</button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#71868c]">{isZh ? '预估小计' : 'Estimated subtotal'}</p>
                    <p className="mt-1 text-2xl font-black tabular-nums text-slate-950">
                      {isCustomVariantInquiry ? (isZh ? '客服确认' : 'Ask us') : `RM ${formatPrice(calculatedTotalPrice)}`}
                    </p>
                    {!isCustomVariantInquiry && <p className="mt-1 text-xs text-[#71868c]">{weightKg.toFixed(1)}kg × {quantity}</p>}
                  </div>
                </div>

                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => canAddToCart && onAddToCart(product, quantity, weightKg, cutType, selectedVariant?.id)}
                    disabled={!canAddToCart}
                    className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-base font-extrabold transition-colors ${
                      canAddToCart ? 'bg-[#073c63] text-white shadow-[0_10px_24px_rgba(7,60,99,0.2)] hover:bg-[#082f4e] cursor-pointer' : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>{orderingPaused ? (isZh ? '维护中暂不可下单' : 'Ordering paused') : isSoldOut ? (isZh ? '暂时售罄' : 'Sold out') : isCustomVariantInquiry ? (isZh ? '请用 WhatsApp 询问' : 'Ask on WhatsApp') : selectedVariant?.isAvailable === false ? (isZh ? '此规格暂不可售' : 'Variant unavailable') : (isZh ? '加入购物车' : 'Add to cart')}</span>
                  </button>
                  <a
                    href={orderingPaused ? undefined : `https://wa.me/60187682528?text=${whatsappText}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={orderingPaused}
                    tabIndex={orderingPaused ? -1 : 0}
                    className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-5 text-base font-extrabold transition-colors ${
                      orderingPaused ? 'pointer-events-none border-slate-200 bg-slate-100 text-slate-400' : 'border-emerald-500 bg-white text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span>{isCustomVariantInquiry ? (isZh ? 'WhatsApp 询问规格' : 'Ask on WhatsApp') : (isZh ? 'WhatsApp 直接订购' : 'Order on WhatsApp')}</span>
                  </a>
                </div>
              </div>

              <div className="mt-7 divide-y divide-[#dbe5e6] border-y border-[#dbe5e6]">
                <details className="group py-4" open>
                  <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900 marker:content-none">
                    <span>{isZh ? '风味与肉质' : 'Flavor and texture'}</span>
                    <span className="text-xl font-normal text-[#71868c] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <div className="mt-3 flex gap-3 text-sm leading-6 text-[#526a72]"><Flame className="mt-1 h-4 w-4 shrink-0 text-amber-600" /><p>{tastingNotes}</p></div>
                </details>
                <details className="group py-4">
                  <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900 marker:content-none">
                    <span>{isZh ? '推荐煮法' : 'Recommended cooking'}</span>
                    <span className="text-xl font-normal text-[#71868c] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cookingSuggestions.map(suggestion => <span key={suggestion} className="inline-flex items-center gap-1.5 rounded-full bg-[#eef5f4] px-3 py-1.5 text-sm font-semibold text-[#35545e]"><Compass className="h-3.5 w-3.5 text-sky-700" />{suggestion}</span>)}
                  </div>
                </details>
                <details className="group py-4">
                  <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900 marker:content-none">
                    <span>{isZh ? '处理与品质' : 'Processing and quality'}</span>
                    <span className="text-xl font-normal text-[#71868c] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <div className="mt-3 space-y-2.5">
                    {features.map(feature => <div key={feature} className="flex items-start gap-2.5 text-sm leading-6 text-[#526a72]"><CheckCircle className="mt-1 h-4 w-4 shrink-0 text-emerald-600" /><span>{feature}</span></div>)}
                  </div>
                </details>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="flex gap-3"><Truck className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" /><div><strong className="block text-sm text-slate-900">{isZh ? '全马冷链' : 'Cold-chain delivery'}</strong><span className="mt-1 block text-xs leading-5 text-[#71868c]">{isZh ? '冰冻状态配送到家' : 'Delivered frozen to your door'}</span></div></div>
                <div className="flex gap-3"><Snowflake className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" /><div><strong className="block text-sm text-slate-900">{isZh ? '急速锁鲜' : 'Flash frozen'}</strong><span className="mt-1 block text-xs leading-5 text-[#71868c]">{isZh ? '处理后立即真空冷冻' : 'Vacuum packed after processing'}</span></div></div>
                <div className="flex gap-3"><Package className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" /><div><strong className="block text-sm text-slate-900">{isZh ? '按需处理' : 'Prepared your way'}</strong><span className="mt-1 block text-xs leading-5 text-[#71868c]">{isZh ? '依所选规格切洗包装' : 'Cut and packed to your selection'}</span></div></div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="bg-[#e7efee] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="mx-auto max-w-[1360px]">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2483a2]">{isZh ? '更多河鲜' : 'More river fish'}</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.02em] text-slate-950 md:text-3xl">{isZh ? '您可能也喜欢' : 'You may also like'}</h2>
              </div>
              <button onClick={onBackToShop} className="hidden min-h-11 items-center rounded-xl border border-[#c4d5d9] bg-white px-4 text-sm font-bold text-[#17323d] hover:bg-[#f4f8f7] cursor-pointer sm:inline-flex">{isZh ? '查看全部' : 'View all'}</button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map(relatedProduct => (
                <button
                  key={relatedProduct.id}
                  type="button"
                  onClick={() => !orderingPaused && onProductSelect(relatedProduct)}
                  disabled={orderingPaused}
                  className={`group overflow-hidden rounded-2xl border text-left transition-all ${orderingPaused ? 'border-slate-200 bg-slate-100 opacity-75 cursor-not-allowed' : 'border-[#d1dfe1] bg-white hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-xl cursor-pointer'}`}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#eaf0ef]">
                    <img src={resolveMediaUrl(relatedProduct.image)} alt={isZh ? relatedProduct.nameZh : relatedProduct.nameEn} className={`h-full w-full object-contain transition-transform duration-500 ${orderingPaused ? 'grayscale opacity-60' : 'group-hover:scale-[1.03]'}`} referrerPolicy="no-referrer" />
                  </div>
                  <div className="p-5">
                    <p className="font-mono text-xs uppercase tracking-[0.08em] text-sky-700">{relatedProduct.scientificName}</p>
                    <h3 className="mt-2 text-xl font-extrabold text-slate-950">{isZh ? relatedProduct.nameZh : relatedProduct.nameEn}</h3>
                    <p className="mt-3 text-base font-black text-[#c76a12]">RM {formatPrice(relatedProduct.pricePerKg)} <span className="text-sm font-semibold text-[#71868c]">/ kg</span></p>
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
