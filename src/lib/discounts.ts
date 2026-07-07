import { AppliedDiscount, StoreDiscount } from '../types';

export interface DiscountCalculation {
  subtotal: number;
  baseShippingFee: number;
  itemDiscountTotal: number;
  shippingDiscountTotal: number;
  totalDiscount: number;
  discountedSubtotal: number;
  shippingFee: number;
  totalAmount: number;
  applications: AppliedDiscount[];
}

const clampCurrency = (value: number) => Math.max(0, Number(value.toFixed(2)));

const getDiscountAmount = (discount: StoreDiscount, remainingAmount: number) => {
  if (remainingAmount <= 0) return 0;
  if (discount.valueType === 'free_shipping') return remainingAmount;
  if (discount.valueType === 'percentage') {
    const percentage = Math.min(Math.max(Number(discount.value) || 0, 0), 100);
    return remainingAmount * (percentage / 100);
  }
  return Number(discount.value) || 0;
};

export const calculateDiscounts = (
  discounts: StoreDiscount[],
  subtotal: number,
  baseShippingFee: number
): DiscountCalculation => {
  let remainingSubtotal = Math.max(0, subtotal);
  let remainingShipping = Math.max(0, baseShippingFee);
  const applications: AppliedDiscount[] = [];

  discounts
    .filter(discount => discount.isActive && subtotal >= Math.max(0, Number(discount.minSubtotal) || 0))
    .forEach((discount) => {
      if (discount.scope === 'order') {
        if (discount.valueType === 'free_shipping') return;
        const amount = Math.min(remainingSubtotal, getDiscountAmount(discount, remainingSubtotal));
        if (amount <= 0) return;
        remainingSubtotal = clampCurrency(remainingSubtotal - amount);
        applications.push({
          discountId: discount.id,
          titleZh: discount.titleZh,
          titleEn: discount.titleEn,
          scope: discount.scope,
          valueType: discount.valueType,
          amount: clampCurrency(amount),
        });
        return;
      }

      const amount = Math.min(remainingShipping, getDiscountAmount(discount, remainingShipping));
      if (amount <= 0) return;
      remainingShipping = clampCurrency(remainingShipping - amount);
      applications.push({
        discountId: discount.id,
        titleZh: discount.titleZh,
        titleEn: discount.titleEn,
        scope: discount.scope,
        valueType: discount.valueType,
        amount: clampCurrency(amount),
      });
    });

  const itemDiscountTotal = clampCurrency(subtotal - remainingSubtotal);
  const shippingDiscountTotal = clampCurrency(baseShippingFee - remainingShipping);

  return {
    subtotal: clampCurrency(subtotal),
    baseShippingFee: clampCurrency(baseShippingFee),
    itemDiscountTotal,
    shippingDiscountTotal,
    totalDiscount: clampCurrency(itemDiscountTotal + shippingDiscountTotal),
    discountedSubtotal: remainingSubtotal,
    shippingFee: remainingShipping,
    totalAmount: clampCurrency(remainingSubtotal + remainingShipping),
    applications,
  };
};

export const getDiscountLabel = (discount: Pick<StoreDiscount, 'titleZh' | 'titleEn'> | Pick<AppliedDiscount, 'titleZh' | 'titleEn'>, isZh: boolean) => (
  isZh ? discount.titleZh : discount.titleEn
);
