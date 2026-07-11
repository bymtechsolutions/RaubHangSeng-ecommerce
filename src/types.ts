export type Language = 'zh' | 'en';
export type ProductMediaType = 'image' | 'video';
export type ProductCutType = 'whole' | 'cleaned' | 'sliced' | 'steak' | 'fillet';
export type ProductCategory = string;

export interface CollectionDisplay {
  id: ProductCategory;
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
  image: string;
  imagePositionX: number;
  imagePositionY: number;
  imageScale: number;
}

export interface ProductMedia {
  id: string;
  url: string;
  type: ProductMediaType;
  name?: string;
  size?: number;
  mimeType?: string;
  uploadedAt?: string;
}

export type ProductOptionKind = 'weight' | 'cut' | 'custom';

export interface ProductOptionValue {
  id: string;
  nameZh: string;
  nameEn: string;
  weightKg?: number;
  cutType?: ProductCutType;
}

export interface ProductOption {
  id: string;
  nameZh: string;
  nameEn: string;
  kind: ProductOptionKind;
  values: ProductOptionValue[];
}

export interface ProductVariant {
  id: string;
  nameZh: string;
  nameEn: string;
  optionValueIds?: string[];
  weightKg: number;
  cutType: ProductCutType;
  image: string;
  pricePerKg?: number;
  sku?: string;
  isAvailable?: boolean;
}

export interface Product {
  id: string;
  nameZh: string;
  nameEn: string;
  scientificName: string;
  category: ProductCategory;
  descriptionZh: string;
  descriptionEn: string;
  pricePerKg: number;
  averageWeightKg: number; // typical weight per fish
  image: string;
  media?: ProductMedia[];
  options?: ProductOption[];
  variants?: ProductVariant[];
  tastingNotesZh: string;
  tastingNotesEn: string;
  cookingSuggestionsZh: string[];
  cookingSuggestionsEn: string[];
  featuresZh: string[];
  featuresEn: string[];
  isWild: boolean;
  stockStatus: 'available' | 'limited' | 'seasonal';
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedWeightKg: number;
  cutType: ProductCutType;
  variantId?: string;
}

export type StoreDiscountScope = 'order' | 'shipping';
export type StoreDiscountValueType = 'percentage' | 'fixed' | 'free_shipping';

export interface StoreDiscount {
  id: string;
  titleZh: string;
  titleEn: string;
  scope: StoreDiscountScope;
  valueType: StoreDiscountValueType;
  value: number;
  minSubtotal: number;
  isActive: boolean;
}

export interface AppliedDiscount {
  discountId: string;
  titleZh: string;
  titleEn: string;
  scope: StoreDiscountScope;
  valueType: StoreDiscountValueType;
  amount: number;
}

export type PaymentMethod = 'bank_transfer';
export type PaymentStatus = 'pending_review' | 'confirmed' | 'rejected';

export interface PaymentSlip {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
}

export interface PaymentRecord {
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  reference?: string;
  slip?: PaymentSlip;
  confirmedAt?: string;
  confirmedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface OrderRecord {
  id: string;
  items: CartItem[];
  details: DeliveryDetails;
  total: number;
  date: string;
  status?: string;
  payment?: PaymentRecord;
  userId?: string;
  subtotal?: number;
  baseShippingFee?: number;
  shippingFee?: number;
  discountTotal?: number;
  discounts?: AppliedDiscount[];
}

export interface StoreSettings {
  maintenanceMode: boolean;
  freeShippingThreshold: number;
  localShippingRate: number;
  outstationShippingRate: number;
  storeAnnouncement: string;
  bankName: string;
  bankAccountHolder: string;
  bankAccountNumber: string;
  bankTransferInstructions: string;
  collections: CollectionDisplay[];
  mediaLibrary: ProductMedia[];
  discounts: StoreDiscount[];
}

export interface StoreState {
  products: Product[];
  draftProducts?: Product[];
  orders: OrderRecord[];
  settings: StoreSettings;
}

export interface DeliveryDetails {
  fullName: string;
  phoneNumber: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  deliveryDate: string;
  notes: string;
}

export interface Review {
  id: string;
  userName: string;
  rating: number;
  commentZh: string;
  commentEn: string;
  date: string;
  fishPurchasedZh: string;
  fishPurchasedEn: string;
}

export interface FAQ {
  id: string;
  questionZh: string;
  questionEn: string;
  answerZh: string;
  answerEn: string;
}

export interface User {
  username: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  email: string;
  memberPoints: number;
}

