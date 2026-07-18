import { useState, useMemo, useEffect } from 'react';
import { Search, SlidersHorizontal, Eye, ShoppingCart, HelpCircle, AlertCircle } from 'lucide-react';
import { CollectionDisplay, Product, Language, ProductCategory } from '../types';
import { PRODUCTS } from '../data/products';
import { DEFAULT_COLLECTIONS } from '../data/collections';
import { resolveMediaUrl } from '../lib/media';
import { getInitialVariantSelection, getProductConfiguration, getVariantForSelection, getVariantPricePerKg } from '../lib/productOptions';

interface ProductsProps {
  language: Language;
  products?: Product[];
  collections?: CollectionDisplay[];
  initialCategory?: CategoryFilter;
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number, weightKg: number, cutType: 'whole' | 'cleaned' | 'sliced' | 'steak' | 'fillet', variantId?: string) => void;
  orderingPaused?: boolean;
}

type CategoryFilter = 'all' | ProductCategory;

export default function Products({ language, products = PRODUCTS, collections = DEFAULT_COLLECTIONS, initialCategory = 'all', onProductClick, onAddToCart, orderingPaused = false }: ProductsProps) {
  const isZh = language === 'zh';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>(initialCategory);
  const [sortBy, setSortBy] = useState<'default' | 'priceAsc' | 'priceDesc'>('default');

  // Local states to track selected weight & cut types for each card before adding to cart
  const [cardSelections, setCardSelections] = useState<Record<string, {
    selectedVariantId: string | null;
    selectedValueIds: Record<string, string>;
    weightKg: number;
    cutType: 'whole' | 'cleaned' | 'sliced' | 'steak' | 'fillet';
    quantity: number;
  }>>({});

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  const fallbackCategories = [
    { id: 'all', zh: '全部河鱼', en: 'All River Fish' },
    { id: 'premium', zh: '尊贵极品', en: 'Premium Imperial' },
    { id: 'wild', zh: '纯野生捕捞', en: '100% Wild Caught' },
    { id: 'aquaculture', zh: '清泉网箱养殖', en: 'Cage Aquaculture' },
    { id: 'wellness', zh: '养生调理', en: 'Health & Wellness' },
  ];

  useEffect(() => {
    if (selectedCategory !== 'all' && !collections.some(collection => collection.id === selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [collections, selectedCategory]);

  const categories = useMemo(() => {
    if (collections.length === 0) return fallbackCategories;

    return [
      fallbackCategories[0],
      ...collections.map(collection => ({
        id: collection.id,
        zh: collection.titleZh,
        en: collection.titleEn,
      })),
    ];
  }, [collections, fallbackCategories]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: products.length,
    };

    collections.forEach(collection => {
      counts[collection.id] = 0;
    });

    products.forEach((product) => {
      counts[product.category] = (counts[product.category] || 0) + 1;
    });

    return counts;
  }, [collections, products]);

  // Initialize selection settings for a product card if not set yet
  const getCardSelection = (product: Product) => {
    const configuration = getProductConfiguration(product);
    const initialSelection = getInitialVariantSelection(configuration.options, configuration.variants);
    const firstVariant = initialSelection.variant;

    return cardSelections[product.id] || {
      selectedVariantId: firstVariant?.id ?? null,
      selectedValueIds: initialSelection.selectedValueIds,
      weightKg: firstVariant?.weightKg ?? product.averageWeightKg,
      cutType: firstVariant?.cutType ?? 'cleaned',
      quantity: 1,
    };
  };

  const updateCardSelection = (productId: string, updates: Partial<typeof cardSelections[string]>) => {
    setCardSelections(prev => ({
      ...prev,
      [productId]: {
        ...getCardSelection(products.find(p => p.id === productId)!),
        ...updates,
      }
    }));
  };

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by Category
    if (selectedCategory !== 'all') {
      result = result.filter(product => product.category === selectedCategory);
    }

    // Filter by Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.nameZh.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.scientificName.toLowerCase().includes(q) ||
          p.descriptionZh.toLowerCase().includes(q) ||
          p.descriptionEn.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortBy === 'priceAsc') {
      result.sort((a, b) => a.pricePerKg - b.pricePerKg);
    } else if (sortBy === 'priceDesc') {
      result.sort((a, b) => b.pricePerKg - a.pricePerKg);
    }

    return result;
  }, [products, selectedCategory, searchQuery, sortBy]);

  const getStockStatusLabel = (status: Product['stockStatus']) => {
    switch (status) {
      case 'available':
        return {
          zh: '常备现货',
          en: 'Ready Stock',
          class: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'limited':
        return {
          zh: '野生限量',
          en: 'Limited Catch',
          class: 'bg-amber-50 text-amber-700 border-amber-200'
        };
      case 'seasonal':
        return {
          zh: '季节稀缺',
          en: 'Seasonal Only',
          class: 'bg-red-50 text-red-600 border-red-200'
        };
      case 'out_of_stock':
        return {
          zh: '暂时售罄',
          en: 'Out of Stock',
          class: 'bg-slate-100 text-slate-500 border-slate-200'
        };
    }
  };

  return (
    <section id="products" className="py-12 md:py-16 rhs-section-alt border-t border-[#c4d5d9]">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="space-y-3 max-w-3xl mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-sky-600">
            {isZh ? '天然彭亨河鲜网店' : 'Pahang Premium River Delicacies'}
          </h2>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isZh ? '严选彭亨上品河鱼' : 'Browse Our Selected Fresh River Catch'}
          </p>
          <div className="h-1.5 w-16 bg-gradient-to-r from-sky-500 to-blue-600 rounded-full" />
          <p className="text-[#536c74] text-sm md:text-base">
            {isZh
              ? '我们的河鱼起捕后一律由特聘老师傅即时活杀处理，剔除腥源。真空密封锁鲜，在最短的时间内送达您的府上。'
              : 'Each fish is scaled, gutted and vacuum sealed within minutes of capture, retaining its pure sweetness and premium texture.'}
          </p>
        </div>

        {/* Catalog Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
          <aside className="rhs-panel border rounded-2xl p-4 md:p-5 shadow-sm space-y-6 lg:sticky lg:top-[calc(var(--rhs-topbar-height)+24px)]">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isZh ? '筛选商品' : 'Filter Products'}
              </h3>
              <p className="text-xs text-[#536c74] mt-1">
                {isZh ? `${filteredProducts.length} 个商品` : `${filteredProducts.length} products`}
              </p>
            </div>
          
            {/* Search Box */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isZh ? '搜索河鱼、巴丁、苏丹鱼...' : 'Search fish, patin, sultan...'}
                className="w-full bg-[#edf5f4] border border-[#c4d5d9] focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-500 transition-colors focus:outline-none"
              />
            </div>

            {/* Sorters and Settings */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isZh ? '排序' : 'Sort By'}</span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-[#edf5f4] border border-[#c4d5d9] rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-sky-500 transition-colors"
              >
                <option value="default">{isZh ? '默认推荐' : 'Recommended'}</option>
                <option value="priceAsc">{isZh ? '价格：从低到高' : 'Price: Low to High'}</option>
                <option value="priceDesc">{isZh ? '价格：从高到低' : 'Price: High to Low'}</option>
              </select>
            </div>

            {/* Categories Tab Bar */}
            <div className="space-y-2 border-t border-[#d6e3e5] pt-5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as CategoryFilter)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all border cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white border-transparent shadow-md'
                      : 'bg-[#f4f8f7] text-slate-600 border-[#c4d5d9] hover:text-sky-600 hover:border-sky-300'
                  }`}
                >
                  <span>{isZh ? cat.zh : cat.en}</span>
                  <span className={`text-[11px] font-mono ${selectedCategory === cat.id ? 'text-white/85' : 'text-slate-400'}`}>
                    {categoryCounts[cat.id as CategoryFilter]}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
              <div>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-900">
                  {selectedCategory === 'all'
                    ? (isZh ? '全部商品' : 'All Products')
                    : (isZh
                      ? categories.find((cat) => cat.id === selectedCategory)?.zh
                      : categories.find((cat) => cat.id === selectedCategory)?.en)}
                </h3>
                <p className="text-xs text-[#536c74] mt-1">
                  {isZh
                    ? `显示 ${filteredProducts.length} / ${products.length} 个商品`
                    : `Showing ${filteredProducts.length} of ${products.length} products`}
                </p>
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 rhs-panel border border-dashed rounded-3xl p-8">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-800">{isZh ? '没有找到相关河鱼' : 'No Fish Matches Found'}</h3>
                <p className="text-slate-500 text-sm mt-1">
                  {isZh ? '建议您换一个搜索关键词或切换品类。' : 'Try adjusting your search criteria or selecting another category.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const configuration = getProductConfiguration(product);
              const selection = getCardSelection(product);
              const hasVariants = configuration.options.length > 0 && configuration.variants.length > 0;
              const selectedVariant = configuration.variants.find(variant => variant.id === selection.selectedVariantId)
                || configuration.variants[0];
              const status = getStockStatusLabel(product.stockStatus);
              const selectedPricePerKg = getVariantPricePerKg(product, selectedVariant?.id);
              const calculatedTotalPrice = selectedPricePerKg * selection.weightKg * selection.quantity;
              const variantUnavailable = hasVariants && selectedVariant?.isAvailable === false;

              return (
                <div
                  key={product.id}
                  className={`group flex flex-col border rounded-2xl overflow-hidden transition-all duration-300 ${
                    orderingPaused
                      ? 'bg-slate-100 border-slate-200 opacity-80 shadow-none'
                      : 'rhs-panel hover:border-sky-300 hover:shadow-lg'
                  }`}
                >
                  {/* Fish Image Box */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!orderingPaused) onProductClick(product);
                    }}
                    onKeyDown={(e) => {
                      if (!orderingPaused && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onProductClick(product);
                      }
                    }}
                    aria-disabled={orderingPaused}
                    className={`relative aspect-square overflow-hidden bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-[#d9e7e8] ${
                      orderingPaused ? 'cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    aria-label={isZh ? `查看${product.nameZh}详情` : `View ${product.nameEn} details`}
                  >
                    <img
                      src={resolveMediaUrl(selectedVariant?.image || product.image)}
                      alt={isZh ? product.nameZh : product.nameEn}
                      className={`w-full h-full object-cover transition-transform duration-500 ${
                        orderingPaused
                          ? 'grayscale opacity-60'
                          : 'group-hover:scale-105 saturate-[0.85] group-hover:saturate-100'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                    {orderingPaused && (
                      <div className="absolute inset-0 bg-slate-200/35 flex items-center justify-center z-20">
                        <span className="px-3 py-1.5 rounded-full bg-white/90 border border-slate-200 text-slate-600 text-[11px] font-bold shadow-sm">
                          {isZh ? '更新中，暂不选择' : 'Updating, selection paused'}
                        </span>
                      </div>
                    )}
                    
                    {/* Dark gradient shadow on image */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-80" />

                    {/* Left Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                      {product.isWild ? (
                        <span className="px-3 py-1 rounded-md text-[10px] font-bold bg-amber-600 text-white uppercase tracking-wider shadow-md">
                          {isZh ? '野生捕捞' : '100% Wild'}
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-md text-[10px] font-bold bg-sky-600 text-white uppercase tracking-wider shadow-md">
                          {isZh ? '清泉网箱' : 'Spring Cage'}
                        </span>
                      )}
                    </div>

                    {/* Right Stock Status Badge */}
                    <div className="absolute top-4 right-4 z-10">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${status.class} shadow-md`}>
                        {isZh ? status.zh : status.en}
                      </span>
                    </div>

                    {/* Title Overlay inside Image bottom */}
                    <div className="absolute bottom-4 left-4 right-4 z-10">
                      <p className="text-[10px] font-bold tracking-widest text-sky-300 uppercase font-mono mb-1">
                        {product.scientificName}
                      </p>
                      <h3 className="text-xl font-bold text-white group-hover:text-sky-100 transition-colors">
                        {isZh ? product.nameZh : product.nameEn}
                      </h3>
                    </div>
                  </div>

                  {/* Product Details Section */}
                  <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                    {/* Description */}
                    <p className="text-[#536c74] text-xs leading-relaxed line-clamp-3">
                      {isZh ? product.descriptionZh : product.descriptionEn}
                    </p>

                    {/* Features list (mini) */}
                    <div className="space-y-1.5 py-2.5 border-t border-b border-[#d6e3e5]">
                      {(isZh ? product.featuresZh : product.featuresEn).slice(0, 2).map((feat, idx) => (
                        <div key={idx} className="flex items-center text-[11px] text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-2" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Product Options / Legacy Sizing Controls */}
                    {hasVariants ? (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {configuration.options.map(option => (
                          <div key={option.id} className="space-y-1.5">
                            <label className="text-[11px] text-slate-500 font-semibold block uppercase tracking-wide">
                              {isZh ? option.nameZh : option.nameEn}
                            </label>
                            <select
                              value={selection.selectedValueIds[option.id] || ''}
                              onChange={(e) => {
                                const selectedValueIds = { ...selection.selectedValueIds, [option.id]: e.target.value };
                                const variant = getVariantForSelection(configuration.variants, selectedValueIds, configuration.options);
                                if (!variant) return;
                                updateCardSelection(product.id, {
                                  selectedValueIds,
                                  selectedVariantId: variant.id,
                                  weightKg: variant.weightKg,
                                  cutType: variant.cutType,
                                });
                              }}
                              disabled={orderingPaused}
                              className="w-full bg-[#edf5f4] border border-[#c4d5d9] rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-sky-500 text-xs cursor-pointer"
                            >
                              {option.values.map(value => {
                                const candidateSelection = { ...selection.selectedValueIds, [option.id]: value.id };
                                const candidateVariant = getVariantForSelection(configuration.variants, candidateSelection, configuration.options);
                                return (
                                  <option key={value.id} value={value.id} disabled={!candidateVariant || candidateVariant.isAvailable === false}>
                                    {isZh ? value.nameZh : value.nameEn}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1.5">
                          <label className="text-[11px] text-slate-500 font-semibold block uppercase tracking-wide">
                            {isZh ? '估重(条)' : 'Weight / Fish'}
                          </label>
                          <select
                            value={selection.weightKg}
                            onChange={(e) => updateCardSelection(product.id, { weightKg: parseFloat(e.target.value) })}
                            disabled={orderingPaused}
                            className="w-full bg-[#edf5f4] border border-[#c4d5d9] rounded-lg px-2 py-1.5 font-mono text-slate-700 focus:outline-none focus:border-sky-500 text-xs cursor-pointer"
                          >
                            <option value={product.averageWeightKg * 0.8}>{(product.averageWeightKg * 0.8).toFixed(1)} kg ({isZh ? '小' : 'Small'})</option>
                            <option value={product.averageWeightKg}>{product.averageWeightKg.toFixed(1)} kg ({isZh ? '标准' : 'Standard'})</option>
                            <option value={product.averageWeightKg * 1.3}>{(product.averageWeightKg * 1.3).toFixed(1)} kg ({isZh ? '肥大' : 'Large'})</option>
                            <option value={product.averageWeightKg * 1.6}>{(product.averageWeightKg * 1.6).toFixed(1)} kg ({isZh ? '极品特大' : 'Extra Large'})</option>
                            <option value="whatsapp-custom-weight" disabled>{isZh ? '其他规格请 WhatsApp 客服' : 'Other size? Contact WhatsApp'}</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] text-slate-500 font-semibold block uppercase tracking-wide">
                            {isZh ? '屠宰处理' : 'Cutting Choice'}
                          </label>
                          <select
                            value={selection.cutType}
                            onChange={(e) => updateCardSelection(product.id, { cutType: e.target.value as any })}
                            disabled={orderingPaused}
                            className="w-full bg-[#edf5f4] border border-[#c4d5d9] rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-sky-500 text-xs cursor-pointer"
                          >
                            <option value="cleaned">{isZh ? '活杀去内脏 (Cleaned)' : 'Cleaned & Gutted'}</option>
                            <option value="whole">{isZh ? '完整整条 (Whole)' : 'Whole intact'}</option>
                            <option value="steak">{isZh ? '切厚段/轮切 (Steak Cuts)' : 'Thick Steaks'}</option>
                            <option value="sliced">{isZh ? '薄切鱼片 (Sliced)' : 'Thin Slices'}</option>
                            <option value="fillet">{isZh ? '纯去骨片 (Fillet Cuts)' : 'Boneless Fillets'}</option>
                            <option value="whatsapp-custom-cut" disabled>{isZh ? '特殊处理请 WhatsApp 客服' : 'Custom cut? Contact WhatsApp'}</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Quantity Selector and Pricing */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide block">
                          {isZh ? '产地底价' : 'Unit Price'}
                        </span>
                        <div className="flex items-baseline space-x-1">
                          <span className="text-xl font-black text-amber-600 font-mono">RM {selectedPricePerKg}</span>
                          <span className="text-xs text-slate-400">/ kg</span>
                        </div>
                      </div>

                      {/* Quantity Incrementor */}
                      <div className="flex items-center border border-[#c4d5d9] bg-[#edf5f4] rounded-lg">
                        <button
                          onClick={() => updateCardSelection(product.id, { quantity: Math.max(1, selection.quantity - 1) })}
                          disabled={orderingPaused}
                          className="px-2.5 py-1 text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 text-slate-800 font-mono font-bold text-xs">{selection.quantity}</span>
                        <button
                          onClick={() => updateCardSelection(product.id, { quantity: selection.quantity + 1 })}
                          disabled={orderingPaused}
                          className="px-2.5 py-1 text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Bottom Action buttons */}
                    <div className="grid grid-cols-5 gap-2 pt-2">
                      {/* View Details Button */}
                      <button
                        onClick={() => {
                          if (!orderingPaused) onProductClick(product);
                        }}
                        disabled={orderingPaused}
                        className={`col-span-2 flex items-center justify-center gap-1.5 p-2.5 border rounded-xl transition-all font-bold text-xs md:text-sm ${
                          orderingPaused
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-[#edf5f4] hover:bg-[#e3eeee] border-[#c4d5d9] hover:border-[#a8c1c7] text-slate-700 cursor-pointer'
                        }`}
                        title={isZh ? '查看详情' : 'View Details'}
                      >
                        <Eye className="w-4 h-4" />
                        <span>{isZh ? '详情' : 'Details'}</span>
                      </button>

                      {/* Add to Cart Button */}
                      <button
                        onClick={() => product.stockStatus === 'out_of_stock' || orderingPaused || variantUnavailable ? null : onAddToCart(product, selection.quantity, selection.weightKg, selection.cutType, selectedVariant?.id)}
                        disabled={product.stockStatus === 'out_of_stock' || orderingPaused || variantUnavailable}
                        className={`col-span-3 flex items-center justify-center space-x-1.5 md:space-x-2 px-3 py-2.5 rounded-xl transition-all whitespace-nowrap font-bold text-xs md:text-sm ${
                          product.stockStatus === 'out_of_stock' || orderingPaused || variantUnavailable
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-200 shadow-none scale-100'
                            : 'bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white cursor-pointer shadow-md active:scale-95'
                        }`}
                      >
                        {orderingPaused ? (
                          <span>{isZh ? '更新中' : 'Updating'}</span>
                        ) : product.stockStatus === 'out_of_stock' || variantUnavailable ? (
                          <span>{isZh ? '暂时售罄' : 'Sold Out'}</span>
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{isZh ? '加入购物车' : 'Add To Cart'}</span>
                            <span className="font-mono bg-sky-950/20 px-1.5 py-0.5 rounded ml-1 text-[10px] flex-shrink-0">
                              RM {calculatedTotalPrice.toFixed(0)}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
