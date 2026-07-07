import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, ClipboardCheck, Info, Award, Upload, FileCheck2, Landmark } from 'lucide-react';
import { AppliedDiscount, CartItem, Language, DeliveryDetails, User, OrderRecord, PaymentSlip } from '../types';
import { getDiscountLabel } from '../lib/discounts';

interface CheckoutModalProps {
  cartItems: CartItem[];
  language: Language;
  onClose: () => void;
  shippingFee: number;
  totalAmount: number;
  subtotal: number;
  baseShippingFee: number;
  itemDiscountTotal: number;
  shippingDiscountTotal: number;
  discountApplications: AppliedDiscount[];
  bankTransferSettings: {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    instructions: string;
  };
  onOrderSuccess: (order: OrderRecord) => void;
  currentUser: User | null;
  onAuthClick: () => void;
}

export default function CheckoutModal({
  cartItems,
  language,
  onClose,
  shippingFee,
  totalAmount,
  subtotal,
  baseShippingFee,
  itemDiscountTotal,
  shippingDiscountTotal,
  discountApplications,
  bankTransferSettings,
  onOrderSuccess,
  currentUser,
  onAuthClick,
}: CheckoutModalProps) {
  const isZh = language === 'zh';

  // Form states
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Selangor');
  const [postcode, setPostcode] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentSlip, setPaymentSlip] = useState<PaymentSlip | null>(null);

  // Autofill if logged in
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setPhoneNumber(currentUser.phoneNumber || '');
      setEmail(currentUser.email || '');
      setAddress(currentUser.address || '');
      setCity(currentUser.city || '');
      setState(currentUser.state || 'Pahang');
      setPostcode(currentUser.postcode || '');
    }
  }, [currentUser]);

  // Validation feedback
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCheckingPostcode, setIsCheckingPostcode] = useState(false);
  const [postcodeStatus, setPostcodeStatus] = useState<'valid' | 'invalid' | null>(null);

  const handlePaymentSlipUpload = (file?: File | null) => {
    if (!file) return;

    const maxSlipSize = 2 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    if (!allowedTypes.includes(file.type)) {
      setPaymentSlip(null);
      setErrors(prev => ({
        ...prev,
        paymentSlip: isZh ? '请上传 JPG、PNG、WebP 或 PDF 水单。' : 'Upload a JPG, PNG, WebP, or PDF payment slip.',
      }));
      return;
    }

    if (file.size > maxSlipSize) {
      setPaymentSlip(null);
      setErrors(prev => ({
        ...prev,
        paymentSlip: isZh ? '水单文件不可超过 2MB。' : 'Payment slip must be 2MB or smaller.',
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPaymentSlip({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: String(reader.result),
        uploadedAt: new Date().toISOString(),
      });
      setErrors(prev => {
        const next = { ...prev };
        delete next.paymentSlip;
        return next;
      });
    };
    reader.onerror = () => {
      setPaymentSlip(null);
      setErrors(prev => ({
        ...prev,
        paymentSlip: isZh ? '水单读取失败，请重新上传。' : 'Unable to read the slip. Please upload again.',
      }));
    };
    reader.readAsDataURL(file);
  };

  // Postcode checks (Simplified for Malaysian standard 5-digit postcodes)
  const handlePostcodeChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 5);
    setPostcode(cleaned);

    if (cleaned.length === 5) {
      setIsCheckingPostcode(true);
      // Simulate real-time route checking for cold chain coverage
      setTimeout(() => {
        setIsCheckingPostcode(false);
        // Standard west Malaysian postcode ranges (01000 - 86000) are generally covered by cold chain
        const codeNum = parseInt(cleaned);
        if (codeNum >= 1000 && codeNum <= 98000) {
          setPostcodeStatus('valid');
          setErrors(prev => {
            const next = { ...prev };
            delete next.postcode;
            return next;
          });
        } else {
          setPostcodeStatus('invalid');
        }
      }, 500);
    } else {
      setPostcodeStatus(null);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = isZh ? '请填写姓名' : 'Full Name is required';
    if (!phoneNumber.trim()) newErrors.phoneNumber = isZh ? '请填写联系电话' : 'Phone Number is required';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = isZh ? '请输入有效的 Email，或留空。' : 'Enter a valid email address, or leave it blank.';
    }
    if (!address.trim()) newErrors.address = isZh ? '请填写详细配送地址' : 'Delivery Address is required';
    if (!city.trim()) newErrors.city = isZh ? '请填写城市' : 'City is required';
    if (!postcode.trim() || postcode.length !== 5) {
      newErrors.postcode = isZh ? '请填写5位有效邮编' : 'Enter a valid 5-digit postcode';
    } else if (postcodeStatus === 'invalid') {
      newErrors.postcode = isZh ? '抱歉，此地区冷链物流暂未覆盖' : 'Sorry, cold-chain is not available for this area';
    }
    if (!deliveryDate) newErrors.deliveryDate = isZh ? '请选择期望送达日期' : 'Select a delivery date';
    if (!bankTransferSettings.bankName.trim() || !bankTransferSettings.accountHolder.trim() || !bankTransferSettings.accountNumber.trim()) {
      newErrors.bankTransfer = isZh ? '商家尚未设置完整银行转账资料，请稍后再下单。' : 'Bank transfer details are not fully configured yet. Please order after the seller configures them.';
    }
    if (!paymentSlip) newErrors.paymentSlip = isZh ? '请上传银行转账水单。' : 'Upload your bank transfer payment slip.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getCutTypeLabel = (cut: CartItem['cutType']) => {
    switch (cut) {
      case 'cleaned': return isZh ? '去内脏清洗 (Cleaned)' : 'Gutted & Scaled';
      case 'whole': return isZh ? '整条完整 (Whole)' : 'Whole intact';
      case 'steak': return isZh ? '切厚块 (Steak Cuts)' : 'Thick Steaks';
      case 'fillet': return isZh ? '去骨鱼片 (Fillet Cuts)' : 'Boneless Fillets';
      case 'sliced': return isZh ? '薄切鱼片 (Sliced)' : 'Thin Slices';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // 1. Generate Order ID
    const orderId = 'PFR-' + Math.floor(100000 + Math.random() * 900000);
    const currentDate = new Date().toISOString().split('T')[0];

    const details: DeliveryDetails = {
      fullName,
      phoneNumber,
      email: email.trim() || undefined,
      address,
      city,
      state,
      postcode,
      deliveryDate,
      notes,
    };

    // 2. Create website order. Seller confirms payment after reviewing the uploaded slip.
    onOrderSuccess({
      id: orderId,
      items: cartItems,
      details,
      total: totalAmount,
      date: currentDate,
      status: 'pending',
      subtotal,
      baseShippingFee,
      shippingFee,
      discountTotal: itemDiscountTotal + shippingDiscountTotal,
      discounts: discountApplications,
      payment: {
        method: 'bank_transfer',
        status: 'pending_review',
        amount: totalAmount,
        bankName: bankTransferSettings.bankName,
        accountHolder: bankTransferSettings.accountHolder,
        accountNumber: bankTransferSettings.accountNumber,
        slip: paymentSlip || undefined,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      {/* Click overlay to exit */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal box */}
      <div className="relative w-full max-w-3xl rhs-panel border rounded-2xl overflow-hidden shadow-2xl z-10 my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-[#f8fbfa]/85 hover:bg-[#f8fbfa] text-slate-500 hover:text-slate-850 border border-[#c4d5d9] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-5 border-b border-[#c4d5d9] rhs-panel-soft">
          <h3 className="text-xl font-bold text-slate-900 flex items-center">
            <ClipboardCheck className="w-5 h-5 mr-2 text-sky-600" />
            {isZh ? '确认订单与配送资料' : 'Confirm Order & Delivery Details'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isZh
              ? '请填写配送资料，完成银行转账后上传水单。订单会直接保存到商家后台等待付款确认。'
              : 'Enter delivery details, upload your bank transfer slip, and submit the order directly to the seller dashboard.'}
          </p>
        </div>

        {/* Form Body split into columns */}
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[75vh] overflow-y-auto rhs-panel">
          
          {/* Left Column: Form Inputs (7 Cols) */}
          <div className="md:col-span-7 space-y-4">
            
            {/* Member Club Autofill Banner */}
            {currentUser ? (
              <div className="bg-sky-50 border border-sky-100 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="bg-sky-500 text-white p-1 rounded-lg">
                    <Award className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <span className="text-[9px] text-sky-600 font-bold block uppercase tracking-wider">{isZh ? '会员专享优惠中' : 'Member Logged In'}</span>
                    <p className="text-[11px] text-slate-700 font-medium leading-tight">
                      {isZh ? '已自动填妥会员配送资料' : 'Autofill active for your delivery details'}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-bold">
                  @{currentUser.username}
                </span>
              </div>
            ) : (
              <div className="rhs-panel-soft border p-3 rounded-xl flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">{isZh ? '专属会员专享' : 'Checkout Guest'}</span>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    {isZh ? '登录或注册会员即可自动填单、累积专属积分！' : 'Sign in to automatically fill info & earn loyalty rewards.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onAuthClick}
                  className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-bold cursor-pointer shrink-0 transition-colors"
                >
                  {isZh ? '登录 / 注册' : 'Sign In'}
                </button>
              </div>
            )}
            
            {/* Input Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">
                {isZh ? '收件人全名' : 'Recipient Full Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={isZh ? '请输入收货人中文或英文姓名' : 'Enter full name for delivery'}
                className={`w-full bg-white border rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors ${
                  errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-sky-500'
                }`}
              />
              {errors.fullName && <p className="text-[10px] text-red-500">{errors.fullName}</p>}
            </div>

            {/* Input Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">
                {isZh ? '联系电话' : 'Phone Number'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={isZh ? '例如: 0123456789' : 'e.g. 0123456789'}
                className={`w-full bg-white border rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors ${
                  errors.phoneNumber ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-sky-500'
                }`}
              />
              {errors.phoneNumber && <p className="text-[10px] text-red-500">{errors.phoneNumber}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">
                {isZh ? 'Email（接收订单更新，可选）' : 'Email for order updates (optional)'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isZh ? '例如: customer@email.com' : 'e.g. customer@email.com'}
                className={`w-full bg-white border rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors ${
                  errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-sky-500'
                }`}
              />
              {errors.email && <p className="text-[10px] text-red-500">{errors.email}</p>}
            </div>

            {/* State selection */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">
                  {isZh ? '配送州属' : 'State'}
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:border-sky-500"
                >
                  <option value="Selangor">Selangor (雪兰莪)</option>
                  <option value="Kuala Lumpur">Kuala Lumpur (吉隆坡)</option>
                  <option value="Pahang">Pahang (彭亨)</option>
                  <option value="Negeri Sembilan">Negeri Sembilan (森美兰)</option>
                  <option value="Johor">Johor (柔佛)</option>
                  <option value="Penang">Penang (槟城)</option>
                  <option value="Perak">Perak (霹雳)</option>
                  <option value="Melaka">Melaka (马六甲)</option>
                  <option value="Kedah">Kedah (吉打)</option>
                </select>
              </div>

              {/* Input Postcode with Cold chain validation check */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">
                  {isZh ? '5位邮政编码' : 'Postcode'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={postcode}
                    onChange={(e) => handlePostcodeChange(e.target.value)}
                    placeholder="e.g. 47500"
                    className={`w-full bg-white border rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors ${
                      errors.postcode ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-sky-500'
                    }`}
                  />
                  {isCheckingPostcode && (
                    <span className="absolute right-3.5 top-3 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                    </span>
                  )}
                </div>

                {/* Postcode check feedback indicator */}
                {postcodeStatus === 'valid' && (
                  <p className="text-[10px] text-emerald-600 flex items-center font-semibold mt-1">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    {isZh ? '✓ 冷链保冷送货服务已覆盖此地区' : '✓ Cold chain delivery covered'}
                  </p>
                )}
                {postcodeStatus === 'invalid' && (
                  <p className="text-[10px] text-red-500 flex items-center font-semibold mt-1">
                    <X className="w-3.5 h-3.5 mr-1" />
                    {isZh ? '抱歉，此偏远山区暂无冷藏车覆盖' : 'Sorry, postcode has no cold-chain support'}
                  </p>
                )}
                {errors.postcode && <p className="text-[10px] text-red-500">{errors.postcode}</p>}
              </div>
            </div>

            {/* Input City */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">
                {isZh ? '城市 / 县区' : 'City / Area'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={isZh ? '例如: Petaling Jaya / Temerloh' : 'e.g. Petaling Jaya / Temerloh'}
                className={`w-full bg-white border rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors ${
                  errors.city ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-sky-500'
                }`}
              />
              {errors.city && <p className="text-[10px] text-red-500">{errors.city}</p>}
            </div>

            {/* Input Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">
                {isZh ? '详细收货地址' : 'Detailed Street Address'} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder={isZh ? '请填写门牌号、路名、大楼或小区名称' : 'Enter complete house number, street name, and apartment building'}
                className={`w-full bg-white border rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors ${
                  errors.address ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-sky-500'
                }`}
              />
              {errors.address && <p className="text-[10px] text-red-500">{errors.address}</p>}
            </div>

            {/* Input Delivery Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">
                {isZh ? '期望收货日期' : 'Preferred Delivery Date'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className={`w-full bg-white border rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors ${
                  errors.deliveryDate ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-sky-500'
                }`}
              />
              {errors.deliveryDate && <p className="text-[10px] text-red-500">{errors.deliveryDate}</p>}
            </div>

            {/* Bank Transfer Payment Slip */}
            <div className="space-y-2 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block uppercase tracking-wide">
                  {isZh ? '银行转账水单' : 'Bank Transfer Payment Slip'} <span className="text-red-500">*</span>
                </label>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {isZh
                    ? '请完成手动银行转账后上传水单。商家会在后台核对付款后确认订单。'
                    : 'Upload your payment slip after manual bank transfer. Seller will confirm payment from the dashboard.'}
                  </p>
              </div>

              <div className={`rounded-xl border p-3 text-xs ${
                errors.bankTransfer ? 'border-rose-200 bg-rose-50' : 'border-sky-200 bg-white'
              }`}>
                <div className="flex items-start gap-2">
                  <Landmark className={`mt-0.5 h-4 w-4 shrink-0 ${errors.bankTransfer ? 'text-rose-600' : 'text-sky-600'}`} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">{isZh ? '银行' : 'Bank'}</span>
                      <strong className="text-right text-slate-800">{bankTransferSettings.bankName || '-'}</strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">{isZh ? '户口名' : 'Account holder'}</span>
                      <strong className="text-right text-slate-800">{bankTransferSettings.accountHolder || '-'}</strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">{isZh ? '户口号' : 'Account no.'}</span>
                      <strong className="text-right font-mono text-slate-900">{bankTransferSettings.accountNumber || '-'}</strong>
                    </div>
                    <p className="border-t border-slate-100 pt-2 text-[10px] leading-5 text-slate-500">
                      {bankTransferSettings.instructions || (isZh ? '请转账准确总额，并上传付款水单。' : 'Transfer the exact total and upload the payment slip.')}
                    </p>
                  </div>
                </div>
              </div>

              {errors.bankTransfer && <p className="text-[10px] text-red-500">{errors.bankTransfer}</p>}

              <label className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-sky-300 bg-white px-3 py-3 text-xs cursor-pointer hover:border-sky-500 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    {paymentSlip ? <FileCheck2 className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <span className="block font-bold text-slate-800 truncate">
                      {paymentSlip ? paymentSlip.name : (isZh ? '上传付款水单' : 'Upload payment slip')}
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      {paymentSlip
                        ? `${(paymentSlip.size / 1024).toFixed(0)} KB`
                        : (isZh ? 'JPG / PNG / WebP / PDF，最多 2MB' : 'JPG / PNG / WebP / PDF, max 2MB')}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 rounded-lg bg-sky-600 px-2.5 py-1.5 text-[10px] font-bold text-white">
                  {isZh ? '选择文件' : 'Choose File'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => handlePaymentSlipUpload(e.target.files?.[0])}
                  className="sr-only"
                />
              </label>

              {paymentSlip?.type.startsWith('image/') && (
                <img
                  src={paymentSlip.dataUrl}
                  alt={isZh ? '付款水单预览' : 'Payment slip preview'}
                  className="max-h-40 w-full rounded-lg border border-sky-100 object-contain bg-white"
                />
              )}

              {errors.paymentSlip && <p className="text-[10px] text-red-500">{errors.paymentSlip}</p>}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">
                {isZh ? '特殊备注（切法要求/送货时间说明等）' : 'Special Instructions / Remarks'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={isZh ? '例如：鱼段要厚切；请在下午2点后送货等' : 'e.g. Cut steaks extra thick, deliver only after 2 PM, etc.'}
                className="w-full bg-white border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Right Column: Invoice Overview (5 Cols) */}
          <div className="md:col-span-5 rhs-panel-soft border rounded-2xl p-4 flex flex-col justify-between space-y-4">
            
            {/* Title */}
            <div>
              <h4 className="text-xs font-bold text-sky-600 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center">
                <ClipboardCheck className="w-4 h-4 mr-1.5 text-sky-600" />
                {isZh ? '账单细目摘要' : 'Cart Invoice Summary'}
              </h4>

              {/* Items loop */}
              <div className="space-y-3 max-h-[25vh] overflow-y-auto pr-1 py-3 border-b border-slate-200">
                {cartItems.map((item, idx) => {
                  const subTotal = item.product.pricePerKg * item.selectedWeightKg * item.quantity;
                  return (
                    <div key={idx} className="flex justify-between text-xs text-slate-600">
                      <div>
                        <span className="font-bold block text-slate-800">
                          {isZh ? item.product.nameZh : item.product.nameEn}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {item.quantity}条 • {item.selectedWeightKg.toFixed(1)}kg • {getCutTypeLabel(item.cutType)}
                        </span>
                      </div>
                      <span className="font-mono text-slate-500">RM {subTotal.toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calculations block */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>{isZh ? '商品小计' : 'Items Subtotal'}</span>
                <span className="font-mono text-slate-700">RM {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{isZh ? '冷链物流专车配送' : 'Cold Chain Shipping'}</span>
                <span className="font-mono text-slate-700">
                  {baseShippingFee === 0 ? (
                    <span className="text-emerald-600 font-bold">{isZh ? '免运费' : 'FREE'}</span>
                  ) : (
                    `RM ${baseShippingFee.toFixed(2)}`
                  )}
                </span>
              </div>
              {discountApplications.map((discount) => (
                <div key={`${discount.discountId}-${discount.scope}`} className="flex justify-between text-emerald-700">
                  <span>{getDiscountLabel(discount, isZh)}</span>
                  <span className="font-mono">- RM {discount.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="h-px bg-slate-200 my-1.5" />
              <div className="flex justify-between text-slate-500">
                <span>{isZh ? '付款方式' : 'Payment Method'}</span>
                <span className="font-bold text-slate-700">{isZh ? '银行转账' : 'Bank Transfer'}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{isZh ? '水单状态' : 'Slip Status'}</span>
                <span className={`font-bold ${paymentSlip ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {paymentSlip ? (isZh ? '已上传' : 'Uploaded') : (isZh ? '待上传' : 'Required')}
                </span>
              </div>
              <div className="flex justify-between items-baseline text-slate-900">
                <span className="text-xs font-bold">{isZh ? '应付总金额' : 'Grand Total'}</span>
                <span className="text-lg font-black text-amber-600 font-mono">
                  RM {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Order processing note */}
            <div className="bg-[#f8fbfa] border border-[#c4d5d9] rounded-xl p-3 text-[10px] text-slate-500 space-y-2">
              <p className="font-semibold text-sky-600 flex items-center uppercase">
                <Info className="w-3.5 h-3.5 mr-1" />
                {isZh ? '下单说明' : 'How Order Processing Works'}
              </p>
              <ol className="list-decimal pl-3.5 space-y-1">
                <li>{isZh ? '请先按左侧银行资料完成手动转账。' : 'Transfer manually using the bank details on the left.'}</li>
                <li>{isZh ? '上传付款水单后提交订单，系统会保存到商家后台。' : 'Upload the payment slip and submit; the order is saved to the seller dashboard.'}</li>
                <li>{isZh ? '付款状态会先显示为等待核对。' : 'Payment status starts as awaiting review.'}</li>
                <li>{isZh ? '商家确认收到款项后，会把订单更新为处理中并安排冷链配送。' : 'After the seller confirms receipt, the order moves to processing for cold-chain dispatch.'}</li>
              </ol>
            </div>

            {/* Actions submit */}
            <div className="space-y-2 pt-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer text-sm"
              >
                <ClipboardCheck className="w-4 h-4 text-emerald-100" />
                <span>{isZh ? '提交订单与付款水单' : 'Submit Website Order'}</span>
              </button>
              
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-semibold text-xs cursor-pointer transition-all"
              >
                {isZh ? '返回修改购物车' : 'Go back'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
