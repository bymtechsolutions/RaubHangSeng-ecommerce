import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInvoiceHtml, getInvoiceNumber, getInvoiceShareText, getInvoiceTotals } from '../src/lib/invoice.ts';

const product = {
  id: 'patin-test',
  nameZh: '巴丁鱼',
  nameEn: 'Patin',
  scientificName: 'Pangasius',
  category: 'river-fish',
  descriptionZh: '测试',
  descriptionEn: 'Test',
  pricePerKg: 48,
  averageWeightKg: 1.2,
  image: '/test.jpg',
  tastingNotesZh: '',
  tastingNotesEn: '',
  cookingSuggestionsZh: [],
  cookingSuggestionsEn: [],
  featuresZh: [],
  featuresEn: [],
  isWild: false,
  stockStatus: 'available',
};

const order = {
  id: 'RHS-1001',
  date: '2026-07-18T04:30:00.000Z',
  items: [{ product, quantity: 2, selectedWeightKg: 1.2, cutType: 'cleaned' }],
  details: {
    fullName: '<script>Customer</script>',
    phoneNumber: '+60 12-345 6789',
    email: 'customer@example.com',
    address: '12, Jalan Test',
    postcode: '27600',
    city: 'Raub',
    state: 'Pahang',
    deliveryDate: '2026-07-20',
    notes: 'Call before arrival',
  },
  subtotal: 115.2,
  baseShippingFee: 20,
  discountTotal: 5,
  discounts: [{
    discountId: 'welcome',
    titleZh: '迎新优惠',
    titleEn: 'Welcome discount',
    scope: 'order',
    valueType: 'fixed',
    amount: 5,
  }],
  total: 130.2,
  status: 'processing',
  shippingRegion: 'local',
  payment: {
    method: 'bank_transfer',
    status: 'confirmed',
    amount: 130.2,
    reference: 'BANK-1001',
  },
};

test('builds a complete escaped bilingual invoice from persisted order data', () => {
  assert.equal(getInvoiceNumber(order.id), 'INV-RHS-1001');
  assert.deepEqual(getInvoiceTotals(order), {
    subtotal: 115.2,
    shipping: 20,
    discount: 5,
    total: 130.2,
  });

  const html = buildInvoiceHtml({
    order,
    language: 'en',
    bankName: 'Test Bank',
    bankAccountHolder: 'Raub Hang Seng',
    bankAccountNumber: '123456789',
  });

  assert.match(html, /INV-RHS-1001/);
  assert.match(html, /Patin \/ 巴丁鱼/);
  assert.match(html, /Welcome discount \/ 迎新优惠/);
  assert.match(html, /RM 130\.20/);
  assert.match(html, /BANK-1001/);
  assert.match(html, /&lt;script&gt;Customer&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>Customer<\/script>/);
  assert.equal(getInvoiceShareText(order), 'INV-RHS-1001 · <script>Customer</script> · RM 130.20');
});
