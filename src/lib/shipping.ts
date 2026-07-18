export type ShippingRegion = 'local' | 'outstation';

export interface DeliveryCoverage {
  covered: boolean;
  region: ShippingRegion | null;
  postcode: string;
}

const localPostcodeRanges: Array<[number, number]> = [
  [25000, 28999],
  [40000, 48999],
  [50000, 60000],
  [62000, 62999],
];

export const getDeliveryCoverage = (value: unknown): DeliveryCoverage => {
  const postcode = String(value || '').trim();
  if (!/^\d{5}$/.test(postcode)) {
    return { covered: false, region: null, postcode };
  }

  const numericPostcode = Number(postcode);
  const covered = numericPostcode >= 1000 && numericPostcode <= 86999;
  if (!covered) {
    return { covered: false, region: null, postcode };
  }

  const region = localPostcodeRanges.some(([start, end]) => (
    numericPostcode >= start && numericPostcode <= end
  )) ? 'local' : 'outstation';

  return { covered: true, region, postcode };
};
