import {
  CartItem,
  Language,
  Product,
  ProductCutType,
  ProductOption,
  ProductOptionValue,
  ProductVariant,
} from '../types';

const CUT_LABELS: Record<ProductCutType, { zh: string; en: string }> = {
  whole: { zh: '完整整条', en: 'Whole intact' },
  cleaned: { zh: '活杀去内脏', en: 'Cleaned and gutted' },
  sliced: { zh: '薄切鱼片', en: 'Thin slices' },
  steak: { zh: '厚段轮切', en: 'Steak cuts' },
  fillet: { zh: '去骨鱼片', en: 'Boneless fillet' },
};

const getWeightValueId = (weightKg: number) => `weight-${String(weightKg).replace('.', '-')}`;
const getCutValueId = (cutType: ProductCutType) => `cut-${cutType}`;
const getVariantKey = (optionValueIds: string[] = []) => optionValueIds.join('::');

export const getCutTypeLabel = (cutType: ProductCutType, language: Language) => (
  CUT_LABELS[cutType][language]
);

export const createLegacyProductConfiguration = (product: Product) => {
  const legacyVariants = product.variants || [];
  if (legacyVariants.length === 0) {
    return { options: product.options || [], variants: legacyVariants };
  }

  const weightValues = new Map<number, ProductOptionValue>();
  const cutValues = new Map<ProductCutType, ProductOptionValue>();

  legacyVariants.forEach(variant => {
    if (!weightValues.has(variant.weightKg)) {
      weightValues.set(variant.weightKg, {
        id: getWeightValueId(variant.weightKg),
        nameZh: `${variant.weightKg.toFixed(1)} kg`,
        nameEn: `${variant.weightKg.toFixed(1)} kg`,
        weightKg: variant.weightKg,
      });
    }
    if (!cutValues.has(variant.cutType)) {
      const label = CUT_LABELS[variant.cutType];
      cutValues.set(variant.cutType, {
        id: getCutValueId(variant.cutType),
        nameZh: label.zh,
        nameEn: label.en,
        cutType: variant.cutType,
      });
    }
  });

  const options: ProductOption[] = [
    {
      id: 'weight',
      nameZh: '重量',
      nameEn: 'Weight',
      kind: 'weight',
      values: Array.from(weightValues.values()),
    },
    {
      id: 'processing',
      nameZh: '屠宰处理',
      nameEn: 'Processing',
      kind: 'cut',
      values: Array.from(cutValues.values()),
    },
  ];

  const variants = legacyVariants.map(variant => ({
    ...variant,
    optionValueIds: [getWeightValueId(variant.weightKg), getCutValueId(variant.cutType)],
  }));

  return { options, variants };
};

export const getProductConfiguration = (product: Product) => {
  const options = (product.options || []).filter(option => option.values.length > 0);
  const variants = product.variants || [];
  const hasConfiguredVariants = options.length > 0 && variants.some(variant => (
    variant.optionValueIds?.length === options.length
  ));

  return hasConfiguredVariants
    ? { options, variants }
    : createLegacyProductConfiguration(product);
};

export const buildOptionCombinations = (options: ProductOption[]): string[][] => {
  if (options.length === 0 || options.some(option => option.values.length === 0)) return [];

  return options.reduce<string[][]>(
    (combinations, option) => combinations.flatMap(combination => (
      option.values.map(value => [...combination, value.id])
    )),
    [[]],
  );
};

const findOptionValue = (options: ProductOption[], valueId: string) => {
  for (const option of options) {
    const value = option.values.find(item => item.id === valueId);
    if (value) return { option, value };
  }
  return null;
};

export const syncVariantsWithOptions = (
  options: ProductOption[],
  existingVariants: ProductVariant[],
  defaults: { weightKg: number; cutType: ProductCutType; image: string },
) => {
  const variantsByKey = new Map(existingVariants.map(variant => [getVariantKey(variant.optionValueIds), variant]));

  return buildOptionCombinations(options).map(optionValueIds => {
    const exactVariant = variantsByKey.get(getVariantKey(optionValueIds));
    const inheritedVariant = exactVariant || existingVariants.find(variant => {
      const existingValueIds = variant.optionValueIds || [];
      return existingValueIds.every(valueId => optionValueIds.includes(valueId)) ||
        optionValueIds.every(valueId => existingValueIds.includes(valueId));
    });
    const selectedValues = optionValueIds
      .map(valueId => findOptionValue(options, valueId)?.value)
      .filter((value): value is ProductOptionValue => Boolean(value));
    const weightKg = selectedValues.find(value => value.weightKg !== undefined)?.weightKg ?? defaults.weightKg;
    const cutType = selectedValues.find(value => value.cutType !== undefined)?.cutType ?? defaults.cutType;
    const nameZh = selectedValues.map(value => value.nameZh).join(' / ');
    const nameEn = selectedValues.map(value => value.nameEn).join(' / ');

    return {
      id: exactVariant?.id || `variant-${optionValueIds.join('__')}`,
      nameZh,
      nameEn,
      optionValueIds,
      weightKg,
      cutType,
      image: inheritedVariant?.image || defaults.image,
      pricePerKg: inheritedVariant?.pricePerKg,
      sku: exactVariant?.sku,
      isAvailable: inheritedVariant?.isAvailable ?? true,
    } satisfies ProductVariant;
  });
};

export const getVariantForSelection = (
  variants: ProductVariant[],
  selectedValueIds: Record<string, string>,
  options: ProductOption[],
) => {
  const orderedValueIds = options.map(option => selectedValueIds[option.id]).filter(Boolean);
  if (orderedValueIds.length !== options.length) return undefined;
  return variants.find(variant => getVariantKey(variant.optionValueIds) === getVariantKey(orderedValueIds));
};

export const getInitialVariantSelection = (options: ProductOption[], variants: ProductVariant[]) => {
  const firstVariant = variants.find(variant => variant.isAvailable !== false) || variants[0];
  const selectedValueIds: Record<string, string> = {};
  options.forEach((option, index) => {
    selectedValueIds[option.id] = firstVariant?.optionValueIds?.[index] || option.values[0]?.id || '';
  });
  return { selectedValueIds, variant: firstVariant };
};

export const getVariantPricePerKg = (product: Product, variantId?: string) => {
  const variant = variantId ? product.variants?.find(item => item.id === variantId) : undefined;
  return variant?.pricePerKg && variant.pricePerKg > 0 ? variant.pricePerKg : product.pricePerKg;
};

export const getCartItemPricePerKg = (item: CartItem) => getVariantPricePerKg(item.product, item.variantId);

export const getCartItemVariant = (item: CartItem) => (
  item.variantId ? item.product.variants?.find(variant => variant.id === item.variantId) : undefined
);

export const getCartItemOptionSummary = (item: CartItem, language: Language) => {
  const variant = getCartItemVariant(item);
  const options = item.product.options || [];
  if (!variant?.optionValueIds?.length || options.length === 0) return '';

  return variant.optionValueIds
    .map(valueId => findOptionValue(options, valueId))
    .filter((selection): selection is { option: ProductOption; value: ProductOptionValue } => Boolean(selection))
    .map(({ option, value }) => (
      `${language === 'zh' ? option.nameZh : option.nameEn}: ${language === 'zh' ? value.nameZh : value.nameEn}`
    ))
    .join(' · ');
};
