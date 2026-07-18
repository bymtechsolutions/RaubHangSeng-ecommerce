import type { Language, OrderRecord } from '../types';
import { getCartItemOptionSummary, getCartItemPricePerKg } from './productOptions';

export const invoiceIssuer = {
  name: 'Raub Hang Seng',
  subtitle: 'River Fish',
  address: '162, Jln Cheroh - Batu Malim, Kampung Baru Sungai Lui, 27600 Raub District, Pahang',
  phone: '+60 18-768 2528',
  email: 'hangsengraub@gmail.com',
};

export const getInvoiceNumber = (orderId: string) => `INV-${orderId}`;

export const getInvoiceTotals = (order: OrderRecord) => {
  const calculatedSubtotal = order.items.reduce(
    (total, item) => total + getCartItemPricePerKg(item) * item.selectedWeightKg * item.quantity,
    0,
  );

  return {
    subtotal: order.subtotal ?? calculatedSubtotal,
    shipping: order.baseShippingFee ?? order.shippingFee ?? 0,
    discount: order.discountTotal ?? order.discounts?.reduce((total, discount) => total + discount.amount, 0) ?? 0,
    total: order.total,
  };
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const money = (value: number) => `RM ${value.toFixed(2)}`;

const formatInvoiceDate = (value: string, language: Language) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-MY' : 'en-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

export interface InvoiceDocumentOptions {
  order: OrderRecord;
  language: Language;
  bankName?: string;
  bankAccountHolder?: string;
  bankAccountNumber?: string;
}

export const buildInvoiceHtml = ({
  order,
  language,
  bankName,
  bankAccountHolder,
  bankAccountNumber,
}: InvoiceDocumentOptions) => {
  const invoiceNumber = getInvoiceNumber(order.id);
  const totals = getInvoiceTotals(order);
  const rows = order.items.map((item, index) => {
    const optionZh = getCartItemOptionSummary(item, 'zh');
    const optionEn = getCartItemOptionSummary(item, 'en');
    const detail = [optionEn, optionZh !== optionEn ? optionZh : '', `${item.selectedWeightKg} kg`, item.cutType]
      .filter(Boolean)
      .join(' · ');
    const lineTotal = getCartItemPricePerKg(item) * item.selectedWeightKg * item.quantity;
    return `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(item.product.nameEn)} / ${escapeHtml(item.product.nameZh)}</strong><small>${escapeHtml(detail)}</small></td>
        <td class="num">${item.quantity}</td>
        <td class="num">${money(getCartItemPricePerKg(item))}/kg</td>
        <td class="num">${money(lineTotal)}</td>
      </tr>`;
  }).join('');
  const namedDiscountRows = (order.discounts || []).map(discount => `
    <div class="total-row discount"><span>${escapeHtml(discount.titleEn)} / ${escapeHtml(discount.titleZh)}</span><strong>- ${money(discount.amount)}</strong></div>`).join('');
  const discountRows = namedDiscountRows || (totals.discount > 0
    ? `<div class="total-row discount"><span>Discount / 优惠</span><strong>- ${money(totals.discount)}</strong></div>`
    : '');
  const address = `${order.details.address}, ${order.details.postcode} ${order.details.city}, ${order.details.state}`;
  const paymentStatus = order.payment?.status === 'confirmed'
    ? 'Confirmed / 已确认'
    : order.payment?.status === 'rejected'
      ? 'Needs review / 需复核'
      : 'Pending review / 待核对';
  const bankDetails = [
    order.payment?.bankName || bankName,
    bankAccountHolder,
    order.payment?.accountNumber || bankAccountNumber,
  ].filter(Boolean).map(escapeHtml).join(' · ');

  return `<!doctype html>
<html lang="${language === 'zh' ? 'zh-CN' : 'en'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(invoiceNumber)} · ${invoiceIssuer.name}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #1f2937; background: #f6f6f7; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", "Microsoft YaHei", sans-serif; }
    .invoice { width: min(100%, 210mm); min-height: 297mm; margin: 24px auto; padding: 18mm; background: white; box-shadow: 0 8px 30px rgba(31,41,55,.12); }
    .header, .columns, .summary { display: flex; justify-content: space-between; gap: 32px; }
    h1, h2, p { margin: 0; }
    h1 { color: #083b57; font-size: 26px; }
    h2 { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
    .muted { color: #667085; }
    .brand-subtitle { font-weight: 600; letter-spacing: .08em; }
    .invoice-title { text-align: right; }
    .invoice-title strong { display: block; font-size: 24px; color: #083b57; }
    .rule { height: 2px; margin: 24px 0; background: #083b57; }
    .columns > section { flex: 1; }
    .columns p { margin-top: 4px; }
    table { width: 100%; margin-top: 26px; border-collapse: collapse; }
    th, td { padding: 10px 8px; border-bottom: 1px solid #d8dee4; text-align: left; vertical-align: top; }
    th { color: #667085; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; }
    td small { display: block; margin-top: 3px; color: #667085; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .summary { align-items: flex-start; margin-top: 24px; }
    .notes { max-width: 55%; }
    .totals { width: 280px; }
    .total-row { display: flex; justify-content: space-between; gap: 16px; padding: 4px 0; }
    .discount { color: #0f8a5f; }
    .grand-total { margin-top: 8px; padding-top: 10px; border-top: 2px solid #1f2937; font-size: 18px; }
    .payment { margin-top: 28px; padding: 14px; border: 1px solid #d8dee4; background: #f8fafc; }
    .footer { margin-top: 44px; text-align: center; color: #667085; }
    @media print { body { background: white; } .invoice { margin: 0; min-height: auto; padding: 0; box-shadow: none; } }
    @media (max-width: 700px) { .invoice { margin: 0; padding: 24px; } .header, .columns, .summary { display: block; } .invoice-title { margin-top: 24px; text-align: left; } .columns section + section { margin-top: 20px; } .notes, .totals { max-width: none; width: 100%; } .totals { margin-top: 20px; } }
  </style>
</head>
<body>
  <main class="invoice">
    <header class="header">
      <div>
        <h1>${invoiceIssuer.name}</h1>
        <p class="brand-subtitle">${invoiceIssuer.subtitle}</p>
        <p class="muted">${invoiceIssuer.address}</p>
        <p class="muted">${invoiceIssuer.phone} · ${invoiceIssuer.email}</p>
      </div>
      <div class="invoice-title">
        <h2>Invoice / 发票</h2>
        <strong>${escapeHtml(invoiceNumber)}</strong>
        <p class="muted">${escapeHtml(formatInvoiceDate(order.date, language))}</p>
      </div>
    </header>
    <div class="rule"></div>
    <div class="columns">
      <section>
        <h2>Bill to / 账单寄送至</h2>
        <p><strong>${escapeHtml(order.details.fullName)}</strong></p>
        <p>${escapeHtml(address)}</p>
        <p>${escapeHtml(order.details.phoneNumber)}${order.details.email ? ` · ${escapeHtml(order.details.email)}` : ''}</p>
      </section>
      <section>
        <h2>Delivery / 配送</h2>
        <p><strong>${escapeHtml(order.details.deliveryDate || 'To be arranged / 待安排')}</strong></p>
        <p>${escapeHtml(order.shippingRegion === 'local' ? 'Local cold-chain / 本地冷链' : 'Outstation cold-chain / 外州冷链')}</p>
        <p>Fulfillment: ${escapeHtml(order.status || 'pending')}</p>
      </section>
    </div>
    <table>
      <thead><tr><th>#</th><th>Item / 产品</th><th class="num">Qty / 数量</th><th class="num">Rate / 单价</th><th class="num">Amount / 金额</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary">
      <section class="notes">
        <h2>Order note / 订单备注</h2>
        <p class="muted">${escapeHtml(order.details.notes || '—')}</p>
      </section>
      <section class="totals">
        <div class="total-row"><span>Subtotal / 小计</span><strong>${money(totals.subtotal)}</strong></div>
        <div class="total-row"><span>Shipping / 运费</span><strong>${money(totals.shipping)}</strong></div>
        ${discountRows}
        <div class="total-row grand-total"><span>Total / 总计</span><strong>${money(totals.total)}</strong></div>
      </section>
    </div>
    <section class="payment">
      <h2>Payment / 付款</h2>
      <p><strong>${paymentStatus}</strong>${order.payment?.reference ? ` · Ref: ${escapeHtml(order.payment.reference)}` : ''}</p>
      ${bankDetails ? `<p class="muted">${bankDetails}</p>` : ''}
    </section>
    <footer class="footer">Thank you for your business. 感谢您的支持。</footer>
  </main>
</body>
</html>`;
};

export const getInvoiceShareText = (order: OrderRecord) => {
  const invoiceNumber = getInvoiceNumber(order.id);
  return `${invoiceNumber} · ${order.details.fullName} · RM ${order.total.toFixed(2)}`;
};
