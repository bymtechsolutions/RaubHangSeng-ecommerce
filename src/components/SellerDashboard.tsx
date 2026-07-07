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
  Info,
  KeyRound,
  Upload,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { Product, CartItem, Language, DeliveryDetails, ProductMedia, ProductVariant, ProductCutType, StoreSettings, StoreDiscount, StoreDiscountScope, StoreDiscountValueType, CollectionDisplay, ProductCategory, OrderRecord, PaymentStatus } from '../types';
import { normalizeCollectionDisplays } from '../data/collections';
import { uploadStorefrontMedia } from '../lib/api';

interface SellerDashboardProps {
  language: Language;
  onClose: () => void;
  products: Product[];
  setProducts: (prods: Product[]) => void | Promise<void>;
  orderHistory: OrderRecord[];
  setOrderHistory: (orders: OrderRecord[]) => void | Promise<void>;
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
  collectionDisplays: CollectionDisplay[];
  mediaLibrary: ProductMedia[];
  discounts: StoreDiscount[];
  setDiscounts: (discounts: StoreDiscount[]) => void;
  onSaveSettings?: (settings: Partial<StoreSettings>) => void | Promise<void>;
  onChangeSellerPasscode?: (currentPasscode: string, nextPasscode: string) => void | Promise<void>;
}

type TabType = 'overview' | 'orders' | 'customers' | 'products' | 'collections' | 'discounts' | 'shipping' | 'settings';

const imageUploadMaxBytes = 2 * 1024 * 1024;
const videoUploadMaxBytes = 10 * 1024 * 1024;
const uploadGuidanceText = {
  zh: '建议图片 ≤ 2MB，视频 ≤ 10MB；会保存到共用媒体库。',
  en: 'Suggested max: images <= 2MB, videos <= 10MB. Uploads are saved to the shared media library.',
};
const imageUploadGuidanceText = {
  zh: '建议图片 ≤ 2MB；可上传新图或选择已有媒体库图片。',
  en: 'Suggested max: image <= 2MB. Upload a new image or choose one from the media library.',
};

type CustomerInsight = {
  id: string;
  displayName: string;
  phoneNumber: string;
  city: string;
  state: string;
  postcode: string;
  address: string;
  totalSpend: number;
  orderCount: number;
  itemCount: number;
  lastOrderDate: string;
  lastOrderTime: number;
  lastOrderId: string;
};

type MediaPickerTarget =
  | { kind: 'product-media' }
  | { kind: 'product-cover' }
  | { kind: 'variant-image'; index: number }
  | { kind: 'collection-image'; id: ProductCategory };

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
  collectionDisplays,
  mediaLibrary,
  discounts,
  setDiscounts,
  onSaveSettings,
  onChangeSellerPasscode,
}: SellerDashboardProps) {
  const isZh = language === 'zh';
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Search & Filter state for Orders
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderRecord | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

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
  const [formCategory, setFormCategory] = useState<ProductCategory>('wild');
  const [formDescriptionZh, setFormDescriptionZh] = useState('');
  const [formDescriptionEn, setFormDescriptionEn] = useState('');
  const [formPricePerKg, setFormPricePerKg] = useState<number>(50);
  const [formAverageWeightKg, setFormAverageWeightKg] = useState<number>(1.2);
  const [formImage, setFormImage] = useState('');
  const [formMedia, setFormMedia] = useState<ProductMedia[]>([]);
  const [formVariants, setFormVariants] = useState<ProductVariant[]>([]);
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
  const [collectionDrafts, setCollectionDrafts] = useState<CollectionDisplay[]>(() => normalizeCollectionDisplays(collectionDisplays));
  const [currentSellerPasscode, setCurrentSellerPasscode] = useState('');
  const [newSellerPasscode, setNewSellerPasscode] = useState('');
  const [confirmSellerPasscode, setConfirmSellerPasscode] = useState('');
  const [mediaPickerTarget, setMediaPickerTarget] = useState<MediaPickerTarget | null>(null);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [discountTitleZh, setDiscountTitleZh] = useState('');
  const [discountTitleEn, setDiscountTitleEn] = useState('');
  const [discountScope, setDiscountScope] = useState<StoreDiscountScope>('order');
  const [discountValueType, setDiscountValueType] = useState<StoreDiscountValueType>('percentage');
  const [discountValue, setDiscountValue] = useState(10);
  const [discountMinSubtotal, setDiscountMinSubtotal] = useState(0);
  const [discountIsActive, setDiscountIsActive] = useState(true);

  useEffect(() => {
    setCollectionDrafts(normalizeCollectionDisplays(collectionDisplays));
  }, [collectionDisplays]);

  const collectionOptions = useMemo(
    () => collectionDrafts.length > 0 ? collectionDrafts : normalizeCollectionDisplays(collectionDisplays),
    [collectionDrafts, collectionDisplays]
  );

  const dashboardCollections = useMemo(
    () => collectionDisplays.length > 0 ? collectionDisplays : normalizeCollectionDisplays(null),
    [collectionDisplays]
  );

  useEffect(() => {
    if (collectionOptions.length > 0 && !collectionOptions.some(collection => collection.id === formCategory)) {
      setFormCategory(collectionOptions[0].id);
    }
  }, [collectionOptions, formCategory]);

  const getCollectionLabel = (categoryId: ProductCategory) => {
    const collection = collectionOptions.find(item => item.id === categoryId) ||
      dashboardCollections.find(item => item.id === categoryId);

    return collection ? (isZh ? collection.titleZh : collection.titleEn) : categoryId;
  };

  // Auto-clear messages
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };
  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 3000);
  };

  const mediaLibraryImages = useMemo(
    () => mediaLibrary.filter(media => media.type === 'image'),
    [mediaLibrary]
  );

  const formatMediaSize = (size?: number) => {
    if (!size) return '';
    if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)}MB`;
    return `${Math.max(1, Math.round(size / 1024))}KB`;
  };

  const getUploadValidationMessage = (file: File, imageOnly: boolean) => {
    const supportedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const supportedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const isImage = supportedImageTypes.includes(file.type);
    const isVideo = supportedVideoTypes.includes(file.type);

    if (imageOnly && !isImage) {
      return isZh ? '此处只支持 JPG、PNG、WebP 或 GIF 图片。' : 'This field only supports JPG, PNG, WebP, or GIF images.';
    }

    if (!imageOnly && !isImage && !isVideo) {
      return isZh ? '媒体只支持 JPG、PNG、WebP、GIF、MP4、WebM 或 MOV。' : 'Media supports JPG, PNG, WebP, GIF, MP4, WebM, or MOV only.';
    }

    const maxBytes = isVideo ? videoUploadMaxBytes : imageUploadMaxBytes;
    if (file.size > maxBytes) {
      const maxMb = Math.round(maxBytes / 1024 / 1024);
      return isZh ? `文件超过 ${maxMb}MB，建议压缩后再上传。` : `File exceeds ${maxMb}MB. Please compress it before uploading.`;
    }

    return null;
  };

  const handleMaintenanceToggle = async () => {
    const nextMaintenanceMode = !isMaintenanceMode;
    await onSaveSettings?.({ maintenanceMode: nextMaintenanceMode });
    setIsMaintenanceMode(nextMaintenanceMode);
    triggerSuccess(
      nextMaintenanceMode
        ? (isZh ? '店面已切换到维护重组状态' : 'Storefront is now in maintenance mode.')
        : (isZh ? '店面恢复正常营业状态' : 'Storefront is open again.')
    );
  };

  const handleSellerPasscodeChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentSellerPasscode.trim() || !newSellerPasscode.trim()) {
      triggerError(isZh ? '请输入当前密码与新密码。' : 'Enter the current and new passcode.');
      return;
    }

    if (newSellerPasscode.trim().length < 4) {
      triggerError(isZh ? '新密码至少需要 4 个字符。' : 'New passcode must be at least 4 characters.');
      return;
    }

    if (newSellerPasscode.trim() !== confirmSellerPasscode.trim()) {
      triggerError(isZh ? '两次输入的新密码不一致。' : 'New passcodes do not match.');
      return;
    }

    try {
      await onChangeSellerPasscode?.(currentSellerPasscode, newSellerPasscode.trim());
      setCurrentSellerPasscode('');
      setNewSellerPasscode('');
      setConfirmSellerPasscode('');
      triggerSuccess(isZh ? '商家登录密码已更新。' : 'Seller passcode updated.');
    } catch (error) {
      triggerError(isZh ? '当前密码不正确，无法更新。' : 'Current passcode is incorrect.');
    }
  };

  const createMediaId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const resetDiscountForm = () => {
    setEditingDiscountId(null);
    setDiscountTitleZh('');
    setDiscountTitleEn('');
    setDiscountScope('order');
    setDiscountValueType('percentage');
    setDiscountValue(10);
    setDiscountMinSubtotal(0);
    setDiscountIsActive(true);
  };

  const getDiscountScopeLabel = (scope: StoreDiscountScope) => {
    if (scope === 'shipping') return isZh ? '运费优惠' : 'Shipping Discount';
    return isZh ? '订单优惠' : 'Order Discount';
  };

  const getDiscountValueTypeLabel = (valueType: StoreDiscountValueType) => {
    if (valueType === 'fixed') return isZh ? '固定金额' : 'Fixed Amount';
    if (valueType === 'free_shipping') return isZh ? '免运费' : 'Free Shipping';
    return isZh ? '百分比' : 'Percentage';
  };

  const formatDiscountRule = (discount: StoreDiscount) => {
    if (discount.valueType === 'free_shipping') return isZh ? '免除符合条件订单的运费' : 'Waives eligible shipping fee';
    const valueText = discount.valueType === 'percentage'
      ? `${discount.value}%`
      : `RM ${discount.value.toFixed(2)}`;
    return `${valueText} ${discount.scope === 'shipping' ? (isZh ? '运费折扣' : 'off shipping') : (isZh ? '订单折扣' : 'off order')}`;
  };

  const handleEditDiscount = (discount: StoreDiscount) => {
    setEditingDiscountId(discount.id);
    setDiscountTitleZh(discount.titleZh);
    setDiscountTitleEn(discount.titleEn);
    setDiscountScope(discount.scope);
    setDiscountValueType(discount.valueType);
    setDiscountValue(discount.value);
    setDiscountMinSubtotal(discount.minSubtotal);
    setDiscountIsActive(discount.isActive);
  };

  const persistDiscounts = async (nextDiscounts: StoreDiscount[], message: string) => {
    setDiscounts(nextDiscounts);
    await onSaveSettings?.({ discounts: nextDiscounts });
    triggerSuccess(message);
  };

  const handleDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!discountTitleZh.trim() || !discountTitleEn.trim()) {
      triggerError(isZh ? '请填写中英文优惠名称。' : 'Enter both Chinese and English discount names.');
      return;
    }

    const normalizedValueType = discountScope === 'order' && discountValueType === 'free_shipping'
      ? 'percentage'
      : discountValueType;
    const normalizedValue = normalizedValueType === 'free_shipping'
      ? 0
      : Math.max(0, Number(discountValue) || 0);

    if (normalizedValueType !== 'free_shipping' && normalizedValue <= 0) {
      triggerError(isZh ? '优惠数值必须大于 0。' : 'Discount value must be greater than 0.');
      return;
    }

    if (normalizedValueType === 'percentage' && normalizedValue > 100) {
      triggerError(isZh ? '百分比优惠不可超过 100%。' : 'Percentage discount cannot exceed 100%.');
      return;
    }

    const discount: StoreDiscount = {
      id: editingDiscountId || createMediaId('discount'),
      titleZh: discountTitleZh.trim(),
      titleEn: discountTitleEn.trim(),
      scope: discountScope,
      valueType: normalizedValueType,
      value: normalizedValue,
      minSubtotal: Math.max(0, Number(discountMinSubtotal) || 0),
      isActive: discountIsActive,
    };

    const nextDiscounts = editingDiscountId
      ? discounts.map(item => item.id === editingDiscountId ? discount : item)
      : [discount, ...discounts];

    await persistDiscounts(
      nextDiscounts,
      editingDiscountId
        ? (isZh ? '优惠规则已更新。' : 'Discount rule updated.')
        : (isZh ? '新优惠规则已新增。' : 'New discount rule added.')
    );
    resetDiscountForm();
  };

  const handleToggleDiscount = async (discountId: string) => {
    const nextDiscounts = discounts.map(discount => (
      discount.id === discountId ? { ...discount, isActive: !discount.isActive } : discount
    ));
    await persistDiscounts(nextDiscounts, isZh ? '优惠启用状态已同步。' : 'Discount status synced.');
  };

  const handleDeleteDiscount = async (discountId: string) => {
    const nextDiscounts = discounts.filter(discount => discount.id !== discountId);
    await persistDiscounts(nextDiscounts, isZh ? '优惠规则已删除。' : 'Discount rule deleted.');
    if (editingDiscountId === discountId) {
      resetDiscountForm();
    }
  };

  const createCollectionId = (value: string) => (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );

  const createUniqueCollectionId = (baseValue: string, existingCollections: CollectionDisplay[]) => {
    const baseId = createCollectionId(baseValue) || 'collection';
    let nextId = baseId;
    let suffix = 2;

    while (existingCollections.some(collection => collection.id === nextId)) {
      nextId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    return nextId;
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const saveMediaLibrary = async (uploadedMedia: ProductMedia[]) => {
    if (uploadedMedia.length === 0) return;

    const mediaByUrl = new Map<string, ProductMedia>();
    [...mediaLibrary, ...uploadedMedia].forEach(media => {
      mediaByUrl.set(media.url, media);
    });

    await onSaveSettings?.({ mediaLibrary: Array.from(mediaByUrl.values()) });
  };

  const fileToMedia = async (file: File): Promise<ProductMedia> => {
    const dataUrl = await readFileAsDataUrl(file);
    const response = await uploadStorefrontMedia({
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl,
    });

    return response.media;
  };

  const isMediaPickerImageOnly = mediaPickerTarget?.kind !== 'product-media';
  const visibleGalleryMedia = isMediaPickerImageOnly ? mediaLibraryImages : mediaLibrary;

  const getMediaPickerTitle = () => {
    if (!mediaPickerTarget) return isZh ? '媒体图库' : 'Media Gallery';
    if (mediaPickerTarget.kind === 'product-media') return isZh ? '选择产品媒体' : 'Select Product Media';
    if (mediaPickerTarget.kind === 'product-cover') return isZh ? '选择产品封面' : 'Select Product Cover';
    if (mediaPickerTarget.kind === 'variant-image') return isZh ? '选择规格图片' : 'Select Variant Image';
    return isZh ? '选择系列封面' : 'Select Collection Cover';
  };

  const isGalleryMediaSelected = (media: ProductMedia) => {
    if (!mediaPickerTarget) return false;
    if (mediaPickerTarget.kind === 'product-media') return formMedia.some(item => item.url === media.url);
    if (mediaPickerTarget.kind === 'product-cover') return formImage === media.url;
    if (mediaPickerTarget.kind === 'variant-image') return formVariants[mediaPickerTarget.index]?.image === media.url;
    return collectionDrafts.find(collection => collection.id === mediaPickerTarget.id)?.image === media.url;
  };

  const applyGalleryMediaSelection = (media: ProductMedia) => {
    if (!mediaPickerTarget) return;

    if (isMediaPickerImageOnly && media.type !== 'image') {
      triggerError(isZh ? '此位置只能选择图片。' : 'This field only accepts images.');
      return;
    }

    if (mediaPickerTarget.kind === 'product-media') {
      setFormMedia(prev => prev.some(item => item.url === media.url) ? prev : [...prev, media]);
      if (media.type === 'image' && !formImage.trim()) {
        setFormImage(media.url);
      }
      triggerSuccess(isZh ? '媒体已加入产品图库。' : 'Media added to product gallery.');
      return;
    }

    if (mediaPickerTarget.kind === 'product-cover') {
      setFormImage(media.url);
      setMediaPickerTarget(null);
      triggerSuccess(isZh ? '产品封面已选择。' : 'Product cover selected.');
      return;
    }

    if (mediaPickerTarget.kind === 'variant-image') {
      handleUpdateVariant(mediaPickerTarget.index, { image: media.url });
      setMediaPickerTarget(null);
      triggerSuccess(isZh ? '规格图片已选择。' : 'Variant image selected.');
      return;
    }

    handleUpdateCollectionDraft(mediaPickerTarget.id, { image: media.url });
    setMediaPickerTarget(null);
    triggerSuccess(isZh ? '系列封面已选择。' : 'Collection cover selected.');
  };

  const applyUploadedGalleryMedia = (uploadedMedia: ProductMedia[]) => {
    if (!mediaPickerTarget || uploadedMedia.length === 0) return;

    if (mediaPickerTarget.kind === 'product-media') {
      setFormMedia(prev => {
        const mediaByUrl = new Map<string, ProductMedia>();
        [...prev, ...uploadedMedia].forEach(media => mediaByUrl.set(media.url, media));
        return Array.from(mediaByUrl.values());
      });

      const firstImage = uploadedMedia.find(media => media.type === 'image');
      if (!formImage.trim() && firstImage) {
        setFormImage(firstImage.url);
      }
      return;
    }

    const firstImage = uploadedMedia.find(media => media.type === 'image');
    if (firstImage) {
      applyGalleryMediaSelection(firstImage);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.currentTarget.files ? Array.from(e.currentTarget.files) : [];
    if (files.length === 0) return;

    const imageOnly = isMediaPickerImageOnly;
    const validationMessage = files.map(file => getUploadValidationMessage(file, imageOnly)).find(Boolean);
    if (validationMessage) {
      triggerError(validationMessage);
      e.target.value = '';
      return;
    }

    try {
      const uploadedMedia = await Promise.all(files.map(fileToMedia));
      await saveMediaLibrary(uploadedMedia);
      applyUploadedGalleryMedia(uploadedMedia);
      triggerSuccess(isZh ? '媒体已上传到图库。' : 'Media uploaded to gallery.');
    } catch (error) {
      triggerError(isZh ? '媒体上传失败，请重试。' : 'Media upload failed. Please retry.');
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveMedia = (mediaId: string) => {
    setFormMedia(prev => prev.filter(media => media.id !== mediaId));
  };

  const handleAddVariant = () => {
    const variantNumber = formVariants.length + 1;
    const fallbackImage = formMedia.find(media => media.type === 'image')?.url || formImage.trim();
    setFormVariants(prev => [
      ...prev,
      {
        id: createMediaId('variant'),
        nameZh: `规格 ${variantNumber}`,
        nameEn: `Variant ${variantNumber}`,
        weightKg: Number(formAverageWeightKg) || 1,
        cutType: 'cleaned',
        image: fallbackImage,
      },
    ]);
  };

  const handleUpdateVariant = (index: number, updates: Partial<ProductVariant>) => {
    setFormVariants(prev => prev.map((variant, variantIndex) => (
      variantIndex === index ? { ...variant, ...updates } : variant
    )));
  };

  const handleRemoveVariant = (index: number) => {
    setFormVariants(prev => prev.filter((_, variantIndex) => variantIndex !== index));
  };

  const handleUpdateCollectionDraft = (id: ProductCategory, updates: Partial<CollectionDisplay>) => {
    setCollectionDrafts(prev => normalizeCollectionDisplays(
      prev.map(collection => collection.id === id ? { ...collection, ...updates } : collection)
    ));
  };

  const handleAddCollectionDraft = () => {
    setCollectionDrafts(prev => {
      const nextNumber = prev.length + 1;
      const id = createUniqueCollectionId(`collection-${nextNumber}`, prev);
      return normalizeCollectionDisplays([
        ...prev,
        {
          id,
          titleZh: `系列 ${nextNumber}`,
          titleEn: `Collection ${nextNumber}`,
          descZh: '',
          descEn: '',
          image: prev[0]?.image || 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1200&q=80',
          imagePositionX: 50,
          imagePositionY: 50,
          imageScale: 1,
        },
      ]);
    });
  };

  const handleCollectionIdChange = (id: ProductCategory, value: string) => {
    const nextId = createCollectionId(value);
    if (!nextId) return;

    setCollectionDrafts(prev => {
      const duplicate = prev.some(collection => collection.id !== id && collection.id === nextId);
      if (duplicate) return prev;

      return normalizeCollectionDisplays(
        prev.map(collection => collection.id === id ? { ...collection, id: nextId } : collection)
      );
    });

    if (formCategory === id) {
      setFormCategory(nextId);
    }
  };

  const handleRemoveCollectionDraft = async (id: ProductCategory) => {
    const targetCollection = collectionDrafts.find(collection => collection.id === id);
    if (!targetCollection) return;

    const remainingCollections = normalizeCollectionDisplays(collectionDrafts.filter(collection => collection.id !== id));
    const assignedProducts = products.filter(product => product.category === id);

    if (assignedProducts.length > 0) {
      const fallbackCollection = remainingCollections[0];
      if (!fallbackCollection) {
        triggerError(isZh ? '此系列仍有商品。请先新增另一个系列或把商品改到其他系列。' : 'This collection still has products. Add another collection or move the products first.');
        return;
      }

      const confirmed = confirm(
        isZh
          ? `此系列有 ${assignedProducts.length} 个商品。删除后会自动移到「${fallbackCollection.titleZh}」。继续？`
          : `This collection has ${assignedProducts.length} products. They will move to "${fallbackCollection.titleEn}". Continue?`
      );
      if (!confirmed) return;

      await setProducts(products.map(product => (
        product.category === id ? { ...product, category: fallbackCollection.id } : product
      )));
    }

    setCollectionDrafts(remainingCollections);
    if (formCategory === id) {
      setFormCategory(remainingCollections[0]?.id || 'wild');
    }
    triggerSuccess(isZh ? '系列已删除。请保存系列设置同步到前台。' : 'Collection removed. Save collections to sync the storefront.');
  };

  const handleSaveCollections = async () => {
    const normalizedCollections = normalizeCollectionDisplays(collectionDrafts);
    await onSaveSettings?.({ collections: normalizedCollections });
    setCollectionDrafts(normalizedCollections);
    triggerSuccess(isZh ? '系列设置已保存并同步到前台。' : 'Collection settings saved and synced to the storefront.');
  };

  // -------------------------------------------------------------
  // CALCULATED METRICS FOR OVERVIEW
  // -------------------------------------------------------------
  const salesMetrics = useMemo(() => {
    // Filter active/valid orders (exclude cancelled for sales volume but show count)
    const validOrders = orderHistory.filter(o => o.status !== 'cancelled');
    const totalSales = validOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orderHistory.length;
    const avgOrderVal = validOrders.length > 0 ? totalSales / validOrders.length : 0;
    
    // Revenue by category
    const categoryRevenue: Record<string, number> = {};
    dashboardCollections.forEach(collection => {
      categoryRevenue[collection.id] = 0;
    });

    validOrders.forEach(order => {
      order.items?.forEach((item: any) => {
        const cat = item.product?.category || 'wild';
        categoryRevenue[cat] = (categoryRevenue[cat] || 0) + item.product.pricePerKg * item.selectedWeightKg * item.quantity;
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
  }, [dashboardCollections, orderHistory]);

  const customerInsights = useMemo(() => {
    const customerMap = new Map<string, CustomerInsight>();
    const validOrders = orderHistory.filter(order => order.status !== 'cancelled');

    validOrders.forEach(order => {
      const details = order.details;
      const phoneNumber = details?.phoneNumber?.trim() || '';
      const normalizedPhone = phoneNumber.replace(/\D/g, '');
      const fullName = details?.fullName?.trim() || '';
      const memberKey = order.userId?.trim().toLowerCase();
      const customerKey = memberKey
        ? `member:${memberKey}`
        : normalizedPhone
          ? `phone:${normalizedPhone}`
          : `order:${order.id}`;
      const parsedDate = Date.parse(order.date || '');
      const orderTime = Number.isNaN(parsedDate) ? 0 : parsedDate;
      const itemCount = order.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
      const existing = customerMap.get(customerKey);

      if (existing) {
        existing.totalSpend += Number(order.total) || 0;
        existing.orderCount += 1;
        existing.itemCount += itemCount;
        if (orderTime >= existing.lastOrderTime) {
          existing.displayName = fullName || existing.displayName;
          existing.phoneNumber = phoneNumber || existing.phoneNumber;
          existing.city = details?.city || existing.city;
          existing.state = details?.state || existing.state;
          existing.postcode = details?.postcode || existing.postcode;
          existing.address = details?.address || existing.address;
          existing.lastOrderDate = order.date;
          existing.lastOrderTime = orderTime;
          existing.lastOrderId = order.id;
        }
        return;
      }

      customerMap.set(customerKey, {
        id: customerKey,
        displayName: fullName || (isZh ? '未命名客户' : 'Unnamed customer'),
        phoneNumber: phoneNumber || '-',
        city: details?.city || '-',
        state: details?.state || '-',
        postcode: details?.postcode || '-',
        address: details?.address || '-',
        totalSpend: Number(order.total) || 0,
        orderCount: 1,
        itemCount,
        lastOrderDate: order.date,
        lastOrderTime: orderTime,
        lastOrderId: order.id,
      });
    });

    const customers = Array.from(customerMap.values()).sort((a, b) => {
      if (b.totalSpend !== a.totalSpend) return b.totalSpend - a.totalSpend;
      return b.lastOrderTime - a.lastOrderTime;
    });
    const totalSpend = customers.reduce((sum, customer) => sum + customer.totalSpend, 0);
    const totalOrders = customers.reduce((sum, customer) => sum + customer.orderCount, 0);
    const repeatCustomers = customers.filter(customer => customer.orderCount > 1).length;

    return {
      customers,
      totalSpend,
      totalOrders,
      repeatCustomers,
      averageSpend: customers.length > 0 ? totalSpend / customers.length : 0,
      topCustomer: customers[0] || null,
    };
  }, [orderHistory, isZh]);

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
    setFormMedia(product.media?.length ? product.media : product.image ? [{
      id: createMediaId('media'),
      url: product.image,
      type: 'image',
      name: 'Cover image',
    }] : []);
    setFormVariants(product.variants || []);
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
    setFormMedia([]);
    setFormVariants([]);
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
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formNameZh || !formNameEn || !formId || formPricePerKg <= 0) {
      triggerError(isZh ? '请填写关键字段：ID、中英文名称、价格' : 'Please fill primary fields: ID, Names, Price');
      return;
    }

    const cleanId = formId.toLowerCase().trim().replace(/\s+/g, '-');

    const fallbackImage = 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80';
    const coverImage = formImage.trim() || formMedia.find(media => media.type === 'image')?.url || fallbackImage;
    const normalizedMedia = formMedia.map(media => ({
      ...media,
      name: media.name?.trim() || undefined,
    }));
    const normalizedVariants = formVariants.map((variant, index) => ({
      ...variant,
      id: variant.id || createMediaId('variant'),
      nameZh: variant.nameZh.trim() || `规格 ${index + 1}`,
      nameEn: variant.nameEn.trim() || `Variant ${index + 1}`,
      weightKg: Number(variant.weightKg) || Number(formAverageWeightKg) || 1,
      cutType: variant.cutType,
      image: variant.image || coverImage,
    }));

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
      image: coverImage,
      media: normalizedMedia,
      variants: normalizedVariants,
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
    let successMessage = '';

    if (isAddingNew) {
      // Check duplicate ID
      if (products.some(p => p.id === cleanId)) {
        triggerError(isZh ? '此产品 ID 已存在，请换一个 ID' : 'Product ID already exists, please use a unique ID');
        return;
      }
      updatedProducts.push(formattedProduct);
      successMessage = isZh ? '全新河鱼产品已添加上架！' : 'New river fish product added successfully!';
    } else {
      // Editing mode
      const index = products.findIndex(p => p.id === editingProduct?.id);
      if (index > -1) {
        updatedProducts[index] = formattedProduct;
        successMessage = isZh ? '产品信息更新成功！' : 'Product updated successfully!';
      } else {
        triggerError('Product not found in state catalog');
        return;
      }
    }

    try {
      await setProducts(updatedProducts);
    } catch {
      triggerError(isZh ? '媒体文件太大，浏览器本地储存空间不足。请减少视频或使用较小图片。' : 'Media is too large for browser storage. Use smaller images or fewer videos.');
      return;
    }

    triggerSuccess(successMessage);
    resetProductForm();
  };

  // Handle Delete Product
  const handleDeleteProduct = async (pId: string) => {
    if (confirm(isZh ? '确定要下架并删除此河鱼产品吗？' : 'Are you sure you want to delete and unlist this product?')) {
      const filtered = products.filter(p => p.id !== pId);
      await setProducts(filtered);
      triggerSuccess(isZh ? '产品已成功下架。' : 'Product unlisted successfully.');
    }
  };

  // Handle Order Status Update
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    const updatedOrders = orderHistory.map(order => {
      if (order.id === orderId) {
        return { ...order, status };
      }
      return order;
    });

    await setOrderHistory(updatedOrders);
    triggerSuccess(isZh ? `订单 #${orderId} 状态已更新！` : `Order #${orderId} status updated!`);
    
    // Update active detail view if open
    if (selectedOrderDetail && selectedOrderDetail.id === orderId) {
      setSelectedOrderDetail({ ...selectedOrderDetail, status });
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
    let nextSelectedOrder: OrderRecord | null = null;
    const updatedOrders = orderHistory.map(order => {
      if (order.id !== orderId) return order;

      const nextOrder: OrderRecord = {
        ...order,
        status: paymentStatus === 'confirmed' && (order.status || 'pending') === 'pending'
          ? 'processing'
          : order.status,
        payment: {
          method: order.payment?.method || 'bank_transfer',
          amount: order.payment?.amount || order.total,
          ...order.payment,
          status: paymentStatus,
          ...(paymentStatus === 'confirmed'
            ? {
                confirmedAt: new Date().toISOString(),
                confirmedBy: 'seller-dashboard',
                rejectedAt: undefined,
                rejectionReason: undefined,
              }
            : {}),
          ...(paymentStatus === 'rejected'
            ? {
                rejectedAt: new Date().toISOString(),
                confirmedAt: undefined,
                confirmedBy: undefined,
              }
            : {}),
        },
      };

      nextSelectedOrder = nextOrder;
      return nextOrder;
    });

    await setOrderHistory(updatedOrders);
    triggerSuccess(
      paymentStatus === 'confirmed'
        ? (isZh ? `订单 #${orderId} 付款已确认！` : `Order #${orderId} payment confirmed!`)
        : (isZh ? `订单 #${orderId} 付款已标记为需复核。` : `Order #${orderId} payment marked for review.`)
    );

    if (selectedOrderDetail?.id === orderId && nextSelectedOrder) {
      setSelectedOrderDetail(nextSelectedOrder);
    }
  };

  const getPaymentStatusMeta = (status: PaymentStatus | undefined) => {
    switch (status) {
      case 'confirmed':
        return {
          label: isZh ? '付款已确认' : 'Payment Confirmed',
          shortLabel: isZh ? '已确认' : 'Confirmed',
          className: 'bg-emerald-100 text-emerald-800',
        };
      case 'rejected':
        return {
          label: isZh ? '水单需复核' : 'Slip Needs Review',
          shortLabel: isZh ? '需复核' : 'Review',
          className: 'bg-rose-100 text-rose-800',
        };
      case 'pending_review':
      default:
        return {
          label: isZh ? '等待核对水单' : 'Awaiting Slip Review',
          shortLabel: isZh ? '待核对' : 'Pending',
          className: 'bg-amber-100 text-amber-800',
        };
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
      const searchLower = orderSearch.toLowerCase();
      const idMatch = o.id.toLowerCase().includes(searchLower);
      const nameMatch = o.details?.fullName?.toLowerCase().includes(searchLower);
      const phoneMatch = o.details?.phoneNumber?.includes(orderSearch);
      const locMatch = o.details?.city?.toLowerCase().includes(searchLower) || o.details?.postcode?.includes(orderSearch);
      const paymentMatch = Boolean(
        o.payment?.status?.toLowerCase().includes(searchLower) ||
        o.payment?.slip?.name?.toLowerCase().includes(searchLower)
      );
      
      const textMatch = idMatch || nameMatch || phoneMatch || locMatch || paymentMatch;
      
      // Status matches
      const currentStatus = o.status || 'pending';
      const statusMatch = orderStatusFilter === 'all' || currentStatus === orderStatusFilter;

      return textMatch && statusMatch;
    });
  }, [orderHistory, orderSearch, orderStatusFilter]);

  const filteredCustomers = useMemo(() => {
    const searchLower = customerSearch.trim().toLowerCase();
    if (!searchLower) return customerInsights.customers;

    return customerInsights.customers.filter(customer => (
      customer.displayName.toLowerCase().includes(searchLower) ||
      customer.phoneNumber.toLowerCase().includes(searchLower) ||
      customer.city.toLowerCase().includes(searchLower) ||
      customer.state.toLowerCase().includes(searchLower) ||
      customer.postcode.toLowerCase().includes(searchLower) ||
      customer.lastOrderId.toLowerCase().includes(searchLower)
    ));
  }, [customerInsights.customers, customerSearch]);

  // Filtering products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const searchLower = productSearch.toLowerCase();
      const collectionLabel = getCollectionLabel(p.category).toLowerCase();
      const textMatch = 
        p.nameZh.toLowerCase().includes(searchLower) || 
        p.nameEn.toLowerCase().includes(searchLower) || 
        (p.scientificName && p.scientificName.toLowerCase().includes(searchLower)) || 
        p.id.toLowerCase().includes(searchLower) ||
        collectionLabel.includes(searchLower);

      const categoryMatch = productCategoryFilter === 'all' || p.category === productCategoryFilter;

      return textMatch && categoryMatch;
    });
  }, [collectionOptions, dashboardCollections, isZh, products, productSearch, productCategoryFilter]);

  return (
    <div id="seller-dashboard-page" className="rhs-admin-shell h-screen min-h-screen bg-slate-100 text-slate-800 overflow-hidden">
      <div className="rhs-admin-frame bg-slate-50 w-full h-full min-h-0 flex flex-col overflow-hidden">
        
        {/* DASHBOARD HEADER */}
        <div className="rhs-admin-topbar bg-slate-900 text-white p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 gap-3 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-sky-500 text-white rounded-xl">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-black tracking-wide font-sans text-white">
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
              onClick={handleMaintenanceToggle}
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
          <div className="bg-emerald-500 text-white px-6 py-3 text-xs font-bold flex items-center space-x-2 flex-shrink-0 shadow-inner">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-rose-600 text-white px-6 py-3 text-xs font-bold flex items-center space-x-2 flex-shrink-0 shadow-inner">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* MAIN BODY: SPLIT VIEW FOR DESKTOP / RESPONSIVE FOR MOBILE */}
        <div className="flex flex-1 min-h-0 overflow-hidden flex-col md:flex-row">
          
          {/* LEFT RAIL NAVIGATION */}
          <div className="rhs-admin-sidebar w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-row md:flex-col overflow-x-auto overflow-y-hidden md:overflow-x-hidden md:overflow-y-auto shrink-0 p-2 md:p-4 gap-1 flex-shrink-0 min-h-0">
            <span className="hidden md:block text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-3 px-3">
              {isZh ? '商家中心管理分类' : 'Merchant Categories'}
            </span>
            {[
              { id: 'overview', zh: '销售分析 Overview', en: 'Sales Analysis', icon: TrendingUp },
              { id: 'orders', zh: '订单管理 Orders', en: 'Orders Manager', icon: ShoppingBag },
              { id: 'customers', zh: '客户分析 Customers', en: 'Customer Spend', icon: UserIcon },
              { id: 'products', zh: '商品管理 Catalog', en: 'Product Manager', icon: Package },
              { id: 'collections', zh: '鱼类分类 Collections', en: 'Fish Categories', icon: Database },
              { id: 'discounts', zh: '优惠折扣 Discounts', en: 'Discounts', icon: DollarSign },
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
                    resetDiscountForm();
                  }}
                  className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-sky-500 text-white font-extrabold shadow-md transform translate-x-1' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{isZh ? tab.zh : tab.en}</span>
                </button>
              );
            })}
          </div>

          {/* RIGHT VIEWPORT CONTENT */}
          <div className="rhs-admin-main flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 min-h-0">
            
            {/* TAB: OVERVIEW */}
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
                      {dashboardCollections.map((collection, index) => {
                        const colors = ['bg-amber-500', 'bg-sky-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500'];
                        const cat = {
                          key: collection.id,
                          label: isZh ? collection.titleZh : collection.titleEn,
                          color: colors[index % colors.length],
                        };
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

            {/* TAB: ORDERS MANAGER */}
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
                              <th className="p-3 text-center">{isZh ? '付款' : 'Payment'}</th>
                              <th className="p-3 text-center">{isZh ? '当前状态' : 'Status'}</th>
                              <th className="p-3 text-right">{isZh ? '操作' : 'Action'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredOrders.map((order) => {
                              const ordStatus = order.status || 'pending';
                              const paymentMeta = getPaymentStatusMeta(order.payment?.status);
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
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${paymentMeta.className}`}>
                                      {paymentMeta.shortLabel}
                                    </span>
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

                        {/* Payment transfer slip review */}
                        <div className="bg-amber-50/70 p-3.5 rounded-xl text-xs space-y-3 border border-amber-200">
                          {(() => {
                            const paymentMeta = getPaymentStatusMeta(selectedOrderDetail.payment?.status);
                            const slip = selectedOrderDetail.payment?.slip;
                            return (
                              <>
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h5 className="font-bold text-slate-800 flex items-center">
                                      <DollarSign className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                                      {isZh ? '银行转账付款水单' : 'Bank Transfer Payment Slip'}
                                    </h5>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {isZh ? '核对水单后，点击确认付款即可进入处理流程。' : 'Review the slip, then confirm payment to move the order into processing.'}
                                    </p>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${paymentMeta.className}`}>
                                    {paymentMeta.shortLabel}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                  <p className="flex flex-col">
                                    <span className="text-slate-400">{isZh ? '付款方式' : 'Method'}</span>
                                    <strong className="text-slate-700">{isZh ? '银行转账' : 'Bank Transfer'}</strong>
                                  </p>
                                  <p className="flex flex-col">
                                    <span className="text-slate-400">{isZh ? '付款金额' : 'Amount'}</span>
                                    <strong className="font-mono text-slate-900">RM {(selectedOrderDetail.payment?.amount || selectedOrderDetail.total).toFixed(2)}</strong>
                                  </p>
                                </div>

                                {slip ? (
                                  <div className="rounded-xl border border-amber-200 bg-white p-2 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="truncate font-bold text-slate-800">{slip.name}</p>
                                        <p className="text-[10px] text-slate-400">
                                          {(slip.size / 1024).toFixed(0)} KB • {new Date(slip.uploadedAt).toLocaleString()}
                                        </p>
                                      </div>
                                      <a
                                        href={slip.dataUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-slate-800"
                                      >
                                        {isZh ? '打开' : 'Open'}
                                      </a>
                                    </div>

                                    {slip.type.startsWith('image/') && (
                                      <a href={slip.dataUrl} target="_blank" rel="noreferrer" className="block">
                                        <img
                                          src={slip.dataUrl}
                                          alt={isZh ? '付款水单' : 'Payment slip'}
                                          className="max-h-52 w-full rounded-lg border border-slate-100 object-contain bg-slate-50"
                                        />
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  <div className="rounded-xl border border-dashed border-amber-300 bg-white/70 p-3 text-[11px] text-amber-700">
                                    {isZh ? '此订单没有上传付款水单。旧订单可继续用物流状态处理。' : 'No payment slip was uploaded for this order. Existing orders can still be handled with fulfillment status.'}
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePaymentStatus(selectedOrderDetail.id, 'confirmed')}
                                    className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                                  >
                                    {isZh ? '确认付款' : 'Confirm Payment'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePaymentStatus(selectedOrderDetail.id, 'rejected')}
                                    className="py-1.5 px-2 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                                  >
                                    {isZh ? '标记需复核' : 'Needs Review'}
                                  </button>
                                </div>
                              </>
                            );
                          })()}
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
                        <div className="bg-sky-50/50 p-3 rounded-xl text-xs space-y-2">
                          {selectedOrderDetail.subtotal !== undefined && (
                            <p className="flex justify-between text-slate-500">
                              <span>{isZh ? '商品小计:' : 'Items subtotal:'}</span>
                              <strong className="font-mono text-slate-700">RM {selectedOrderDetail.subtotal.toFixed(2)}</strong>
                            </p>
                          )}
                          {selectedOrderDetail.shippingFee !== undefined && (
                            <p className="flex justify-between text-slate-500">
                              <span>{isZh ? '运费:' : 'Shipping:'}</span>
                              <strong className="font-mono text-slate-700">RM {(selectedOrderDetail.baseShippingFee ?? selectedOrderDetail.shippingFee).toFixed(2)}</strong>
                            </p>
                          )}
                          {selectedOrderDetail.discounts?.map((discount) => (
                            <p key={`${discount.discountId}-${discount.scope}`} className="flex justify-between text-emerald-700">
                              <span>{isZh ? discount.titleZh : discount.titleEn}</span>
                              <strong className="font-mono">- RM {discount.amount.toFixed(2)}</strong>
                            </p>
                          ))}
                          <div className="border-t border-sky-100 pt-2 flex justify-between items-center">
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

            {/* TAB: CUSTOMER SPEND ANALYSIS */}
            {activeTab === 'customers' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{isZh ? '客户消费分析' : 'Customer Spend Analysis'}</h3>
                    <p className="text-xs text-slate-500">
                      {isZh ? '根据有效订单汇总每位客户的累计消费、订单次数与最近购买记录。' : 'Summarize customer spend, order frequency, and latest purchase from active orders.'}
                    </p>
                  </div>
                  <div className="text-xs font-mono bg-white px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600">
                    {isZh ? '有效订单:' : 'Active orders:'} {customerInsights.totalOrders}
                  </div>

                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center space-x-3">
                    <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">{isZh ? '客户人数' : 'Customers'}</span>
                      <strong className="text-lg font-mono font-black text-slate-950 block">{customerInsights.customers.length}</strong>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center space-x-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">{isZh ? '客户总消费' : 'Customer Spend'}</span>
                      <strong className="text-lg font-mono font-black text-slate-950 block">RM {customerInsights.totalSpend.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center space-x-3">
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">{isZh ? '回购客户' : 'Repeat Buyers'}</span>
                      <strong className="text-lg font-mono font-black text-slate-950 block">{customerInsights.repeatCustomers}</strong>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center space-x-3">
                    <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">{isZh ? '人均消费' : 'Avg per Customer'}</span>
                      <strong className="text-lg font-mono font-black text-slate-950 block">RM {customerInsights.averageSpend.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden xl:col-span-8">
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{isZh ? '客户消费排行榜' : 'Customer Spend List'}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {isZh ? '按累计消费排序，可搜索姓名、电话、城市或订单号。' : 'Sorted by lifetime spend. Search by name, phone, city, or order ID.'}
                        </p>
                      </div>
                      <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder={isZh ? '搜索客户、电话、地区...' : 'Search customer, phone, area...'}
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    {filteredCustomers.length === 0 ? (
                      <div className="p-10 text-center text-slate-400 text-xs">
                        <UserIcon className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        {isZh ? '暂无客户消费记录。客户下单后会自动出现在这里。' : 'No customer spend records yet. Customers appear here after valid orders.'}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                              <th className="p-3">{isZh ? '客户' : 'Customer'}</th>
                              <th className="p-3">{isZh ? '地区' : 'Area'}</th>
                              <th className="p-3 text-center">{isZh ? '订单' : 'Orders'}</th>
                              <th className="p-3 text-right">{isZh ? '累计消费' : 'Spend'}</th>
                              <th className="p-3 text-right">{isZh ? '最近订单' : 'Latest'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredCustomers.map((customer, index) => (
                              <tr key={customer.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-3 min-w-52">
                                  <div className="flex items-center space-x-3">
                                    <span className="w-7 h-7 rounded-full bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center font-mono font-black text-[11px] shrink-0">
                                      {index + 1}
                                    </span>
                                    <div className="min-w-0">
                                      <strong className="text-slate-900 block truncate">{customer.displayName}</strong>
                                      <span className="text-[10px] text-slate-500 font-mono block truncate">{customer.phoneNumber}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 min-w-44">
                                  <span className="text-slate-700 font-semibold block">{customer.city}, {customer.state}</span>
                                  <span className="text-[10px] text-slate-400 font-mono block">{customer.postcode}</span>
                                </td>
                                <td className="p-3 text-center">
                                  <strong className="text-slate-900 font-mono block">{customer.orderCount}</strong>
                                  <span className="text-[10px] text-slate-400">{customer.itemCount} {isZh ? '件商品' : 'items'}</span>
                                </td>
                                <td className="p-3 text-right">
                                  <strong className="font-mono font-black text-emerald-600 block">RM {customer.totalSpend.toFixed(2)}</strong>
                                  <span className="text-[10px] text-slate-400">
                                    RM {(customer.totalSpend / customer.orderCount).toFixed(2)} {isZh ? '/ 单' : '/ order'}
                                  </span>
                                </td>
                                <td className="p-3 text-right min-w-36">
                                  <span className="text-[10px] text-slate-500 font-mono block">{customer.lastOrderDate}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOrderSearch(customer.phoneNumber !== '-' ? customer.phoneNumber : customer.displayName);
                                      setOrderStatusFilter('all');
                                      setSelectedOrderDetail(null);
                                      setActiveTab('orders');
                                    }}
                                    className="text-sky-600 hover:text-sky-500 font-bold text-[11px] underline cursor-pointer mt-1"
                                  >
                                    #{customer.lastOrderId}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="xl:col-span-4 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                      <h4 className="text-xs font-bold text-slate-800 mb-3">{isZh ? '最高消费客户' : 'Top Customer'}</h4>
                      {customerInsights.topCustomer ? (
                        <div className="space-y-4">
                          <div className="flex items-start space-x-3">
                            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                              <Award className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <strong className="text-slate-900 block truncate">{customerInsights.topCustomer.displayName}</strong>
                              <span className="text-[10px] text-slate-500 font-mono">{customerInsights.topCustomer.phoneNumber}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                              <span className="text-slate-400 block text-[10px]">{isZh ? '累计消费' : 'Spend'}</span>
                              <strong className="font-mono text-slate-900">RM {customerInsights.topCustomer.totalSpend.toFixed(2)}</strong>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                              <span className="text-slate-400 block text-[10px]">{isZh ? '订单次数' : 'Orders'}</span>
                              <strong className="font-mono text-slate-900">{customerInsights.topCustomer.orderCount}</strong>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const topCustomer = customerInsights.topCustomer;
                              if (!topCustomer) return;
                              setOrderSearch(topCustomer.phoneNumber !== '-' ? topCustomer.phoneNumber : topCustomer.displayName);
                              setOrderStatusFilter('all');
                              setSelectedOrderDetail(null);
                              setActiveTab('orders');
                            }}
                            className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                          >
                            {isZh ? '查看客户订单' : 'View Customer Orders'}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">{isZh ? '暂无客户数据。' : 'No customer data yet.'}</p>
                      )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                      <h4 className="text-xs font-bold text-slate-800 mb-3">{isZh ? '回购概况' : 'Repeat Buyer Snapshot'}</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{isZh ? '回购率' : 'Repeat rate'}</span>
                          <strong className="font-mono text-slate-900">
                            {customerInsights.customers.length > 0 ? ((customerInsights.repeatCustomers / customerInsights.customers.length) * 100).toFixed(0) : 0}%
                          </strong>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${customerInsights.customers.length > 0 ? (customerInsights.repeatCustomers / customerInsights.customers.length) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed pt-2">
                          {isZh
                            ? '此分析来自订单记录，不包含已取消订单。可用于判断老客户回购与高消费客户。'
                            : 'This view is derived from order records and excludes cancelled orders. Use it to spot repeat buyers and high-value customers.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PRODUCTS CATALOG MANAGER */}
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
                      {collectionOptions.map(collection => (
                        <option key={collection.id} value={collection.id}>
                          {isZh ? collection.titleZh : collection.titleEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Split catalog table / form layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT: Products table list */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs lg:col-span-7">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {isZh ? `上架目录（${filteredProducts.length} 款）` : `Active Storefront Catalog (${filteredProducts.length} items)`}
                      </span>
                      <span className="text-[10px] text-slate-400">{isZh ? '点击编辑进入右侧详情' : 'Use Edit to open details'}</span>
                    </div>

                    {filteredProducts.length === 0 ? (
                      <p className="text-xs text-slate-400 py-8 text-center">{isZh ? '未搜索到任何河鱼。' : 'No matching fishes found.'}</p>
                    ) : (
                      <div className="max-h-[78vh] overflow-auto">
                        <table className="w-full min-w-[760px] text-left text-xs">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                              <th className="p-3">{isZh ? '商品' : 'Product'}</th>
                              <th className="p-3">{isZh ? '系列' : 'Collection'}</th>
                              <th className="p-3 text-right">{isZh ? '价格' : 'Price'}</th>
                              <th className="p-3 text-center">{isZh ? '媒体/规格' : 'Media / Variants'}</th>
                              <th className="p-3 text-center">{isZh ? '库存' : 'Stock'}</th>
                              <th className="p-3 text-right">{isZh ? '操作' : 'Action'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredProducts.map(prod => (
                              <tr
                                key={prod.id}
                                className={`transition-colors hover:bg-slate-50/80 ${
                                  editingProduct?.id === prod.id ? 'bg-sky-50/50' : ''
                                }`}
                              >
                                <td className="p-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <img
                                      src={prod.image}
                                      alt={prod.nameEn}
                                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-bold text-slate-900 truncate">
                                        {isZh ? prod.nameZh : prod.nameEn}
                                      </h4>
                                      <p className="text-[10px] text-slate-400 font-mono truncate">#{prod.id}</p>
                                      <p className="text-[10px] text-slate-400 font-mono italic truncate">{prod.scientificName}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className="inline-flex max-w-[140px] truncate rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                                    {getCollectionLabel(prod.category)}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-mono">
                                  <strong className="block text-slate-950">RM {prod.pricePerKg}/kg</strong>
                                  <span className="text-[10px] text-slate-400">{prod.averageWeightKg}kg avg</span>
                                </td>
                                <td className="p-3 text-center font-mono text-[10px] text-slate-500">
                                  <span className="block">{prod.media?.length || 0} {isZh ? '媒体' : 'media'}</span>
                                  <span className="block">{prod.variants?.length || 0} {isZh ? '规格' : 'variants'}</span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    prod.stockStatus === 'available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                    prod.stockStatus === 'limited' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                    'bg-rose-50 text-rose-700 border border-rose-100'
                                  }`}>
                                    {prod.stockStatus === 'available' ? (isZh ? '有货' : 'Available') :
                                     prod.stockStatus === 'limited' ? (isZh ? '限量' : 'Limited') : (isZh ? '缺货' : 'Out Stock')}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleEditClick(prod)}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-100 bg-sky-50 px-2.5 py-1.5 text-[11px] font-bold text-sky-700 hover:border-sky-200 hover:bg-sky-100 cursor-pointer"
                                      title={isZh ? '编辑商品详情' : 'Edit product details'}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                      <span>{isZh ? '编辑' : 'Edit'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteProduct(prod.id)}
                                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:border-rose-200 hover:text-rose-600 cursor-pointer"
                                      title={isZh ? '删除商品' : 'Delete product'}
                                      aria-label={isZh ? '删除商品' : 'Delete product'}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Add/Edit Product live form */}
                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {isAddingNew
                            ? (isZh ? '上架全新河鱼品类' : 'Add New Species Catalog')
                            : editingProduct
                              ? (isZh ? '修改河鱼商品资料' : 'Modify Species Profile')
                              : (isZh ? '商品详情编辑' : 'Product Details Editor')}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isAddingNew
                            ? (isZh ? '配置一尾全新彭亨野生或特马鲁养殖河鱼' : 'Configure a fresh wild caught species')
                            : editingProduct
                              ? `Updating: ${editingProduct.id}`
                              : (isZh ? '从目录表格点击编辑来修改商品。' : 'Choose Edit from the catalog table to modify a product.')}
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

                    {!(editingProduct || isAddingNew) ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
                        <Package className="mx-auto h-9 w-9 text-slate-300" />
                        <h5 className="mt-3 text-sm font-bold text-slate-700">
                          {isZh ? '请选择一个商品' : 'Select a product'}
                        </h5>
                        <p className="mx-auto mt-1 max-w-[34ch] text-xs leading-5 text-slate-500">
                          {isZh ? '使用左侧表格的编辑按钮打开商品详情，或点击上方新增商品。' : 'Use the table Edit button to open product details, or add a new product from the top action.'}
                        </p>
                      </div>
                    ) : (
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
                            onChange={(e) => setFormCategory(e.target.value)}
                            className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                          >
                            {collectionOptions.map(collection => (
                              <option key={collection.id} value={collection.id}>
                                {isZh ? collection.titleZh : collection.titleEn}
                              </option>
                            ))}
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
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formImage}
                            onChange={(e) => setFormImage(e.target.value)}
                            placeholder="https://images.unsplash.com/photo-..."
                            className="flex-1 min-w-0 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => setMediaPickerTarget({ kind: 'product-cover' })}
                            className="px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-sky-300 text-slate-700 text-[11px] font-bold cursor-pointer"
                          >
                            {isZh ? '图库' : 'Gallery'}
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                              {isZh ? '产品媒体图库' : 'Product Media Gallery'}
                            </h5>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {uploadGuidanceText[isZh ? 'zh' : 'en']}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setMediaPickerTarget({ kind: 'product-media' })}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-sky-300 text-slate-700 text-[11px] font-bold cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                            <span>{isZh ? '打开图库' : 'Open gallery'}</span>
                          </button>
                        </div>

                        {formMedia.length === 0 ? (
                          <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center text-[11px] text-slate-500">
                            {isZh ? '还没有上传媒体。保存时会使用上方图片 URL 作为封面。' : 'No media uploaded yet. The image URL above will be used as the cover.'}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {formMedia.map(media => (
                              <div key={media.id} className="relative rounded-lg overflow-hidden border border-slate-200 bg-white">
                                <div className="aspect-[4/3] bg-slate-100">
                                  {media.type === 'video' ? (
                                    <video src={media.url} className="w-full h-full object-cover" muted />
                                  ) : (
                                    <img src={media.url} alt={media.name || 'Product media'} className="w-full h-full object-cover" />
                                  )}
                                </div>
                                <div className="p-2 space-y-1.5">
                                  <div className="flex items-center gap-1 text-[10px] text-slate-500 min-w-0">
                                    {media.type === 'video' ? <Video className="w-3 h-3 shrink-0" /> : <ImageIcon className="w-3 h-3 shrink-0" />}
                                    <span className="truncate">{media.name || media.type}</span>
                                  </div>
                                  {media.size && (
                                    <p className="text-[9px] text-slate-400">{formatMediaSize(media.size)}</p>
                                  )}
                                  <div className="flex items-center gap-1">
                                    {media.type === 'image' && (
                                      <button
                                        type="button"
                                        onClick={() => setFormImage(media.url)}
                                        className={`flex-1 px-2 py-1 rounded-md text-[10px] font-bold border cursor-pointer ${
                                          formImage === media.url
                                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300'
                                        }`}
                                      >
                                        {formImage === media.url ? (isZh ? '封面' : 'Cover') : (isZh ? '设封面' : 'Set cover')}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMedia(media.id)}
                                      className="px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
                                      aria-label={isZh ? '删除媒体' : 'Remove media'}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-emerald-600" />
                              {isZh ? '规格图片' : 'Variant Photos'}
                            </h5>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {imageUploadGuidanceText[isZh ? 'zh' : 'en']}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddVariant}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 text-[11px] font-bold cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{isZh ? '新增规格' : 'Add variant'}</span>
                          </button>
                        </div>

                        {formVariants.length === 0 ? (
                          <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center text-[11px] text-slate-500">
                            {isZh ? '没有规格图片时，前台会使用单条估重与清洗方式选择。' : 'Without variants, the storefront uses the standard weight and processing selectors.'}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {formVariants.map((variant, index) => (
                              <div key={variant.id} className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="flex gap-3">
                                  <div className="w-24 shrink-0">
                                    <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                                      {variant.image ? (
                                        <img src={variant.image} alt={variant.nameEn || 'Variant'} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                          <ImageIcon className="w-7 h-7" />
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setMediaPickerTarget({ kind: 'variant-image', index })}
                                      className="mt-2 w-full inline-flex items-center justify-center px-2 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:border-sky-300 text-[10px] font-bold text-slate-600 cursor-pointer"
                                    >
                                      {isZh ? '打开图库' : 'Open gallery'}
                                    </button>
                                  </div>

                                  <div className="flex-1 min-w-0 space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="text"
                                        value={variant.nameZh}
                                        onChange={(e) => handleUpdateVariant(index, { nameZh: e.target.value })}
                                        placeholder={isZh ? '中文规格名' : 'Chinese label'}
                                        className="w-full text-xs px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                                      />
                                      <input
                                        type="text"
                                        value={variant.nameEn}
                                        onChange={(e) => handleUpdateVariant(index, { nameEn: e.target.value })}
                                        placeholder="Variant label"
                                        className="w-full text-xs px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={variant.weightKg}
                                        onChange={(e) => handleUpdateVariant(index, { weightKg: Number(e.target.value) })}
                                        className="w-full text-xs px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                                      />
                                      <select
                                        value={variant.cutType}
                                        onChange={(e) => handleUpdateVariant(index, { cutType: e.target.value as ProductCutType })}
                                        className="w-full text-xs px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                                      >
                                        <option value="cleaned">{isZh ? '活杀去内脏' : 'Cleaned'}</option>
                                        <option value="whole">{isZh ? '完整整条' : 'Whole'}</option>
                                        <option value="steak">{isZh ? '厚段轮切' : 'Steak'}</option>
                                        <option value="sliced">{isZh ? '薄切鱼片' : 'Sliced'}</option>
                                        <option value="fillet">{isZh ? '去骨鱼片' : 'Fillet'}</option>
                                      </select>
                                    </div>

                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={variant.image}
                                        onChange={(e) => handleUpdateVariant(index, { image: e.target.value })}
                                        placeholder={isZh ? '或贴上规格图片 URL' : 'Or paste variant photo URL'}
                                        className="flex-1 min-w-0 text-xs px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveVariant(index)}
                                        className="px-2.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
                                        aria-label={isZh ? '删除规格' : 'Remove variant'}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* TAB: COLLECTIONS & CATEGORIES */}
            {activeTab === 'collections' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{isZh ? '首页系列展示管理' : 'Landing Collections Manager'}</h3>
                    <p className="text-xs text-slate-500">{isZh ? '管理首页中段系列卡片。每个系列可设置专属图片、缩放比例与裁切焦点。' : 'Manage the landing-page collection cards. Each collection supports its own image, zoom, and crop focus.'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddCollectionDraft}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isZh ? '新增系列' : 'Add Collection'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCollections}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isZh ? '保存首页系列设置' : 'Save Landing Collections'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {collectionDrafts.map(coll => {
                    const matchedProds = products.filter(p => p.category === coll.id);
                    return (
                      <div key={coll.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-slate-400 font-mono block">CATEGORY_KEY: {coll.id.toUpperCase()}</span>
                            <h4 className="text-sm font-bold text-slate-900 mt-1">{isZh ? coll.titleZh : coll.titleEn}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-sky-50 text-sky-700 border border-sky-100 text-xs font-bold px-2.5 py-1 rounded-full">
                              {matchedProds.length} {isZh ? '款在售商品' : 'Species listed'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCollectionDraft(coll.id)}
                              className="p-1.5 rounded-lg border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                              aria-label={isZh ? '删除系列' : 'Remove collection'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-[180px_1fr] gap-4">
                          <div className="space-y-2">
                            <div className="relative aspect-[5/4] overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                              <img
                                src={coll.image}
                                alt={isZh ? coll.titleZh : coll.titleEn}
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{
                                  objectPosition: `${coll.imagePositionX}% ${coll.imagePositionY}%`,
                                  transform: `scale(${coll.imageScale})`,
                                  transformOrigin: `${coll.imagePositionX}% ${coll.imagePositionY}%`,
                                }}
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setMediaPickerTarget({ kind: 'collection-image', id: coll.id })}
                              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-sky-300 text-slate-700 text-[11px] font-bold cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                              <span>{isZh ? '打开图库' : 'Open gallery'}</span>
                            </button>
                            <p className="text-[10px] leading-4 text-slate-500">
                              {imageUploadGuidanceText[isZh ? 'zh' : 'en']}
                            </p>
                          </div>

                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                  {isZh ? '系列 ID' : 'Collection ID'}
                                </label>
                                <input
                                  type="text"
                                  value={coll.id}
                                  onChange={(e) => handleCollectionIdChange(coll.id, e.target.value)}
                                  disabled={matchedProds.length > 0}
                                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono disabled:bg-slate-100 disabled:text-slate-400"
                                />
                                {matchedProds.length > 0 && (
                                  <p className="mt-1 text-[10px] text-slate-400">
                                    {isZh ? '已有商品使用，ID 已锁定。' : 'ID locked while products use it.'}
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                  {isZh ? '英文标题' : 'English title'}
                                </label>
                                <input
                                  type="text"
                                  value={coll.titleEn}
                                  onChange={(e) => handleUpdateCollectionDraft(coll.id, { titleEn: e.target.value })}
                                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                {isZh ? '中文标题' : 'Chinese title'}
                              </label>
                              <input
                                type="text"
                                value={coll.titleZh}
                                onChange={(e) => handleUpdateCollectionDraft(coll.id, { titleZh: e.target.value })}
                                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                  {isZh ? '中文说明' : 'Chinese description'}
                                </label>
                                <textarea
                                  value={coll.descZh}
                                  onChange={(e) => handleUpdateCollectionDraft(coll.id, { descZh: e.target.value })}
                                  rows={3}
                                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg resize-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                  {isZh ? '英文说明' : 'English description'}
                                </label>
                                <textarea
                                  value={coll.descEn}
                                  onChange={(e) => handleUpdateCollectionDraft(coll.id, { descEn: e.target.value })}
                                  rows={3}
                                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg resize-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                {isZh ? '首页图片 URL' : 'Landing image URL'}
                              </label>
                              <input
                                type="text"
                                value={coll.image}
                                onChange={(e) => handleUpdateCollectionDraft(coll.id, { image: e.target.value })}
                                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <label className="block">
                                <span className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                                  <span>{isZh ? '左右裁切' : 'Crop X'}</span>
                                  <span>{Math.round(coll.imagePositionX)}%</span>
                                </span>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={coll.imagePositionX}
                                  onChange={(e) => handleUpdateCollectionDraft(coll.id, { imagePositionX: Number(e.target.value) })}
                                  className="w-full accent-sky-600"
                                />
                              </label>
                              <label className="block">
                                <span className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                                  <span>{isZh ? '上下裁切' : 'Crop Y'}</span>
                                  <span>{Math.round(coll.imagePositionY)}%</span>
                                </span>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={coll.imagePositionY}
                                  onChange={(e) => handleUpdateCollectionDraft(coll.id, { imagePositionY: Number(e.target.value) })}
                                  className="w-full accent-sky-600"
                                />
                              </label>
                              <label className="block">
                                <span className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                                  <span>{isZh ? '缩放' : 'Zoom'}</span>
                                  <span>{coll.imageScale.toFixed(2)}x</span>
                                </span>
                                <input
                                  type="range"
                                  min="1"
                                  max="1.8"
                                  step="0.05"
                                  value={coll.imageScale}
                                  onChange={(e) => handleUpdateCollectionDraft(coll.id, { imageScale: Number(e.target.value) })}
                                  className="w-full accent-sky-600"
                                />
                              </label>
                            </div>
                          </div>
                        </div>

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

            {/* TAB: DISCOUNT RULES */}
            {activeTab === 'discounts' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{isZh ? '优惠折扣规则' : 'Discount Rules'}</h3>
                    <p className="text-xs text-slate-500">
                      {isZh ? '建立多个可叠加的订单折扣或运费折扣。启用后会自动应用在购物车与结账金额。' : 'Create multiple stackable order or shipping discounts. Active rules apply automatically in cart and checkout.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <span className="block text-slate-400">{isZh ? '全部' : 'Total'}</span>
                      <strong className="text-sm text-slate-900">{discounts.length}</strong>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <span className="block text-emerald-700">{isZh ? '启用' : 'Active'}</span>
                      <strong className="text-sm text-emerald-800">{discounts.filter(discount => discount.isActive).length}</strong>
                    </div>
                    <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
                      <span className="block text-sky-700">{isZh ? '运费' : 'Shipping'}</span>
                      <strong className="text-sm text-sky-800">{discounts.filter(discount => discount.scope === 'shipping').length}</strong>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  <form onSubmit={handleDiscountSubmit} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs xl:col-span-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          {editingDiscountId ? (isZh ? '编辑优惠' : 'Edit Discount') : (isZh ? '新增优惠' : 'Add Discount')}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isZh ? '订单优惠会扣商品小计；运费优惠会扣冷链运费。' : 'Order discounts reduce item subtotal; shipping discounts reduce cold-chain fees.'}
                        </p>
                      </div>
                      {editingDiscountId && (
                        <button
                          type="button"
                          onClick={resetDiscountForm}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                        >
                          {isZh ? '取消编辑' : 'Cancel'}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{isZh ? '中文名称' : 'Chinese Name'}</span>
                        <input
                          value={discountTitleZh}
                          onChange={(e) => setDiscountTitleZh(e.target.value)}
                          placeholder={isZh ? '例：新鲜河鱼优惠' : 'e.g. 新鲜河鱼优惠'}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{isZh ? '英文名称' : 'English Name'}</span>
                        <input
                          value={discountTitleEn}
                          onChange={(e) => setDiscountTitleEn(e.target.value)}
                          placeholder="e.g. Fresh Catch Promo"
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{isZh ? '优惠范围' : 'Discount Scope'}</span>
                        <select
                          value={discountScope}
                          onChange={(e) => {
                            const nextScope = e.target.value as StoreDiscountScope;
                            setDiscountScope(nextScope);
                            if (nextScope === 'order' && discountValueType === 'free_shipping') {
                              setDiscountValueType('percentage');
                              setDiscountValue(10);
                            }
                          }}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                        >
                          <option value="order">{isZh ? '订单优惠' : 'Order Discount'}</option>
                          <option value="shipping">{isZh ? '运费优惠' : 'Shipping Discount'}</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{isZh ? '优惠类型' : 'Discount Type'}</span>
                        <select
                          value={discountValueType}
                          onChange={(e) => setDiscountValueType(e.target.value as StoreDiscountValueType)}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                        >
                          <option value="percentage">{isZh ? '百分比折扣' : 'Percentage Off'}</option>
                          <option value="fixed">{isZh ? '固定金额折扣' : 'Fixed Amount Off'}</option>
                          {discountScope === 'shipping' && (
                            <option value="free_shipping">{isZh ? '免运费' : 'Free Shipping'}</option>
                          )}
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          {discountValueType === 'percentage' ? (isZh ? '折扣百分比 (%)' : 'Discount %') : (isZh ? '折扣金额 (RM)' : 'Amount (RM)')}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={discountValueType === 'percentage' ? 100 : undefined}
                          value={discountValue}
                          onChange={(e) => setDiscountValue(Number(e.target.value))}
                          disabled={discountValueType === 'free_shipping'}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono disabled:text-slate-400"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{isZh ? '最低商品小计 (RM)' : 'Minimum Subtotal (RM)'}</span>
                        <input
                          type="number"
                          min={0}
                          value={discountMinSubtotal}
                          onChange={(e) => setDiscountMinSubtotal(Number(e.target.value))}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDiscountIsActive(!discountIsActive)}
                      className={`w-full flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-bold cursor-pointer transition-colors ${
                        discountIsActive
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                    >
                      {discountIsActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      <span>{discountIsActive ? (isZh ? '优惠启用中' : 'Discount active') : (isZh ? '优惠已停用' : 'Discount inactive')}</span>
                    </button>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      {editingDiscountId ? (isZh ? '保存优惠修改' : 'Save Discount') : (isZh ? '新增优惠规则' : 'Add Discount Rule')}
                    </button>
                  </form>

                  <div className="xl:col-span-7 space-y-3">
                    {discounts.length === 0 ? (
                      <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-xs text-slate-400">
                        {isZh ? '暂无优惠规则。新增后会自动同步到前台购物车。' : 'No discount rules yet. Add one to sync it to the storefront cart.'}
                      </div>
                    ) : (
                      discounts.map((discount) => (
                        <div key={discount.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-black text-slate-900">{isZh ? discount.titleZh : discount.titleEn}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  discount.scope === 'shipping' ? 'bg-sky-50 text-sky-700 border border-sky-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                  {getDiscountScopeLabel(discount.scope)}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  discount.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>
                                  {discount.isActive ? (isZh ? '启用' : 'Active') : (isZh ? '停用' : 'Inactive')}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatDiscountRule(discount)} · {getDiscountValueTypeLabel(discount.valueType)}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                {isZh ? '最低商品小计:' : 'Minimum subtotal:'} RM {discount.minSubtotal.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleDiscount(discount.id)}
                                className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                                  discount.isActive ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'
                                }`}
                                aria-label={discount.isActive ? (isZh ? '停用优惠' : 'Disable discount') : (isZh ? '启用优惠' : 'Enable discount')}
                              >
                                {discount.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditDiscount(discount)}
                                className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:text-sky-600 cursor-pointer transition-colors"
                                aria-label={isZh ? '编辑优惠' : 'Edit discount'}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDiscount(discount.id)}
                                className="p-2 rounded-lg border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer transition-colors"
                                aria-label={isZh ? '删除优惠' : 'Delete discount'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SHIPPING RATES */}
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
                        onClick={async () => {
                          await onSaveSettings?.({
                            freeShippingThreshold,
                            localShippingRate,
                            outstationShippingRate,
                          });
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

            {/* TAB: STOREFRONT SETTINGS */}
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
                      onChange={(e) => setStoreAnnouncement(e.target.value)}
                      rows={3}
                      placeholder={isZh ? '输入公告。例：【公告】由于近期河水上涨，忘不了鱼捕捞量有限，下单前请WhatsApp客服核对现货！' : 'Enter announcement, e.g. Due to rapid river levels rising, Wild caught Empurau is strictly limited!'}
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 italic">
                        {isZh ? '💡 输入完成后点击下方按钮将永久保存' : '💡 Values will lock to client memory when saved.'}
                      </span>
                      <button
                        onClick={async () => {
                          await onSaveSettings?.({ storeAnnouncement });
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
                      onClick={handleMaintenanceToggle}
                      className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-colors ${
                        isMaintenanceMode 
                          ? 'bg-amber-600 text-white hover:bg-amber-500' 
                          : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isMaintenanceMode ? (isZh ? '🔴 维护状态：开启' : 'ON (Restocking)') : (isZh ? '⚪ 维护状态：关闭' : 'OFF (Operating)')}
                    </button>
                  </div>

                  <form onSubmit={handleSellerPasscodeChange} className="border-t border-slate-100 pt-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-800">
                          {isZh ? '更改商家登录密码' : 'Change Seller Login Passcode'}
                        </h5>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          {isZh ? '默认密码为 8888。更新后，请使用新密码进入 /seller。' : 'Default passcode is 8888. After updating, use the new passcode for /seller.'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="block">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          {isZh ? '当前密码' : 'Current Passcode'}
                        </span>
                        <input
                          type="password"
                          value={currentSellerPasscode}
                          onChange={(e) => setCurrentSellerPasscode(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                          autoComplete="current-password"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          {isZh ? '新密码' : 'New Passcode'}
                        </span>
                        <input
                          type="password"
                          value={newSellerPasscode}
                          onChange={(e) => setNewSellerPasscode(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                          autoComplete="new-password"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          {isZh ? '确认新密码' : 'Confirm New Passcode'}
                        </span>
                        <input
                          type="password"
                          value={confirmSellerPasscode}
                          onChange={(e) => setConfirmSellerPasscode(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                          autoComplete="new-password"
                        />
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {isZh ? '更新登录密码' : 'Update Passcode'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {mediaPickerTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="absolute inset-0" onClick={() => setMediaPickerTarget(null)} />
          <div className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl flex flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-900 px-5 py-4">
              <div>
                <h3 className="text-sm font-black text-white">{getMediaPickerTitle()}</h3>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">
                  {isMediaPickerImageOnly
                    ? (isZh ? '此位置只接受图片。可上传新图片到图库，或选择已上传图片。' : 'This field accepts images only. Upload a new image to the gallery or select an existing one.')
                    : (isZh ? '可选择图片或视频加入产品媒体。上传的新媒体会保存到共用图库。' : 'Select images or videos for product media. New uploads are saved to the shared gallery.')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-sky-500 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isZh ? '上传到图库' : 'Upload to gallery'}</span>
                  <input
                    type="file"
                    accept={isMediaPickerImageOnly ? 'image/jpeg,image/png,image/webp,image/gif' : 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime'}
                    multiple={!isMediaPickerImageOnly}
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setMediaPickerTarget(null)}
                  className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:text-white cursor-pointer"
                  aria-label={isZh ? '关闭图库' : 'Close gallery'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-5">
              {visibleGalleryMedia.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
                  <ImageIcon className="mx-auto h-10 w-10 text-slate-600" />
                  <p className="mt-3 text-xs font-bold text-slate-300">
                    {isZh ? '图库还没有可选择的媒体' : 'No selectable media in the gallery yet'}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {isZh ? '点击上方「上传到图库」加入媒体。' : 'Use Upload to gallery above to add media.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {visibleGalleryMedia.map((media) => {
                    const isSelected = isGalleryMediaSelected(media);
                    return (
                      <div key={media.url} className={`overflow-hidden rounded-xl border bg-slate-900 ${
                        isSelected ? 'border-sky-400' : 'border-slate-800'
                      }`}>
                        <div className="aspect-video bg-slate-950">
                          {media.type === 'video' ? (
                            <video
                              src={media.url}
                              className="h-full w-full object-contain"
                              controls
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={media.url}
                              alt={media.name || 'Media'}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="space-y-2 p-3">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 min-w-0">
                            {media.type === 'video' ? <Video className="w-3.5 h-3.5 shrink-0" /> : <ImageIcon className="w-3.5 h-3.5 shrink-0" />}
                            <span className="truncate">{media.name || media.type}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] text-slate-500">{formatMediaSize(media.size)}</span>
                            <button
                              type="button"
                              onClick={() => applyGalleryMediaSelection(media)}
                              disabled={isSelected && mediaPickerTarget.kind === 'product-media'}
                              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold cursor-pointer disabled:cursor-not-allowed ${
                                isSelected
                                  ? 'bg-sky-500/20 text-sky-200'
                                  : 'bg-white text-slate-900 hover:bg-sky-100'
                              }`}
                            >
                              {isSelected ? (isZh ? '已选择' : 'Selected') : (isZh ? '选择' : 'Select')}
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
      )}
    </div>
  );
}
