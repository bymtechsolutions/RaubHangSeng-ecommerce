export type Language = 'zh' | 'en';

export interface Product {
  id: string;
  nameZh: string;
  nameEn: string;
  scientificName: string;
  category: 'premium' | 'wild' | 'aquaculture' | 'wellness';
  descriptionZh: string;
  descriptionEn: string;
  pricePerKg: number;
  averageWeightKg: number; // typical weight per fish
  image: string;
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
  cutType: 'whole' | 'cleaned' | 'sliced' | 'steak' | 'fillet';
}

export interface DeliveryDetails {
  fullName: string;
  phoneNumber: string;
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
