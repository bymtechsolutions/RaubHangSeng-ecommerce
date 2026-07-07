import { FormEvent, useState } from 'react';
import { Building2, CheckCircle, ClipboardList, Fish, MessageCircle, PackageCheck, Snowflake, Truck } from 'lucide-react';
import { Language } from '../types';

interface BusinessOrderProps {
  language: Language;
  orderingPaused?: boolean;
}

const businessImage = new URL('../../assets/about/raub-hang-seng-river-fish-farm.jpg', import.meta.url).href;

export default function BusinessOrder({ language, orderingPaused = false }: BusinessOrderProps) {
  const isZh = language === 'zh';
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('restaurant');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [volume, setVolume] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const buyerTypes = [
    { value: 'restaurant', zh: '餐厅 / 酒楼', en: 'Restaurant' },
    { value: 'retailer', zh: '海鲜零售 / 批发', en: 'Retailer / Wholesaler' },
    { value: 'caterer', zh: '宴会 / 到会服务', en: 'Caterer' },
    { value: 'corporate', zh: '公司采购 / 送礼', en: 'Corporate Purchase' },
  ];

  const supplyPoints = [
    {
      icon: Fish,
      zhTitle: '按现货报价',
      enTitle: 'Stock-Based Quote',
      zhDesc: '野生与季节鱼种按当天现货、重量与规格确认。',
      enDesc: 'Wild and seasonal fish are quoted by available stock, weight, and size.',
    },
    {
      icon: PackageCheck,
      zhTitle: '可指定处理',
      enTitle: 'Custom Processing',
      zhDesc: '整条、去鳞去内脏、厚切、鱼片等处理方式可先沟通。',
      enDesc: 'Whole, cleaned, steak cut, and fillet preparation can be arranged.',
    },
    {
      icon: Snowflake,
      zhTitle: '批量冷冻包装',
      enTitle: 'Bulk Frozen Pack',
      zhDesc: '可按厨房备货、零售包装或送礼用途规划包装。',
      enDesc: 'Packing can follow kitchen prep, retail pack, or gifting needs.',
    },
    {
      icon: Truck,
      zhTitle: '路线配送安排',
      enTitle: 'Route Delivery',
      zhDesc: '西马区域按日期、路线、货量与冷链车次安排配送。',
      enDesc: 'Peninsular delivery is arranged by date, route, order size, and cold-chain slot.',
    },
  ];

  const buildWhatsAppMessage = () => {
    const selectedType = buyerTypes.find((item) => item.value === businessType);
    return [
      isZh ? '*商务订购咨询*' : '*Business Order Inquiry*',
      '',
      `${isZh ? '公司/店名' : 'Business'}: ${businessName || '-'}`,
      `${isZh ? '联系人' : 'Contact'}: ${contactName || '-'}`,
      `${isZh ? '电话' : 'Phone'}: ${phone || '-'}`,
      `${isZh ? '业务类型' : 'Business type'}: ${isZh ? selectedType?.zh : selectedType?.en}`,
      `${isZh ? '配送地区' : 'Delivery area'}: ${deliveryArea || '-'}`,
      `${isZh ? '预计订购量' : 'Expected volume'}: ${volume || '-'}`,
      `${isZh ? '需求备注' : 'Notes'}: ${notes || '-'}`,
    ].join('\n');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (orderingPaused || !businessName.trim() || !contactName.trim()) return;

    const url = `https://wa.me/60187682528?text=${encodeURIComponent(buildWhatsAppMessage())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setSubmitted(true);
  };

  return (
    <section id="business-order-page" className="rhs-section-alt border-t border-[#c4d5d9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#b7ccd1] bg-[#f4f8f7] px-3 py-1.5 text-xs font-bold text-[#0a5f84]">
              <Building2 className="w-3.5 h-3.5" />
              <span>{isZh ? '餐饮、零售、公司批量采购' : 'Food Service, Retail, Corporate Supply'}</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight text-slate-950">
                {isZh ? '商务订购与批量采购' : 'Order for Business'}
              </h1>
              <p className="text-base md:text-lg leading-relaxed text-[#536c74] max-w-2xl">
                {isZh
                  ? '适合餐厅、酒楼、海鲜零售、公司送礼和宴会采购。告诉我们鱼种、预计用量、配送地点与处理方式，我们会通过 WhatsApp 回复现货、报价和配送安排。'
                  : 'Built for restaurants, retailers, caterers, corporate gifting, and recurring buyers. Share your fish needs, volume, delivery area, and processing preference, and we will confirm stock, pricing, and dispatch on WhatsApp.'}
              </p>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-2xl border border-[#b7ccd1] bg-[#f4f8f7] shadow-sm">
              <img
                src={businessImage}
                alt={isZh ? '商务河鱼冷链批量订购' : 'Business river fish cold-chain ordering'}
                className="h-[320px] md:h-[420px] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#063655]/78 via-[#063655]/16 to-transparent" />
              <div className="absolute left-5 bottom-5 right-5 text-white">
                <p className="text-sm font-bold text-white/80">{isZh ? '批量订单' : 'Bulk Supply'}</p>
                <p className="mt-1 text-2xl font-black">{isZh ? '按现货、路线与用途报价' : 'Quoted by stock, route, and use case'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {supplyPoints.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.enTitle} className="rhs-panel border border-[#c4d5d9] rounded-2xl p-5 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-700 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-black text-slate-900">{isZh ? item.zhTitle : item.enTitle}</h2>
                <p className="mt-2 text-xs leading-relaxed text-[#536c74]">{isZh ? item.zhDesc : item.enDesc}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 rhs-panel border border-[#c4d5d9] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-6 h-6 text-sky-700" />
              <h2 className="text-xl font-black text-slate-950">
                {isZh ? '提交采购需求' : 'Send Purchase Requirements'}
              </h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#536c74]">
              {isZh
                ? '此表单会整理成 WhatsApp 信息，不会存入后台。请填写重点资料，方便客服直接按现货与配送路线回复。'
                : 'This form opens a prepared WhatsApp message and does not store data in the backend. Add the key details so support can reply with stock and route availability.'}
            </p>

            {orderingPaused && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                {isZh ? '店面维护中，暂不接受新订单。' : 'Ordering is paused while the store is under maintenance.'}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="lg:col-span-7 rhs-panel-soft border border-[#c4d5d9] rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1.5 text-xs font-bold text-slate-600">
                <span>{isZh ? '公司 / 店名' : 'Business Name'} *</span>
                <input
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  required
                  className="w-full rounded-xl border border-[#c4d5d9] bg-[#f8fbfa] px-3 py-2.5 text-sm text-slate-800 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder={isZh ? '例：XX 酒楼' : 'Example: ABC Restaurant'}
                />
              </label>

              <label className="space-y-1.5 text-xs font-bold text-slate-600">
                <span>{isZh ? '联系人' : 'Contact Person'} *</span>
                <input
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  required
                  className="w-full rounded-xl border border-[#c4d5d9] bg-[#f8fbfa] px-3 py-2.5 text-sm text-slate-800 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder={isZh ? '负责人姓名' : 'Person in charge'}
                />
              </label>

              <label className="space-y-1.5 text-xs font-bold text-slate-600">
                <span>{isZh ? '电话 / WhatsApp' : 'Phone / WhatsApp'}</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-xl border border-[#c4d5d9] bg-[#f8fbfa] px-3 py-2.5 text-sm text-slate-800 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="+60"
                />
              </label>

              <label className="space-y-1.5 text-xs font-bold text-slate-600">
                <span>{isZh ? '业务类型' : 'Business Type'}</span>
                <select
                  value={businessType}
                  onChange={(event) => setBusinessType(event.target.value)}
                  className="w-full rounded-xl border border-[#c4d5d9] bg-[#f8fbfa] px-3 py-2.5 text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  {buyerTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {isZh ? type.zh : type.en}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-xs font-bold text-slate-600">
                <span>{isZh ? '配送地区' : 'Delivery Area'}</span>
                <input
                  value={deliveryArea}
                  onChange={(event) => setDeliveryArea(event.target.value)}
                  className="w-full rounded-xl border border-[#c4d5d9] bg-[#f8fbfa] px-3 py-2.5 text-sm text-slate-800 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder={isZh ? '例：KL / Selangor / Johor' : 'Example: KL / Selangor / Johor'}
                />
              </label>

              <label className="space-y-1.5 text-xs font-bold text-slate-600">
                <span>{isZh ? '预计订购量' : 'Expected Volume'}</span>
                <input
                  value={volume}
                  onChange={(event) => setVolume(event.target.value)}
                  className="w-full rounded-xl border border-[#c4d5d9] bg-[#f8fbfa] px-3 py-2.5 text-sm text-slate-800 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder={isZh ? '例：每周 20kg / 活动 50kg' : 'Example: 20kg weekly / 50kg event'}
                />
              </label>
            </div>

            <label className="block space-y-1.5 text-xs font-bold text-slate-600">
              <span>{isZh ? '鱼种、切法与其他需求' : 'Fish Type, Cutting, and Notes'}</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-[#c4d5d9] bg-[#f8fbfa] px-3 py-2.5 text-sm text-slate-800 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder={isZh ? '例：巴丁鱼厚切、苏丹鱼整条、需要真空分包...' : 'Example: patin steak cut, whole jelawat, vacuum pack portions...'}
              />
            </label>

            {submitted && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>{isZh ? 'WhatsApp 询价信息已打开，请在聊天框点击发送。' : 'WhatsApp inquiry opened. Please press Send in the chat.'}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={orderingPaused || !businessName.trim() || !contactName.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-5 py-3 text-sm font-black text-white shadow-md transition-colors hover:from-sky-500 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{isZh ? '通过 WhatsApp 提交商务询价' : 'Send Business Inquiry on WhatsApp'}</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
