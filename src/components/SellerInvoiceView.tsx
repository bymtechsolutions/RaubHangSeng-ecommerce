import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  Share2,
} from 'lucide-react';
import type { Language, OrderRecord, PaymentStatus } from '../types';
import { getCartItemOptionSummary, getCartItemPricePerKg } from '../lib/productOptions';
import {
  buildInvoiceHtml,
  getInvoiceNumber,
  getInvoiceShareText,
  getInvoiceTotals,
  invoiceIssuer,
} from '../lib/invoice';

const logoImage = new URL('../../assets/raub-hang-seng-logo-mark.jpg', import.meta.url).href;

interface SellerInvoiceViewProps {
  language: Language;
  order: OrderRecord;
  bankName: string;
  bankAccountHolder: string;
  bankAccountNumber: string;
  onBack: () => void;
  onUpdateOrderStatus: (orderId: string, status: string, trackingNumber?: string) => void | Promise<void>;
  onUpdatePaymentStatus: (orderId: string, status: PaymentStatus) => void | Promise<void>;
  onNotify: (message: string) => void;
  onError: (message: string) => void;
}

const formatDate = (value: string, language: Language) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-MY' : 'en-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

const paymentStatusMeta = (status: PaymentStatus | undefined, isZh: boolean) => {
  if (status === 'confirmed') {
    return {
      label: isZh ? '付款已确认' : 'Payment confirmed',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }
  if (status === 'rejected') {
    return {
      label: isZh ? '水单需复核' : 'Payment needs review',
      className: 'border-rose-200 bg-rose-50 text-rose-700',
    };
  }
  return {
    label: isZh ? '等待核对水单' : 'Payment review pending',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  };
};

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};

export default function SellerInvoiceView({
  language,
  order,
  bankName,
  bankAccountHolder,
  bankAccountNumber,
  onBack,
  onUpdateOrderStatus,
  onUpdatePaymentStatus,
  onNotify,
  onError,
}: SellerInvoiceViewProps) {
  const isZh = language === 'zh';
  const invoiceNumber = getInvoiceNumber(order.id);
  const totals = getInvoiceTotals(order);
  const paymentMeta = paymentStatusMeta(order.payment?.status, isZh);
  const currentStatus = order.status || 'pending';
  const [draftStatus, setDraftStatus] = useState(currentStatus);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [isSavingFulfillment, setIsSavingFulfillment] = useState(false);
  const address = `${order.details.address}, ${order.details.postcode} ${order.details.city}, ${order.details.state}`;
  const phoneDigits = order.details.phoneNumber.replace(/[^\d]/g, '');
  const customerMessage = order.trackingNumber
    ? `${invoiceNumber} · ${invoiceIssuer.name} · ${isZh ? '物流追踪号码' : 'Tracking number'}: ${order.trackingNumber}`
    : `${invoiceNumber} · ${invoiceIssuer.name}`;
  const invoiceHtml = useMemo(() => buildInvoiceHtml({
    order,
    language,
    bankName,
    bankAccountHolder,
    bankAccountNumber,
  }), [bankAccountHolder, bankAccountNumber, bankName, language, order]);

  const statusSteps = [
    { id: 'pending', zh: '订单已收到', en: 'Order received' },
    { id: 'processing', zh: '处理中', en: 'Processing' },
    { id: 'shipped', zh: '冷链配送中', en: 'Cold-chain dispatched' },
    { id: 'delivered', zh: '已送达', en: 'Delivered' },
  ];
  const statusIndex = statusSteps.findIndex(step => step.id === currentStatus);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  useEffect(() => {
    setDraftStatus(order.status || 'pending');
    setTrackingNumber(order.trackingNumber || '');
  }, [order.id, order.status, order.trackingNumber]);

  const saveFulfillment = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextTrackingNumber = trackingNumber.trim();
    if (draftStatus === 'shipped' && !nextTrackingNumber) {
      onError(isZh ? '请填写物流追踪号码后再确认发货。' : 'Enter a tracking number before confirming shipment.');
      return;
    }

    setIsSavingFulfillment(true);
    try {
      await onUpdateOrderStatus(
        order.id,
        draftStatus,
        draftStatus === 'shipped' ? nextTrackingNumber : undefined,
      );
    } catch {
      onError(isZh ? '无法更新配送资料，请重试。' : 'Could not update the shipment. Please try again.');
    } finally {
      setIsSavingFulfillment(false);
    }
  };

  const downloadInvoice = () => {
    const url = URL.createObjectURL(new Blob([invoiceHtml], { type: 'text/html;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${invoiceNumber}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    onNotify(isZh ? `${invoiceNumber} 已下载。` : `${invoiceNumber} downloaded.`);
  };

  const printInvoice = () => {
    const previousTitle = document.title;
    document.title = invoiceNumber;
    window.print();
    document.title = previousTitle;
  };

  const shareInvoice = async () => {
    try {
      const shareText = getInvoiceShareText(order);
      const file = new File([invoiceHtml], `${invoiceNumber}.html`, { type: 'text/html' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${invoiceNumber} · ${invoiceIssuer.name}`,
          text: shareText,
          files: [file],
        });
        onNotify(isZh ? '发票已交给设备分享菜单。' : 'Invoice sent to the device share menu.');
        return;
      }

      await copyText(shareText);
      onNotify(isZh ? '此设备不支持文件分享，发票摘要已复制。' : 'File sharing is unavailable; the invoice summary was copied.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      onError(isZh ? '无法分享发票，请先下载后手动发送。' : 'Could not share the invoice. Download it and send it manually.');
    }
  };

  return (
    <div className="rhs-invoice-view space-y-5">
      <div className="rhs-invoice-toolbar flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            <ArrowLeft className="h-4 w-4" />
            {isZh ? '返回订单列表' : 'Back to orders'}
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
              {isZh ? '发票' : 'Invoice'} {invoiceNumber}
            </h1>
            <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${paymentMeta.className}`}>
              {paymentMeta.label}
            </span>
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold capitalize text-amber-700">
              {currentStatus}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {isZh ? `订单 ${order.id} · 提交于 ${formatDate(order.date, language)}` : `Order ${order.id} · Received ${formatDate(order.date, language)}`}
          </p>
        </div>

        <div className="rhs-invoice-actions flex flex-wrap gap-2">
          <button type="button" onClick={shareInvoice} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500">
            <Share2 className="h-4 w-4" /> {isZh ? '分享' : 'Share'}
          </button>
          <button type="button" onClick={downloadInvoice} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500">
            <Download className="h-4 w-4" /> {isZh ? '下载' : 'Download'}
          </button>
          <button type="button" onClick={printInvoice} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500">
            <Printer className="h-4 w-4" /> {isZh ? '打印 / 保存 PDF' : 'Print / Save PDF'}
          </button>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <article id="seller-invoice-document" className="rhs-invoice-document border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
          <header className="flex flex-col justify-between gap-6 border-b-2 border-[#083b57] pb-6 sm:flex-row">
            <div className="flex items-start gap-3">
              <img src={logoImage} alt="Raub Hang Seng" className="h-14 w-14 rounded-full border border-slate-200 object-cover" />
              <div>
                <h2 className="text-xl font-bold text-[#083b57]">{invoiceIssuer.name}</h2>
                <p className="font-semibold tracking-[0.08em] text-slate-700">{invoiceIssuer.subtitle}</p>
                <address className="mt-3 max-w-md not-italic text-sm leading-6 text-slate-500">
                  {invoiceIssuer.address}<br />
                  {invoiceIssuer.phone} · {invoiceIssuer.email}
                </address>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Invoice / 发票</p>
              <p className="mt-1 font-mono text-2xl font-bold text-[#083b57]">{invoiceNumber}</p>
              <p className="mt-2 text-sm text-slate-500">{formatDate(order.date, language)}</p>
            </div>
          </header>

          <div className="grid gap-6 border-b border-slate-200 py-6 md:grid-cols-2">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Bill to / 账单寄送至</h3>
              <p className="mt-3 font-semibold text-slate-900">{order.details.fullName}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{address}</p>
              <p className="mt-1 text-sm text-slate-600">{order.details.phoneNumber}</p>
              {order.details.email && <p className="text-sm text-slate-600">{order.details.email}</p>}
            </section>
            <section>
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Delivery / 配送</h3>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-slate-500">{isZh ? '预定日期' : 'Requested date'}</dt>
                <dd className="font-semibold text-slate-800">{order.details.deliveryDate || '—'}</dd>
                <dt className="text-slate-500">{isZh ? '配送地区' : 'Region'}</dt>
                <dd className="font-semibold capitalize text-slate-800">{order.shippingRegion || '—'}</dd>
                <dt className="text-slate-500">{isZh ? '订单状态' : 'Fulfillment'}</dt>
                <dd className="font-semibold capitalize text-slate-800">{currentStatus}</dd>
                {order.trackingNumber && (
                  <>
                    <dt className="text-slate-500">{isZh ? '物流追踪号码' : 'Tracking number'}</dt>
                    <dd className="break-all font-mono font-semibold text-slate-800">{order.trackingNumber}</dd>
                  </>
                )}
              </dl>
            </section>
          </div>

          <div className="overflow-x-auto py-6">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-xs uppercase tracking-[0.06em] text-slate-500">
                  <th className="py-3 pr-3">#</th>
                  <th className="px-3 py-3">Item / 产品</th>
                  <th className="px-3 py-3 text-right">Qty / 数量</th>
                  <th className="px-3 py-3 text-right">Rate / 单价</th>
                  <th className="py-3 pl-3 text-right">Amount / 金额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.items.map((item, index) => {
                  const optionEn = getCartItemOptionSummary(item, 'en');
                  const optionZh = getCartItemOptionSummary(item, 'zh');
                  const lineTotal = getCartItemPricePerKg(item) * item.selectedWeightKg * item.quantity;
                  return (
                    <tr key={`${item.product.id}-${item.variantId || index}`}>
                      <td className="py-4 pr-3 text-slate-500">{index + 1}</td>
                      <td className="px-3 py-4">
                        <p className="font-semibold text-slate-900">{item.product.nameEn} / {item.product.nameZh}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {[optionEn, optionZh !== optionEn ? optionZh : '', `${item.selectedWeightKg} kg`, item.cutType].filter(Boolean).join(' · ')}
                        </p>
                      </td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums">{item.quantity}</td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums">RM {getCartItemPricePerKg(item).toFixed(2)}/kg</td>
                      <td className="py-4 pl-3 text-right font-mono font-semibold tabular-nums">RM {lineTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-[minmax(0,1fr)_18rem]">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Order note / 订单备注</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{order.details.notes || '—'}</p>
            </section>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Subtotal / 小计</dt><dd className="font-mono font-semibold tabular-nums">RM {totals.subtotal.toFixed(2)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Shipping / 运费</dt><dd className="font-mono font-semibold tabular-nums">RM {totals.shipping.toFixed(2)}</dd></div>
              {order.discounts?.map(discount => (
                <div key={`${discount.discountId}-${discount.scope}`} className="flex justify-between gap-4 text-emerald-700">
                  <dt>{discount.titleEn} / {discount.titleZh}</dt>
                  <dd className="font-mono font-semibold tabular-nums">- RM {discount.amount.toFixed(2)}</dd>
                </div>
              ))}
              {!order.discounts?.length && totals.discount > 0 && (
                <div className="flex justify-between gap-4 text-emerald-700">
                  <dt>Discount / 优惠</dt>
                  <dd className="font-mono font-semibold tabular-nums">- RM {totals.discount.toFixed(2)}</dd>
                </div>
              )}
              <div className="mt-3 flex justify-between gap-4 border-t-2 border-slate-800 pt-3 text-lg font-bold">
                <dt>Total / 总计</dt><dd className="font-mono tabular-nums">RM {totals.total.toFixed(2)}</dd>
              </div>
            </dl>
          </div>

          <section className="mt-8 border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Payment / 付款</h3>
            <p className="mt-2 text-sm font-semibold text-slate-800">{paymentMeta.label}</p>
            <p className="mt-1 text-sm text-slate-500">
              {[order.payment?.bankName || bankName, bankAccountHolder, order.payment?.accountNumber || bankAccountNumber].filter(Boolean).join(' · ') || '—'}
            </p>
            {order.payment?.reference && <p className="mt-1 text-sm text-slate-500">Reference: {order.payment.reference}</p>}
          </section>

          <footer className="pt-10 text-center text-sm text-slate-500">
            Thank you for your business. 感谢您的支持。
          </footer>
        </article>

        <aside className="rhs-invoice-operations space-y-4">
          <section className="border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">{isZh ? '配送状态' : 'Fulfillment status'}</h2>
              {currentStatus === 'cancelled' && <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">{isZh ? '已取消' : 'Cancelled'}</span>}
            </div>
            <ol className="mt-4 space-y-1">
              {statusSteps.map((step, index) => {
                const complete = statusIndex >= index && statusIndex >= 0;
                const current = statusIndex === index;
                return (
                  <li key={step.id} className="relative flex min-h-12 gap-3 pb-2">
                    {index < statusSteps.length - 1 && <span className={`absolute left-[9px] top-5 h-[calc(100%-8px)] w-px ${complete && statusIndex > index ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                    <span className={`relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${complete ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-400'}`}>
                      {complete ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${current ? 'text-amber-700' : complete ? 'text-slate-900' : 'text-slate-400'}`}>{isZh ? step.zh : step.en}</p>
                      {index === 0 && <p className="text-xs text-slate-500">{formatDate(order.date, language)}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
            <form onSubmit={saveFulfillment} className="mt-3 space-y-3 border-t border-slate-200 pt-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">{isZh ? '更新配送状态' : 'Update fulfillment status'}</span>
                <select
                  value={draftStatus}
                  onChange={(event) => setDraftStatus(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  {statusSteps.map(step => <option key={step.id} value={step.id}>{isZh ? step.zh : step.en}</option>)}
                  <option value="cancelled">{isZh ? '取消订单' : 'Cancelled'}</option>
                </select>
              </label>

              {draftStatus === 'shipped' ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                    {isZh ? '物流追踪号码' : 'Tracking number'} <span className="text-rose-600">*</span>
                  </span>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(event) => setTrackingNumber(event.target.value)}
                    maxLength={120}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={isZh ? '例如：MY1234567890' : 'e.g. MY1234567890'}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-800 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    required
                  />
                  <span className="mt-1.5 block text-xs leading-5 text-slate-500">
                    {isZh ? '保存后，客户可在会员订单中查看并复制此号码。' : 'Customers can view and copy this number from their member orders.'}
                  </span>
                </label>
              ) : order.trackingNumber ? (
                <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <p className="text-xs font-semibold text-slate-500">{isZh ? '物流追踪号码' : 'Tracking number'}</p>
                  <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-800">{order.trackingNumber}</p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSavingFulfillment || (draftStatus === 'shipped' && !trackingNumber.trim())}
                className="min-h-11 w-full rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSavingFulfillment
                  ? (isZh ? '正在保存…' : 'Saving…')
                  : (isZh ? '保存配送资料' : 'Save fulfillment')}
              </button>
            </form>
          </section>

          <section className="border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">{isZh ? '付款水单' : 'Payment slip'}</h2>
              <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${paymentMeta.className}`}>{paymentMeta.label}</span>
            </div>
            {order.payment?.slip ? (
              <div className="mt-4 space-y-3">
                {order.payment.slip.type.startsWith('image/') && (
                  <a href={order.payment.slip.dataUrl} target="_blank" rel="noreferrer" className="block overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={order.payment.slip.dataUrl} alt={isZh ? '付款水单' : 'Payment slip'} className="max-h-48 w-full object-contain" />
                  </a>
                )}
                <a href={order.payment.slip.dataUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-800">
                  <ExternalLink className="h-4 w-4" /> {isZh ? '打开完整水单' : 'Open full slip'}
                </a>
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-2 border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                {isZh ? '此订单没有上传付款水单。' : 'No payment slip was uploaded for this order.'}
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onUpdatePaymentStatus(order.id, 'confirmed')} className="min-h-11 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
                {isZh ? '确认付款' : 'Confirm'}
              </button>
              <button type="button" onClick={() => onUpdatePaymentStatus(order.id, 'rejected')} className="min-h-11 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600">
                {isZh ? '需复核' : 'Review'}
              </button>
            </div>
          </section>

          <section className="border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">{isZh ? '客户与配送' : 'Customer & delivery'}</h2>
            <p className="mt-3 font-semibold text-slate-900">{order.details.fullName}</p>
            <p className="mt-1 flex items-start gap-2 text-sm leading-6 text-slate-600"><MapPin className="mt-1 h-4 w-4 shrink-0 text-slate-400" />{address}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <a href={`tel:${order.details.phoneNumber}`} aria-label={isZh ? '拨打客户电话' : 'Call customer'} className="flex min-h-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-sky-700"><Phone className="h-4 w-4" /></a>
              {order.details.email ? (
                <a href={`mailto:${order.details.email}`} aria-label={isZh ? '电邮客户' : 'Email customer'} className="flex min-h-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-sky-700"><Mail className="h-4 w-4" /></a>
              ) : <span className="flex min-h-11 items-center justify-center rounded-lg border border-slate-100 text-slate-300"><Mail className="h-4 w-4" /></span>}
              <a href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(customerMessage)}`} target="_blank" rel="noreferrer" aria-label={isZh ? 'WhatsApp 客户' : 'WhatsApp customer'} className="flex min-h-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-700"><MessageCircle className="h-4 w-4" /></a>
            </div>
          </section>

          <section className="border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">{isZh ? '订单记录' : 'Order notes'}</h2>
            <div className="mt-3 flex items-start gap-3 text-sm text-slate-600">
              {order.payment?.status === 'confirmed' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
              <div>
                <p>{order.payment?.status === 'confirmed' ? (isZh ? '付款已由店主确认。' : 'Payment confirmed by the store owner.') : (isZh ? '等待店主核对付款。' : 'Waiting for payment review.')}</p>
                {order.payment?.confirmedAt && <p className="mt-1 text-xs text-slate-400">{formatDate(order.payment.confirmedAt, language)}</p>}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
