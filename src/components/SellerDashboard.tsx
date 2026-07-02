import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, 
  TrendingUp, 
  ShoppingBag, 
  Database, 
  Package, 
  Truck, 
  Settings, 
  X, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  AlertTriangle, 
  Globe, 
  Search, 
  Filter, 
  ArrowUpRight, 
  User as UserIcon, 
  Award, 
  Clock, 
  FileText,
  DollarSign,
  Briefcase,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Info
} from 'lucide-react';
import { Product, CartItem, Language, DeliveryDetails } from '../types';

interface SellerDashboardProps {
  language: Language;
  onClose: () => void;
  products: Product[];
  setProducts: (prods: Product[]) => void;
  orderHistory: any[];
  setOrderHistory: (orders: any[]) => void;
  isMaintenanceMode: boolean;
  setIsMaintenanceMode: (val: boolean) => void;
  freeShippingThreshold: number;
  setFreeShippingThreshold: (val: number) => void;
  localShippingRate: number;
  setLocalShippingRate: (val: number) => void;
  outstationShippingRate: number;
  setOutstationShippingRate: (val: number) => void;
  storeAnnouncement: string;
  setStoreAnnouncement: (val: string) => void;
}

type TabType = 'overview' | 'orders' | 'products' | 'collections' | 'shipping' | 'settings';

export default function SellerDashboard({
  language,
  onClose,
  products,
  setProducts,
  orderHistory,
  setOrderHistory,
  isMaintenanceMode,
  setIsMaintenanceMode,
  freeShippingThreshold,
  setFreeShippingThreshold,
  localShippingRate,
  setLocalShippingRate,
  outstationShippingRate,
  setOutstationShippingRate,
  storeAnnouncement,
  setStoreAnnouncement,
}: SellerDashboardProps) {
  const isZh = language === 'zh';
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Search & Filter state for Orders
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null);

  // Search & Filter state for Products
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Product Form State
  const [formId, setFormId] = useState('');
  const [formNameZh, setFormNameZh] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formScientificName, setFormScientificName] = useState('');
  const [formCategory, setFormCategory] = useState<'premium' | 'wild' | 'aquaculture' | 'wellness'>('wild');
  const [formDescriptionZh, setFormDescriptionZh] = useState('');
  const [formDescriptionEn, setFormDescriptionEn] = useState('');
  const [formPricePerKg, setFormPricePerKg] = useState<number>(50);
  const [formAverageWeightKg, setFormAverageWeightKg] = useState<number>(1.2);
  const [formImage, setFormImage] = useState('');
  const [formTastingNotesZh, setFormTastingNotesZh] = useState('');
  const [formTastingNotesEn, setFormTastingNotesEn] = useState('');
  const [formCookingSuggestionsZh, setFormCookingSuggestionsZh] = useState('');
  const [formCookingSuggestionsEn, setFormCookingSuggestionsEn] = useState('');
  const [formFeaturesZh, setFormFeaturesZh] = useState('');
  const [formFeaturesEn, setFormFeaturesEn] = useState('');
  const [formIsWild, setFormIsWild] = useState(true);
  const [formStockStatus, setFormStockStatus] = useState<'available' | 'limited' | 'seasonal' | 'out_of_stock'>('available');

  // Notification states
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Shipment checker testing variables
  const [testPostcode, setTestPostcode] = useState('');
  const [testState, setTestState] = useState('Pahang');
  const [testResult, setTestResult] = useState<{ eligible: boolean; fee: number; zone: string } | null>(null);

  // Auto-clear messages
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };
  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 3000);
  };

  // -------------------------------------------------------------
  // CALCULATED METRICS FOR OVERVIEW
  // -------------------------------------------------------------
  const salesMetrics = useMemo(() => {
    // Filter active/valid orders (exclude cancelled for sales volume but show count)
    const validOrders = orderHistory.filter(o => o.status !== 'cancelled');
    const totalSales = validOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orderHistory.length;
    const avgOrderVal = totalOrders > 0 ? totalSales / validOrders.length : 0;
    
    // Revenue by category
    const categoryRevenue: Record<string, number> = {
      premium: 0,
      wild: 0,
      aquaculture: 0,
      wellness: 0,
    };

    validOrders.forEach(order => {
      order.items?.forEach((item: any) => {
        const cat = item.product?.category || 'wild';
        if (categoryRevenue[cat] !== undefined) {
          categoryRevenue[cat] += item.product.pricePerKg * item.selectedWeightKg * item.quantity;
        }
      });
    });

    // Best Sellers ranking
    const fishPopularity: Record<string, { count: number; nameZh: string; nameEn: string; revenue: number }> = {};
    validOrders.forEach(order => {
      order.items?.forEach((item: any) => {
        const pId = item.product.id;
        const subRev = item.product.pricePerKg * item.selectedWeightKg * item.quantity;
        if (!fishPopularity[pId]) {
          fishPopularity[pId] = {
            count: 0,
            nameZh: item.product.nameZh,
            nameEn: item.product.nameEn,
            revenue: 0,
          };
        }
        fishPopularity[pId].count += item.quantity;
        fishPopularity[pId].revenue += subRev;
      });
    });

    const bestSellers = Object.values(fishPopularity).sort((a, b) => b.revenue - a.revenue);

    return {
      totalSales,
      totalOrders,
      avgOrderVal,
      categoryRevenue,
      bestSellers,
    };
  }, [orderHistory]);

  // Handle Edit Product click
  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setIsAddingNew(false);
    
    // Fill form states
    setFormId(product.id);
    setFormNameZh(product.nameZh);
    setFormNameEn(product.nameEn);
    setFormScientificName(product.scientificName || '');
    setFormCategory(product.category);
    setFormDescriptionZh(product.descriptionZh);
    setFormDescriptionEn(product.descriptionEn);
    setFormPricePerKg(product.pricePerKg);
    setFormAverageWeightKg(product.averageWeightKg);
    setFormImage(product.image || '');
    setFormTastingNotesZh(product.tastingNotesZh || '');
    setFormTastingNotesEn(product.tastingNotesEn || '');
    setFormCookingSuggestionsZh(product.cookingSuggestionsZh ? product.cookingSuggestionsZh.join(', ') : '');
    setFormCookingSuggestionsEn(product.cookingSuggestionsEn ? product.cookingSuggestionsEn.join(', ') : '');
    setFormFeaturesZh(product.featuresZh ? product.featuresZh.join(', ') : '');
    setFormFeaturesEn(product.featuresEn ? product.featuresEn.join(', ') : '');
    setFormIsWild(product.isWild);
    setFormStockStatus((product.stockStatus as any) || 'available');
  };

  // Handle Reset Form
  const resetProductForm = () => {
    setEditingProduct(null);
    setIsAddingNew(false);
    setFormId('');
    setFormNameZh('');
    setFormNameEn('');
    setFormScientificName('');
    setFormCategory('wild');
    setFormDescriptionZh('');
    setFormDescriptionEn('');
    setFormPricePerKg(50);
    setFormAverageWeightKg(1.2);
    setFormImage('');
    setFormTastingNotesZh('');
    setFormTastingNotesEn('');
    setFormCookingSuggestionsZh('');
    setFormCookingSuggestionsEn('');
    setFormFeaturesZh('');
    setFormFeaturesEn('');
    setFormIsWild(true);
    setFormStockStatus('available');
  };

  // Handle Add/Save product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formNameZh || !formNameEn || !formId || formPricePerKg <= 0) {
      triggerError(isZh ? '请填写关键字段：ID、中英文名称、价格' : 'Please fill primary fields: ID, Names, Price');
      return;
    }

    const cleanId = formId.toLowerCase().trim().replace(/\s+/g, '-');

    const formattedProduct: Product = {
      id: cleanId,
      nameZh: formNameZh.trim(),
      nameEn: formNameEn.trim(),
      scientificName: formScientificName.trim(),
      category: formCategory,
      descriptionZh: formDescriptionZh.trim(),
      descriptionEn: formDescriptionEn.trim(),
      pricePerKg: Number(formPricePerKg),
      averageWeightKg: Number(formAverageWeightKg),
      image: formImage.trim() || 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
      tastingNotesZh: formTastingNotesZh.trim(),
      tastingNotesEn: formTastingNotesEn.trim(),
      cookingSuggestionsZh: formCookingSuggestionsZh.split(',').map(s => s.trim()).filter(Boolean),
      cookingSuggestionsEn: formCookingSuggestionsEn.split(',').map(s => s.trim()).filter(Boolean),
      featuresZh: formFeaturesZh.split(',').map(s => s.trim()).filter(Boolean),
      featuresEn: formFeaturesEn.split(',').map(s => s.trim()).filter(Boolean),
      isWild: formIsWild,
      stockStatus: formStockStatus as any,
    };

    let updatedProducts = [...products];

    if (isAddingNew) {
      // Check duplicate ID
      if (products.some(p => p.id === cleanId)) {
        triggerError(isZh ? '此产品 ID 已存在，请换一个 ID' : 'Product ID already exists, please use a unique ID');
        return;
      }
      updatedProducts.push(formattedProduct);
      triggerSuccess(isZh ? '全新河鱼产品已添加上架！' : 'New river fish product added successfully!');
    } else {
      // Editing mode
      const index = products.findIndex(p => p.id === editingProduct?.id);
      if (index > -1) {
        updatedProducts[index] = formattedProduct;
        triggerSuccess(isZh ? '产品信息更新成功！' : 'Product updated successfully!');
      } else {
        triggerError('Product not found in state catalog');
      }
    }

    setProducts(updatedProducts);
    localStorage.setItem('raub_hang_seng_products', JSON.stringify(updatedProducts));
    resetProductForm();
  };

  // Handle Delete Product
  const handleDeleteProduct = (pId: string) => {
    if (confirm(isZh ? '确定要下架并删除此河鱼产品吗？' : 'Are you sure you want to delete and unlist this product?')) {
      const filtered = products.filter(p => p.id !== pId);
      setProducts(filtered);
      localStorage.setItem('raub_hang_seng_products', JSON.stringify(filtered));
      triggerSuccess(isZh ? '产品已成功下架。' : 'Product unlisted successfully.');
    }
  };

  // Handle Order Status Update
  const handleUpdateOrderStatus = (orderId: string, status: string) => {
    const updatedOrders = orderHistory.map(order => {
      if (order.id === orderId) {
        return { ...order, status };
      }
      return order;
    });

    setOrderHistory(updatedOrders);
    localStorage.setItem('pahang_river_fish_orders', JSON.stringify(updatedOrders));
    triggerSuccess(isZh ? `订单 #${orderId} 状态已更新！` : `Order #${orderId} status updated!`);
    
    // Update active detail view if open
    if (selectedOrderDetail && selectedOrderDetail.id === orderId) {
      setSelectedOrderDetail({ ...selectedOrderDetail, status });
    }
  };

  // Handle test shipping calculation
  const handleTestShipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPostcode) return;

    const pc = testPostcode.trim();
    // Simple mock logic replicating standard checker rules
    let isPahangOrSelangor = false;
    let finalFee = outstationShippingRate;
    let zoneName = isZh ? '外省偏远区' : 'Outstation West Malaysia';

    if (
      pc.startsWith('25') || pc.startsWith('26') || pc.startsWith('27') || // Pahang
      pc.startsWith('40') || pc.startsWith('41') || pc.startsWith('42') || pc.startsWith('43') || pc.startsWith('44') || pc.startsWith('45') || pc.startsWith('46') || pc.startsWith('47') || // Selangor
      pc.startsWith('50') || pc.startsWith('51') || pc.startsWith('52') || pc.startsWith('53') || pc.startsWith('54') || pc.startsWith('55') || pc.startsWith('56') || pc.startsWith('57') || pc.startsWith('58') || pc.startsWith('59') || pc.startsWith('60') // KL
    ) {
      isPahangOrSelangor = true;
      finalFee = localShippingRate;
      zoneName = isZh ? '雪隆/彭亨本地冷链区' : 'Local Klang Valley / Pahang Zone';
    }

    setTestResult({
      eligible: true,
      fee: finalFee,
      zone: zoneName,
    });
  };

  // Filtering orders
  const filteredOrders = useMemo(() => {
    return orderHistory.filter(o => {
      // Search term matches: OrderID, customer name, phone number, city, or postcode
      const idMatch = o.id.toLowerCase().includes(orderSearch.toLowerCase());
      const nameMatch = o.details?.fullName?.toLowerCase().includes(orderSearch.toLowerCase());
      const phoneMatch = o.details?.phoneNumber?.includes(orderSearch);
      const locMatch = o.details?.city?.toLowerCase().includes(orderSearch.toLowerCase()) || o.details?.postcode?.includes(orderSearch);
      
      const textMatch = idMatch || nameMatch || phoneMatch || locMatch;
      
      // Status matches
      const currentStatus = o.status || 'pending';
      const statusMatch = orderStatusFilter === 'all' || currentStatus === orderStatusFilter;

      return textMatch && statusMatch;
    });
  }, [orderHistory, orderSearch, orderStatusFilter]);

  // Filtering products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const searchLower = productSearch.toLowerCase();
      const textMatch = 
        p.nameZh.toLowerCase().includes(searchLower) || 
        p.nameEn.toLowerCase().includes(searchLower) || 
        (p.scientificName && p.scientificName.toLowerCase().includes(searchLower)) || 
        p.id.toLowerCase().includes(searchLower);

      const categoryMatch = productCategoryFilter === 'all' || p.category === productCategoryFilter;

      return textMatch && categoryMatch;
    });
  }, [products, productSearch, productCategoryFilter]);

  return (
    <div id="seller-dashboard-overlay" className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-md flex items-center justify-center p-0 md:p-4 overflow-hidden">
      <div className="bg-slate-50 w-full h-full md:max-w-7xl md:h-[92vh] md:rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        
        {/* DASHBOARD HEADER */}
        <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 gap-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-500 text-slate-900 rounded-xl">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-wide font-sans text-white">
                  {isZh ? '恒升河鱼 • 商家管理后台' : 'Hang Seng River Fish - Admin Panel'}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isMaintenanceMode 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {isMaintenanceMode 
                    ? (isZh ? '维护模式 (Store Closed)' : 'Maintenance Mode') 
                    : (isZh ? '正常营业中' : 'Active Store')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isZh ? '监管彭亨河鱼销售分析、配置配送物流、调整店面及商品上架状况' : 'Manage wild caught catalog, shipments, sales metrics & settings'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                setIsMaintenanceMode(!isMaintenanceMode);
                triggerSuccess(isMaintenanceMode ? '店面恢复正常营业状态' : '店面已切换到维护重组状态');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isMaintenanceMode 
                  ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {isMaintenanceMode ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              <span>{isMaintenanceMode ? (isZh ? '开启店面' : 'Open Store') : (isZh ? '维护店面' : 'Close to Restock')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-full transition-colors cursor-pointer border border-slate-700"
              title={isZh ? '退出管理后台' : 'Close Admin Portal'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FEEDBACK SYSTEM FLOATER BAR */}
        {successMsg && (
          <div className="bg-emerald-500 text-white px-6 py-3 text-xs font-bold flex items-center space-x-2 animate-bounce flex-shrink-0 shadow-inner">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-rose-600 text-white px-6 py-3 text-xs font-bold flex items-center space-x-2 animate-bounce flex-shrink-0 shadow-inner">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* MAIN BODY: SPLIT VIEW FOR DESKTOP / RESPONSIVE FOR MOBILE */}
        <div className="flex flex-1 overflow-hidden h-full flex-col md:flex-row">
          
          {/* LEFT RAIL NAVIGATION */}
          <div className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible shrink-0 p-2 md:p-4 gap-1 flex-shrink-0">
            <span className="hidden md:block text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-3 px-3">
              {isZh ? '商家中心管理分类' : 'Merchant Categories'}
            </span>
            {[
              { id: 'overview', zh: '销售分析 Overview', en: 'Sales Analysis', icon: TrendingUp },
              { id: 'orders', zh: '订单管理 Orders', en: 'Orders Manager', icon: ShoppingBag },
              { id: 'products', zh: '商品管理 Catalog', en: 'Product Manager', icon: Package },
              { id: 'collections', zh: '鱼类分类 Collections', en: 'Fish Categories', icon: Database },
              { id: 'shipping', zh: '物流物流 Shipping', en: 'Shipment Center', icon: Truck },
              { id: 'settings', zh: '店面控制 Settings', en: 'Store Settings', icon: Settings },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as TabType);
                    setSelectedOrderDetail(null);
                    resetProductForm();
                  }}
                  className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-sky-500 text-slate-950 font-extrabold shadow-md transform translate-x-1' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-500'}`} />
                  <span>{isZh ? tab.zh : tab.en}</span>
                </button>
              );
            })}
          </div>

          {/* RIGHT VIEWPORT CONTENT */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 min-h-0">
            
            {/* ============================================================== */}
            /* TAB: OVERVIEW                                                  */
            /* ============================================================== */
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{isZh ? '商业销售仪表盘' : 'Business Sales Performance'}</h3>
                    <p className="text-xs text-slate-500">{isZh ? '追踪彭亨特马鲁及上游捕捞野生河鱼销售量' : 'Track wild caught patin, sultan and empurau invoice metrics'}</p>
                  </div>
                  <div className="text-xs font-mono bg-white px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600">
                    {isZh ? '最新统计于:' : 'Data current to:'} {new Date().toLocaleDateString()}
                  </div>
                </div>

                {/* Stat Cards Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center space-x-3">
                    <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">{isZh ? '总销售额' : 'Total Revenue'}</span>
                      <strong className="text-lg font-mono font-black text-slate-950 block">RM {salesMetrics.totalSales.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center space-x-3">
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">{isZh ? '订单总数' : 'Total Orders'}</span>
                      <strong className="text-lg font-mono font-black text-slate-950 block">{salesMetrics.totalOrders} <span className="text-[10px] text-slate-400 font-normal">{isZh ? '单' : 'orders'}</span></strong>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center space-x-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">{isZh ? '客单均价' : 'Avg Order Value'}</span>
                      <strong className="text-lg font-mono font-black text-slate-950 block">RM {salesMetrics.avgOrderVal.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center space-x-3">
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">{isZh ? '河鱼产品数' : 'Active Fishes'}</span>
                      <strong className="text-lg font-mono font-black text-slate-950 block">{products.length} <span className="text-[10px] text-slate-400 font-normal">{isZh ? '款' : 'types'}</span></strong>
                    </div>
                  </div>
                </div>

                {/* Interactive SVG Sales Trend Graph (Custom elegant SVG) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs lg:col-span-8">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">{isZh ? '销售额趋势 (近 7 日订单记录)' : 'Sales Revenue Trend (Past 7 Orders)'}</h4>
                    
                    {orderHistory.length === 0 ? (
                      <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
                        <TrendingUp className="w-8 h-8 text-slate-200 mb-2" />
                        {isZh ? '暂无交易记录产生趋势图' : 'No sales records to generate trend graph'}
                      </div>
                    ) : (
                      <div>
                        {/* Elegant direct SVG graph */}
                        <div className="relative w-full h-52">
                          <svg viewBox="0 0 500 200" className="w-full h-full">
                            {/* Grid Lines */}
                            <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                            <line x1="40" y1="70" x2="480" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                            <line x1="40" y1="120" x2="480" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                            <line x1="40" y1="170" x2="480" y2="170" stroke="#e2e8f0" strokeWidth="1" />

                            {/* Custom values mapped (reverse sequence to display chronically) */}
                            {(() => {
                              const points = orderHistory.slice(0, 7).reverse().map((ord, idx) => {
                                const x = 40 + (idx * 440) / 6;
                                // Map total to y coordinates (y = 170 is 0 RM, y = 20 is max total)
                                const maxVal = Math.max(...orderHistory.map(o => o.total), 300);
                                const y = 170 - (ord.total * 150) / maxVal;
                                return { x, y, ord };
                              });

                              let pathD = "";
                              points.forEach((pt, i) => {
                                if (i === 0) pathD += `M ${pt.x} ${pt.y}`;
                                else pathD += ` L ${pt.x} ${pt.y}`;
                              });

                              return (
                                <>
                                  {/* Area Gradient */}
                                  {pathD && (
                                    <path
                                      d={`${pathD} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z`}
                                      fill="url(#salesGrad)"
                                      opacity="0.15"
                                    />
                                  )}
                                  
                                  {/* Line Path */}
                                  <path
                                    d={pathD}
                                    fill="none"
                                    stroke="#0284c7"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />

                                  {/* Data Circles */}
                                  {points.map((pt, i) => (
                                    <g key={i} className="group cursor-pointer">
                                      <circle
                                        cx={pt.x}
                                        cy={pt.y}
                                        r="5"
                                        fill="#ffffff"
                                        stroke="#0284c7"
                                        strokeWidth="2.5"
                                      />
                                      <text
                                        x={pt.x}
                                        y={pt.y - 10}
                                        textAnchor="middle"
                                        className="text-[9px] font-mono font-bold fill-slate-700"
                                      >
                                        RM {pt.ord.total.toFixed(0)}
                                      </text>
                                      <text
                                        x={pt.x}
                                        y="185"
                                        textAnchor="middle"
                                        className="text-[8px] font-mono fill-slate-400"
                                      >
                                        #{pt.ord.id.substring(0, 4)}
                                      </text>
                                    </g>
                                  ))}

                                  <defs>
                                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#0284c7" />
                                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                                    </linearGradient>
                                  </defs>
                                </>
                              );
                            })()}
                          </svg>
                        </div>
                        <p className="text-[10px] text-slate-400 text-center mt-2">
                          {isZh ? '💡 以上趋势图展示最近 7 笔消费账目的演化（最新在右边）' : '💡 Past 7 successful transactions chronologically mapped left to right'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Category Pie/Bar breakdown */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs lg:col-span-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">{isZh ? '鱼类产品品类收益' : 'Revenue by Categories'}</h4>
                    <div className="space-y-4">
                      {[
                        { key: 'premium', label: isZh ? '尊贵极品 (Premium)' : 'Premium Imperial', color: 'bg-amber-500' },
                        { key: 'wild', label: isZh ? '纯野生捕捞 (Wild)' : '100% Wild caught', color: 'bg-sky-500' },
                        { key: 'aquaculture', label: isZh ? '网箱养殖 (Aquaculture)' : 'Cage Culture', color: 'bg-emerald-500' },
                        { key: 'wellness', label: isZh ? '生鱼养生 (Wellness)' : 'Wellness Products', color: 'bg-purple-500' },
                      ].map(cat => {
                        const rev = salesMetrics.categoryRevenue[cat.key] || 0;
                        const percent = salesMetrics.totalSales > 0 ? (rev / salesMetrics.totalSales) * 100 : 0;
                        return (
                          <div key={cat.key} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-700 flex items-center">
                                <span className={`w-2.5 h-2.5 rounded-full ${cat.color} mr-1.5 inline-block`} />
                                {cat.label}
                              </span>
                              <span className="font-mono font-bold text-slate-900">RM {rev.toFixed(0)} ({percent.toFixed(0)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className={`h-full ${cat.color}`} style={{ width: `${percent || 2}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Best Selling Table */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">{isZh ? '热销河鱼商品排行' : 'Top Selling Fishes'}</h4>
                  {salesMetrics.bestSellers.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">{isZh ? '暂无产品购买排行数据。' : 'No popularity details yet.'}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider">
                            <th className="py-2.5 font-bold">{isZh ? '河鱼产品' : 'Fish Species'}</th>
                            <th className="py-2.5 font-bold text-center">{isZh ? '销售总量' : 'Quantity Sold'}</th>
                            <th className="py-2.5 font-bold text-right">{isZh ? '总营业额' : 'Generated Revenue'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-mono">
                          {salesMetrics.bestSellers.slice(0, 5).map((fish, index) => (
                            <tr key={index} className="hover:bg-slate-50/50">
                              <td className="py-2.5 font-sans font-medium text-slate-800">
                                <span className="inline-block w-4 text-slate-400 font-bold">{index + 1}.</span>
                                {isZh ? fish.nameZh : fish.nameEn}
                              </td>
                              <td className="py-2.5 text-center text-slate-600 font-bold">{fish.count} {isZh ? '尾' : 'units'}</td>
                              <td className="py-2.5 text-right font-bold text-emerald-600">RM {fish.revenue.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            /* TAB: ORDERS MANAGER                                            */
            /* ============================================================== */
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{isZh ? '订单核查与配送管理' : 'Orders Dispatch & Fulfillment'}</h3>
                    <p className="text-xs text-slate-500">{isZh ? '处理顾客的河鱼冷链配送订单并配置最新状态。可点击更新状态或查阅完整地址' : 'Mark items processed, shipped, or delivered. Inspect full invoices.'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">{isZh ? '筛选状态:' : 'Filter status:'}</span>
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="all">{isZh ? '全部订单' : 'All Orders'}</option>
                      <option value="pending">{isZh ? '待接单 (Pending)' : 'Pending'}</option>
                      <option value="processing">{isZh ? '处理中 (Processing)' : 'Processing'}</option>
                      <option value="shipped">{isZh ? '已配送 (Shipped)' : 'Shipped'}</option>
                      <option value="delivered">{isZh ? '已送达 (Delivered)' : 'Delivered'}</option>
                      <option value="cancelled">{isZh ? '已取消 (Cancelled)' : 'Cancelled'}</option>
                    </select>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={isZh ? '输入订单 ID, 客户姓名, 电话或城市搜索...' : 'Search by ID, recipient name, phone, city or postcode...'}
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500 shadow-xs"
                  />
                </div>

                {/* Split layout: Table List & Active Detail Card */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT: Orders list table */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs lg:col-span-7">
                    {filteredOrders.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        {isZh ? '没有找到符合条件的订单数据。' : 'No orders matched your filtering criteria.'}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                              <th className="p-3">{isZh ? '单号/日期' : 'ID & Date'}</th>
                              <th className="p-3">{isZh ? '收件客户' : 'Customer'}</th>
                              <th className="p-3 text-right">{isZh ? '总计' : 'Total'}</th>
                              <th className="p-3 text-center">{isZh ? '当前状态' : 'Status'}</th>
                              <th className="p-3 text-right">{isZh ? '操作' : 'Action'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredOrders.map((order) => {
                              const ordStatus = order.status || 'pending';
                              return (
                                <tr 
                                  key={order.id} 
                                  className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${selectedOrderDetail?.id === order.id ? 'bg-sky-50/40' : ''}`}
                                  onClick={() => setSelectedOrderDetail(order)}
                                >
                                  <td className="p-3">
                                    <span className="font-mono font-bold text-sky-600 block">#{order.id}</span>
                                    <span className="text-[10px] text-slate-400 block font-mono">{order.date}</span>
                                  </td>
                                  <td className="p-3">
                                    <strong className="text-slate-800 block font-sans">{order.details?.fullName}</strong>
                                    <span className="text-[10px] text-slate-400 block font-mono">{order.details?.phoneNumber}</span>
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                                    RM {order.total.toFixed(2)}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                      ordStatus === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                                      ordStatus === 'shipped' ? 'bg-sky-100 text-sky-800' :
                                      ordStatus === 'processing' ? 'bg-amber-100 text-amber-800' :
                                      ordStatus === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                                      'bg-slate-100 text-slate-800'
                                    }`}>
                                      {ordStatus.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOrderDetail(order);
                                      }}
                                      className="text-sky-600 hover:text-sky-500 font-bold text-[11px] underline cursor-pointer"
                                    >
                                      {isZh ? '详情' : 'Inspect'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Selected Order detail panel */}
                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                    {selectedOrderDetail ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Selected Invoice details</span>
                            <h4 className="text-sm font-black text-slate-900 font-mono">ORDER ID: #{selectedOrderDetail.id}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">{isZh ? '提交时间:' : 'Received at:'} {selectedOrderDetail.date}</p>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            (selectedOrderDetail.status || 'pending') === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                            (selectedOrderDetail.status || 'pending') === 'shipped' ? 'bg-sky-100 text-sky-800' :
                            (selectedOrderDetail.status || 'pending') === 'processing' ? 'bg-amber-100 text-amber-800' :
                            (selectedOrderDetail.status || 'pending') === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {(selectedOrderDetail.status || 'pending').toUpperCase()}
                          </span>
                        </div>

                        {/* Customer Delivery info details */}
                        <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-2 border border-slate-200">
                          <h5 className="font-bold text-slate-800 flex items-center">
                            <UserIcon className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                            {isZh ? '收货人联络地址' : 'Recipient Details'}
                          </h5>
                          <div className="space-y-1 text-slate-600 leading-relaxed font-sans">
                            <p className="flex justify-between"><span className="text-slate-400">{isZh ? '客户姓名:' : 'Name:'}</span> <strong>{selectedOrderDetail.details?.fullName}</strong></p>
                            <p className="flex justify-between"><span className="text-slate-400">{isZh ? '联络电话:' : 'Phone:'}</span> <strong className="font-mono text-sky-700">{selectedOrderDetail.details?.phoneNumber}</strong></p>
                            <p className="flex justify-between"><span className="text-slate-400">{isZh ? '预定日期:' : 'Target Date:'}</span> <strong className="font-mono text-amber-600">{selectedOrderDetail.details?.deliveryDate || '-'}</strong></p>
                            <p className="flex justify-between"><span className="text-slate-400">{isZh ? '邮政编码:' : 'Postcode:'}</span> <strong className="font-mono">{selectedOrderDetail.details?.postcode}</strong></p>
                            <p className="flex justify-between"><span className="text-slate-400">{isZh ? '配送城市:' : 'City/State:'}</span> <strong className="font-mono">{selectedOrderDetail.details?.city}, {selectedOrderDetail.details?.state}</strong></p>
                            <div className="border-t border-slate-200/60 pt-1.5 mt-1">
                              <span className="text-slate-400 block text-[10px]">{isZh ? '完整详细地址:' : 'Full Address:'}</span>
                              <p className="text-slate-700 font-medium text-[11px] bg-white p-1.5 rounded border border-slate-100 mt-1 leading-snug">
                                {selectedOrderDetail.details?.address}, {selectedOrderDetail.details?.postcode} {selectedOrderDetail.details?.city}, {selectedOrderDetail.details?.state}
                              </p>
                            </div>
                            {selectedOrderDetail.details?.notes && (
                              <div className="pt-1">
                                <span className="text-slate-400 block text-[10px]">{isZh ? '卖家备注/留言:' : 'Special Instruction:'}</span>
                                <p className="italic text-slate-500 text-[11px]">"{selectedOrderDetail.details.notes}"</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Order items purchased list */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{isZh ? '购买鱼类明细' : 'Fishes Ordered'}</span>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {selectedOrderDetail.items?.map((item: any, idx: number) => (
                              <div key={idx} className="bg-white border border-slate-100 p-2 rounded-lg text-xs flex justify-between items-center shadow-xs">
                                <div>
                                  <strong className="text-slate-800">{isZh ? item.product?.nameZh : item.product?.nameEn}</strong>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {item.quantity}x • {item.selectedWeightKg}kg • {isZh ? `宰杀:${item.cutType}` : `Cut:${item.cutType}`}
                                  </p>
                                </div>
                                <span className="font-mono font-bold text-slate-600">
                                  RM {(item.product?.pricePerKg * item.selectedWeightKg * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Financial Invoice Total and rewards */}
                        <div className="bg-sky-50/50 p-3 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <span className="text-slate-400 block">{isZh ? '应收总额 (含运费):' : 'Invoice Total:'}</span>
                            <strong className="text-base text-slate-900 font-mono">RM {selectedOrderDetail.total.toFixed(2)}</strong>
                          </div>
                          {selectedOrderDetail.userId ? (
                            <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-md">
                              {isZh ? `已累计 ${Math.round(selectedOrderDetail.total)} 会员积分` : `Earned +${Math.round(selectedOrderDetail.total)} loyalty pts`}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              {isZh ? '非会员购买' : 'Guest Purchase'}
                            </span>
                          )}
                        </div>

                        {/* Order Status Controller dropdown buttons */}
                        <div className="space-y-2 border-t border-slate-100 pt-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{isZh ? '更新物流派送状态' : 'Dispatch Control Action'}</span>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'pending', label: isZh ? '待核实' : 'Pending', color: 'hover:bg-slate-100' },
                              { id: 'processing', label: isZh ? '打包杀鱼' : 'Process', color: 'hover:bg-amber-100 text-amber-700' },
                              { id: 'shipped', label: isZh ? '冷链出发' : 'Ship Out', color: 'hover:bg-sky-100 text-sky-700 font-bold' },
                              { id: 'delivered', label: isZh ? '送达完毕' : 'Delivered', color: 'hover:bg-emerald-100 text-emerald-700 font-bold' },
                            ].map(btn => (
                              <button
                                key={btn.id}
                                onClick={() => handleUpdateOrderStatus(selectedOrderDetail.id, btn.id)}
                                className={`py-1.5 px-2 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${btn.color} ${
                                  (selectedOrderDetail.status || 'pending') === btn.id ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-900' : ''
                                }`}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => handleUpdateOrderStatus(selectedOrderDetail.id, 'cancelled')}
                            className="w-full py-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                          >
                            {isZh ? '取消并关闭此订单 (Cancel)' : 'Cancel & Revoke Order'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-96 flex flex-col items-center justify-center text-slate-400 text-xs">
                        <FileText className="w-12 h-12 text-slate-200 mb-2" />
                        {isZh ? '请在左侧列表中选择订单以查看完整发票详情、收件地址并执行发货。' : 'Please select an invoice from the left grid to view client addresses & set status.'}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* ============================================================== */}
            /* TAB: PRODUCTS CATALOG MANAGER                                  */
            /* ============================================================== */
            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{isZh ? '上架河鱼品类目录' : 'Fishes Storefront Catalog'}</h3>
                    <p className="text-xs text-slate-500">{isZh ? '管理彭亨河鱼的售价、规格、图库及在售库存状态。修改后前台页面立即实时渲染' : 'Real-time edit price, average weight, custom images or add a species.'}</p>
                  </div>
                  <button
                    onClick={() => {
                      resetProductForm();
                      setIsAddingNew(true);
                    }}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all hover:scale-105"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isZh ? '添加新河鱼 (Add Species)' : 'Add New Species'}</span>
                  </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="relative md:col-span-8">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={isZh ? '搜索产品名称, 科名, ID...' : 'Search species name, category, or scientific ID...'}
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <select
                      value={productCategoryFilter}
                      onChange={(e) => setProductCategoryFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="all">{isZh ? '所有河鱼分类' : 'All Categories'}</option>
                      <option value="premium">{isZh ? '尊贵极品 (Premium)' : 'Premium'}</option>
                      <option value="wild">{isZh ? '100% 纯野生捕捞 (Wild)' : 'Wild Captured'}</option>
                      <option value="aquaculture">{isZh ? '清泉网箱养殖 (Aquaculture)' : 'Cage Aquaculture'}</option>
                      <option value="wellness">{isZh ? '生鱼术后调理 (Wellness)' : 'Wellness / Haruan'}</option>
                    </select>
                  </div>
                </div>

                {/* Split list / form layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT: Products dynamic grid list */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs lg:col-span-6 max-h-[110vh] overflow-y-auto p-4 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      {isZh ? `上架目录（${filteredProducts.length} 款）` : `Active Storefront Catalog (${filteredProducts.length} items)`}
                    </span>

                    {filteredProducts.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">{isZh ? '未搜索到任何河鱼。' : 'No matching fishes found.'}</p>
                    ) : (
                      filteredProducts.map(prod => (
                        <div 
                          key={prod.id} 
                          className={`p-3 border rounded-xl flex items-center space-x-3 transition-all hover:border-slate-300 cursor-pointer ${
                            editingProduct?.id === prod.id ? 'bg-sky-50/50 border-sky-300' : 'bg-slate-50 border-slate-200'
                          }`}
                          onClick={() => handleEditClick(prod)}
                        >
                          <img 
                            src={prod.image} 
                            alt={prod.nameEn} 
                            className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] uppercase tracking-wider font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                              {prod.category}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 truncate mt-1">
                              {isZh ? prod.nameZh : prod.nameEn}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-mono italic truncate">{prod.scientificName}</p>
                            <p className="text-xs text-slate-950 font-bold font-mono mt-0.5">
                              RM {prod.pricePerKg}/kg <span className="text-[10px] text-slate-400 font-normal">({prod.averageWeightKg}kg/avg)</span>
                            </p>
                          </div>

                          <div className="flex flex-col items-end justify-between h-14">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                              prod.stockStatus === 'available' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              prod.stockStatus === 'limited' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                              'bg-rose-50 text-rose-600 border border-rose-100'
                            }`}>
                              {prod.stockStatus === 'available' ? (isZh ? '有货' : 'Available') :
                               prod.stockStatus === 'limited' ? (isZh ? '限量' : 'Limited') : (isZh ? '季节缺货' : 'Out Stock')}
                            </span>
                            <div className="flex space-x-1 mt-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClick(prod);
                                }}
                                className="p-1 text-slate-400 hover:text-sky-600 cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProduct(prod.id);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* RIGHT: Add/Edit Product live form */}
                  <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {isAddingNew ? (isZh ? '➕ 上架全新河鱼品类' : 'Add New Species Catalog') : (isZh ? '📝 修改河鱼商品资料' : 'Modify Species Profile')}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isAddingNew ? (isZh ? '配置一尾全新彭亨野生或特马鲁养殖河鱼' : 'Configure a fresh wild caught species') : `Updating: ${editingProduct?.id}`}
                        </p>
                      </div>
                      {(editingProduct || isAddingNew) && (
                        <button
                          onClick={resetProductForm}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          {isZh ? '重置/取消' : 'Cancel'}
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleSaveProduct} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            {isZh ? '产品 ID * (例: patin-buah)' : 'Product ID * (e.g. patin-buah)'}
                          </label>
                          <input
                            type="text"
                            value={formId}
                            onChange={(e) => setFormId(e.target.value)}
                            disabled={!isAddingNew}
                            placeholder="patin-royal"
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 disabled:bg-slate-200 disabled:text-slate-400 font-mono"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            {isZh ? '商品分类' : 'Species Category'}
                          </label>
                          <select
                            value={formCategory}
                            onChange={(e) => setFormCategory(e.target.value as any)}
                            className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                          >
                            <option value="premium">{isZh ? '尊贵极品 (Premium)' : 'Premium'}</option>
                            <option value="wild">{isZh ? '野生捕捞 (Wild Caught)' : 'Wild caught'}</option>
                            <option value="aquaculture">{isZh ? '网箱养殖 (Aquaculture)' : 'Cage Aquaculture'}</option>
                            <option value="wellness">{isZh ? '生鱼养生 (Wellness)' : 'Wellness/Maternity'}</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            {isZh ? '中文名称 *' : 'Name in Chinese *'}
                          </label>
                          <input
                            type="text"
                            value={formNameZh}
                            onChange={(e) => setFormNameZh(e.target.value)}
                            placeholder="野生皇家巴丁鱼"
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            {isZh ? '英文名称 *' : 'Name in English *'}
                          </label>
                          <input
                            type="text"
                            value={formNameEn}
                            onChange={(e) => setFormNameEn(e.target.value)}
                            placeholder="Royal Wild Patin"
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            {isZh ? '学名 (拉丁文)' : 'Scientific Name'}
                          </label>
                          <input
                            type="text"
                            value={formScientificName}
                            onChange={(e) => setFormScientificName(e.target.value)}
                            placeholder="Pangasius nasutus"
                            className="w-full text-xs px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono italic"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            {isZh ? '每公斤单价 (RM) *' : 'Price / Kg (RM) *'}
                          </label>
                          <input
                            type="number"
                            value={formPricePerKg}
                            onChange={(e) => setFormPricePerKg(Number(e.target.value))}
                            className="w-full text-xs px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            {isZh ? '平均单尾重量 (Kg)' : 'Avg Weight (Kg)'}
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={formAverageWeightKg}
                            onChange={(e) => setFormAverageWeightKg(Number(e.target.value))}
                            className="w-full text-xs px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            {isZh ? '野生标志' : 'Wild Caught flag'}
                          </label>
                          <select
                            value={formIsWild ? 'true' : 'false'}
                            onChange={(e) => setFormIsWild(e.target.value === 'true')}
                            className="w-full text-xs px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                          >
                            <option value="true">{isZh ? '是的，100% 彭亨河野生捕捞' : 'Yes, Wild caught'}</option>
                            <option value="false">{isZh ? '否，优质网箱生态养殖' : 'No, Cage Aquaculture'}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            {isZh ? '供应状态' : 'Catalog Stock Status'}
                          </label>
                          <select
                            value={formStockStatus}
                            onChange={(e) => setFormStockStatus(e.target.value as any)}
                            className="w-full text-xs px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                          >
                            <option value="available">{isZh ? '现货充足 (Available)' : 'Available'}</option>
                            <option value="limited">{isZh ? '每日限量 (Limited catch)' : 'Limited'}</option>
                            <option value="seasonal">{isZh ? '季节偶获 (Seasonal)' : 'Seasonal'}</option>
                            <option value="out_of_stock">{isZh ? '售罄下架 (Out of Stock)' : 'Out of Stock'}</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          {isZh ? '河鱼产品美图 URL' : 'Image URL'}
                        </label>
                        <input
                          type="text"
                          value={formImage}
                          onChange={(e) => setFormImage(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            {isZh ? '中文风味/口感描述' : 'Tasting Notes CN'}
                          </label>
                          <input
                            type="text"
                            value={formTastingNotesZh}
                            onChange={(e) => setFormTastingNotesZh(e.target.value)}
                            placeholder="香甜滑嫩、自带淡雅果木清香"
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            {isZh ? '英文风味/口感描述' : 'Tasting Notes EN'}
                          </label>
                          <input
                            type="text"
                            value={formTastingNotesEn}
                            onChange={(e) => setFormTastingNotesEn(e.target.value)}
                            placeholder="Extremely sweet and silky texture with high aromatic fat"
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            {isZh ? '中文说明 (每条用逗号隔开)' : 'Description CN (comma separated)'}
                          </label>
                          <textarea
                            value={formDescriptionZh}
                            onChange={(e) => setFormDescriptionZh(e.target.value)}
                            rows={2}
                            placeholder="富含Omega-3，极其鲜美..."
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            {isZh ? '英文说明 (每条用逗号隔开)' : 'Description EN (comma separated)'}
                          </label>
                          <textarea
                            value={formDescriptionEn}
                            onChange={(e) => setFormDescriptionEn(e.target.value)}
                            rows={2}
                            placeholder="High fat concentration caught in Pahang..."
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg resize-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">
                            {isZh ? '中文烹饪推荐 (用逗号隔开)' : 'Cooking suggestions CN'}
                          </label>
                          <input
                            type="text"
                            value={formCookingSuggestionsZh}
                            onChange={(e) => setFormCookingSuggestionsZh(e.target.value)}
                            placeholder="清蒸, 姜葱蒸, 红烧"
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">
                            {isZh ? '英文烹饪推荐 (用逗号隔开)' : 'Cooking suggestions EN'}
                          </label>
                          <input
                            type="text"
                            value={formCookingSuggestionsEn}
                            onChange={(e) => setFormCookingSuggestionsEn(e.target.value)}
                            placeholder="Classic Steamed, Fried Ginger, Chili Broth"
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                      >
                        {isZh ? '💾 保存并发布同步至商城' : 'Save & Sync Product to Store'}
                      </button>
                    </form>
                  </div>

                </div>
              </div>
            )}

            {/* ============================================================== */}
            /* TAB: COLLECTIONS & CATEGORIES                                  */
            /* ============================================================== */
            {activeTab === 'collections' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{isZh ? '彭亨河鱼特许品类管理' : 'Fish Collections Management'}</h3>
                  <p className="text-xs text-slate-500">{isZh ? '规划和查阅在售商品所属的彭亨分类。每一品类可统计库存覆盖情况' : 'Review active collections, total species listings and health status.'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { id: 'premium', titleZh: '尊贵极品 (Premium)', titleEn: 'Premium Imperial Collection', descZh: '大马最国宴级的顶级河鱼，如忘不了鱼 (Empurau) 和苏丹鱼 (Jelawat)，以果实为食，肉质细嫩，深受高端贵宾顾客及企业大宗礼盒送礼喜爱。', descEn: 'State-banquet caliber species feeding on specific riverine fruits, delivering unparalleled rich, fragrant fat and unique edible crispy scales.' },
                    { id: 'wild', titleZh: '野生捕捞 (100% Wild Caught)', titleEn: '100% Mainstream Wild Caught', descZh: '纯由彭亨河当地原住民和熟练渔民在急流主流手工捕捉捕捞的鱼类。由于生长环境水流湍急，鱼肉富有弹性，无任何饲养痕迹和泥土杂味。', descEn: 'Hand-captured in fast currents by skilled local fishermen. Due to rapids, their bodies are hyper-muscled, completely avoiding any farm flavors or mud smell.' },
                    { id: 'aquaculture', titleZh: '清泉网箱养殖 (Cage Aquaculture)', titleEn: 'Temerloh Spring Cage Aquaculture', descZh: '位于巴丁鱼之乡特马鲁（Temerloh）的主流高流速网箱养殖。引清澈湍急的河水冲刷，并以天然优质谷物精心科学喂养。性价比极高，家庭清蒸首选。', descEn: 'Cultured inside high-speed river pens in Temerloh, fed with specialized clean grain feed. Represents perfect household value and daily culinary delight.' },
                    { id: 'wellness', titleZh: '养生调理 (Wellness Series)', titleEn: 'Maternity & Post-Op Wellness', descZh: '以野生生鱼 (Haruan/Channa) 为主打。由于生鱼体内富含促进人体组织快速生长复原的多种高价值氨基酸，历来为大马产后孕妇和外科术后调养必备。', descEn: 'Traditional health species led by swamp-caught Snakehead (Haruan), holding dense natural amino acids to assist skin cellular restoration.' },
                  ].map(coll => {
                    const matchedProds = products.filter(p => p.category === coll.id);
                    return (
                      <div key={coll.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-slate-400 font-mono block">CATEGORY_KEY: {coll.id.toUpperCase()}</span>
                            <h4 className="text-sm font-bold text-slate-900 mt-1">{isZh ? coll.titleZh : coll.titleEn}</h4>
                          </div>
                          <span className="bg-sky-50 text-sky-700 border border-sky-100 text-xs font-bold px-2.5 py-1 rounded-full">
                            {matchedProds.length} {isZh ? '款在售商品' : 'Species listed'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {isZh ? coll.descZh : coll.descEn}
                        </p>

                        <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-2">
                          <span className="text-[10px] text-slate-400 font-bold block w-full">{isZh ? '下辖主要产品:' : 'Active species under this collection:'}</span>
                          {matchedProds.map(p => (
                            <span key={p.id} className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded-lg">
                              {isZh ? p.nameZh : p.nameEn} (RM {p.pricePerKg})
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            /* TAB: SHIPPING RATES                                            */
            /* ============================================================== */
            {activeTab === 'shipping' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{isZh ? '冷链物流运费及邮编核准' : 'Cold Chain Shipment Center'}</h3>
                  <p className="text-xs text-slate-500">{isZh ? '配置西马冷链车配送门槛和区域邮编。支持进行邮编派送测试、运费基准微调。' : 'Calibrate local (KL/Selangor/Pahang) vs outstation shipping rates, adjust free shipping limits.'}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Shipping rates configurator */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs lg:col-span-6 space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">{isZh ? '冷链配送费率设置' : 'Configure Logistics Fees'}</h4>
                    
                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          {isZh ? '包邮消费门槛金额 (RM)' : 'Free Shipping Subtotal Threshold (RM)'}
                        </label>
                        <input
                          type="number"
                          value={freeShippingThreshold}
                          onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">{isZh ? '当商品小计超过此值时，冷链配送费自动归零 (当前为 RM 250)' : 'Orders above this amount qualify for complimentary cold-chain dispatch.'}</span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          {isZh ? '雪隆区 / 彭亨本地运费 (RM)' : 'Local Region Shipping Fee (RM) - (Pahang/KL/Selangor)'}
                        </label>
                        <input
                          type="number"
                          value={localShippingRate}
                          onChange={(e) => setLocalShippingRate(Number(e.target.value))}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          {isZh ? '其他西马外州运费 (RM)' : 'Outstation Shipping Fee (RM) - (Johor/Penang/Perak/etc.)'}
                        </label>
                        <input
                          type="number"
                          value={outstationShippingRate}
                          onChange={(e) => setOutstationShippingRate(Number(e.target.value))}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          localStorage.setItem('raub_hang_seng_free_shipping', String(freeShippingThreshold));
                          localStorage.setItem('raub_hang_seng_local_rate', String(localShippingRate));
                          localStorage.setItem('raub_hang_seng_outstation_rate', String(outstationShippingRate));
                          triggerSuccess(isZh ? '西马物流配送价格微调同步成功！' : 'Shipping rates updated & saved successfully!');
                        }}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold cursor-pointer transition-colors mt-2"
                      >
                        {isZh ? '保存冷链运费规则' : 'Save Shipping Rules'}
                      </button>
                    </div>
                  </div>

                  {/* Postal shipment test simulator */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs lg:col-span-6 space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">{isZh ? '邮编冷链配送可行性测试' : 'Postal Code Coverage Checker Tool'}</h4>
                    
                    <form onSubmit={handleTestShipment} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            {isZh ? '输入 5 位数邮编 (例: 27600)' : '5-Digit Postal Code'}
                          </label>
                          <input
                            type="text"
                            maxLength={5}
                            placeholder="27600"
                            value={testPostcode}
                            onChange={(e) => setTestPostcode(e.target.value.replace(/\D/g, ''))}
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            {isZh ? '测试省份' : 'State'}
                          </label>
                          <select
                            value={testState}
                            onChange={(e) => setTestState(e.target.value)}
                            className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                          >
                            <option value="Pahang">Pahang</option>
                            <option value="Selangor">Selangor</option>
                            <option value="Kuala Lumpur">Kuala Lumpur</option>
                            <option value="Johor">Johor</option>
                            <option value="Penang">Penang</option>
                            <option value="Perak">Perak</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        {isZh ? '核准计算配送费' : 'Verify Postal Shipping Cost'}
                      </button>
                    </form>

                    {testResult && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs font-sans">
                        <p className="flex justify-between">
                          <span className="text-slate-400">{isZh ? '测试区域分区:' : 'Logistics Zone:'}</span>
                          <span className="text-slate-800 font-bold">{testResult.zone}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-slate-400">{isZh ? '计算得出冷链运费:' : 'Calculated Shipping Cost:'}</span>
                          <span className="text-sky-600 font-mono font-black">RM {testResult.fee.toFixed(2)}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-slate-400">{isZh ? '是否支持送货上门:' : 'Home Delivery Status:'}</span>
                          <span className="text-emerald-600 font-bold flex items-center">
                            <Check className="w-3.5 h-3.5 mr-0.5" /> {isZh ? '支持 (全程冷链温控)' : 'Supported (Temp Controlled Cold-Chain)'}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* ============================================================== */}
            /* TAB: STOREFRONT SETTINGS                                       */
            /* ============================================================== */
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{isZh ? '店面运行及商城状态设置' : 'Storefront Administration'}</h3>
                  <p className="text-xs text-slate-500">{isZh ? '配置店面的网站通告、维护状态等。可以实时更改对顾客展示的文字' : 'Manage Maintenance mode, announcement banners, and portal credentials.'}</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{isZh ? '商城公告栏文本编辑' : 'Storefront Header Announcement'}</h4>
                      <p className="text-[10px] text-slate-400">{isZh ? '此文字将滚动展示在顾客商城页面的最顶部' : 'This text is displayed continuously at the top banner of the storefront'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <textarea
                      value={storeAnnouncement}
                      onChange={(e) => setFormDescriptionZh(e.target.value)} // Temporary save state in existing text handler or update directly
                      onBlur={() => {
                        // Store the blur value as active announcement
                        setStoreAnnouncement(formDescriptionZh);
                        localStorage.setItem('raub_hang_seng_announcement', formDescriptionZh);
                      }}
                      rows={3}
                      placeholder={isZh ? '输入公告。例：【公告】由于近期河水上涨，忘不了鱼捕捞量有限，下单前请WhatsApp客服核对现货！' : 'Enter announcement, e.g. Due to rapid river levels rising, Wild caught Empurau is strictly limited!'}
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 italic">
                        {isZh ? '💡 输入完成后点击下方按钮将永久保存' : '💡 Values will lock to client memory when saved.'}
                      </span>
                      <button
                        onClick={() => {
                          localStorage.setItem('raub_hang_seng_announcement', storeAnnouncement);
                          triggerSuccess(isZh ? '网站顶部公告更新成功！' : 'Top announcement banner synced successfully!');
                        }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {isZh ? '保存公告文本' : 'Save Announcement'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">{isZh ? '超级管理员与维护模式' : 'Failsafe Settings'}</h4>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-sans">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-800 block">{isZh ? '休假/系统重建模式' : 'System Restocking Mode'}</span>
                      <p className="text-slate-500 text-[11px] leading-snug">
                        {isZh ? '在进货、暴雨期或系统盘点期间，开启后前台页面将展示精美的维护过渡页面，禁止顾客下单，但您仍可通过登录超级管理员后台随时关闭它。' : 'When enabled, storefront is frozen under restock mode. Guests cannot add items, but you can override.'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setIsMaintenanceMode(!isMaintenanceMode);
                        triggerSuccess(isMaintenanceMode ? '店面开启运作' : '店面封存维护');
                      }}
                      className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-colors ${
                        isMaintenanceMode 
                          ? 'bg-amber-600 text-white hover:bg-amber-500' 
                          : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isMaintenanceMode ? (isZh ? '🔴 维护状态：开启' : 'ON (Restocking)') : (isZh ? '⚪ 维护状态：关闭' : 'OFF (Operating)')}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
