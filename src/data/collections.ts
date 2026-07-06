import { CollectionDisplay, ProductCategory } from '../types';

const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, numberValue));
};

export const DEFAULT_COLLECTIONS: CollectionDisplay[] = [
  {
    id: 'premium',
    titleZh: '尊贵极品',
    titleEn: 'Premium Imperial',
    descZh: '忘不了鱼、苏丹鱼等国宴级河鱼，适合送礼与重要宴席。',
    descEn: 'Rare river fish for gifting, banquets, and special family tables.',
    image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&q=80',
    imagePositionX: 50,
    imagePositionY: 48,
    imageScale: 1,
  },
  {
    id: 'wild',
    titleZh: '野生捕捞',
    titleEn: 'Wild Caught',
    descZh: '来自彭亨主流与上游急流的野生河鱼，肉质扎实清甜。',
    descEn: 'Hand-caught river fish with clean, firm flesh from fast Pahang currents.',
    image: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=1200&q=80',
    imagePositionX: 50,
    imagePositionY: 50,
    imageScale: 1,
  },
  {
    id: 'aquaculture',
    titleZh: '清泉网箱养殖',
    titleEn: 'River Cage Raised',
    descZh: '特马鲁活流水网箱培育，稳定供应，适合日常清蒸与家常料理。',
    descEn: 'Temerloh river-cage fish for clean daily meals and reliable supply.',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1200&q=80',
    imagePositionX: 50,
    imagePositionY: 50,
    imageScale: 1,
  },
  {
    id: 'wellness',
    titleZh: '养生调理',
    titleEn: 'Wellness Series',
    descZh: '以生鱼、滋补鱼片与汤用河鲜为主，适合术后与产后调理。',
    descEn: 'Traditional wellness fish prepared for soups, recovery, and gentle meals.',
    image: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?auto=format&fit=crop&w=1200&q=80',
    imagePositionX: 50,
    imagePositionY: 50,
    imageScale: 1,
  },
];

export const normalizeCollectionDisplays = (
  collections?: Partial<CollectionDisplay>[] | null
): CollectionDisplay[] => {
  const incoming = Array.isArray(collections) ? collections : [];

  return DEFAULT_COLLECTIONS.map(defaultCollection => {
    const saved = incoming.find(collection => collection?.id === defaultCollection.id);

    return {
      ...defaultCollection,
      ...saved,
      id: defaultCollection.id,
      titleZh: saved?.titleZh?.trim() || defaultCollection.titleZh,
      titleEn: saved?.titleEn?.trim() || defaultCollection.titleEn,
      descZh: saved?.descZh?.trim() || defaultCollection.descZh,
      descEn: saved?.descEn?.trim() || defaultCollection.descEn,
      image: saved?.image?.trim() || defaultCollection.image,
      imagePositionX: clampNumber(saved?.imagePositionX, 0, 100, defaultCollection.imagePositionX),
      imagePositionY: clampNumber(saved?.imagePositionY, 0, 100, defaultCollection.imagePositionY),
      imageScale: clampNumber(saved?.imageScale, 1, 1.8, defaultCollection.imageScale),
    };
  });
};

export const getCollectionById = (id: ProductCategory) => (
  DEFAULT_COLLECTIONS.find(collection => collection.id === id) || DEFAULT_COLLECTIONS[0]
);
