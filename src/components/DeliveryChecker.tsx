import React, { useState } from 'react';
import { Truck, ShieldCheck, AlertCircle, Search } from 'lucide-react';
import { Language } from '../types';
import { getDeliveryCoverage } from '../lib/shipping';

interface DeliveryCheckerProps {
  language: Language;
}

export default function DeliveryChecker({ language }: DeliveryCheckerProps) {
  const isZh = language === 'zh';
  const [postcode, setPostcode] = useState('');
  const [result, setResult] = useState<{
    status: 'covered' | 'not-covered' | 'unsupported-format';
    city?: string;
    state?: string;
    eta?: string;
    shippingFee?: number;
  } | null>(null);

  const checkPostcode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = postcode.replace(/\D/g, '');
    
    if (cleaned.length !== 5) {
      setResult({ status: 'unsupported-format' });
      return;
    }

    const codeNum = parseInt(cleaned);
    const coverage = getDeliveryCoverage(cleaned);

    // Simple routing logic based on Malaysian postcode series:
    // 01000 - 02000: Perlis (Covered, 2-3 working days)
    // 05000 - 09000: Kedah (Covered, 2-3 working days)
    // 10000 - 14000: Penang (Covered, 2 working days)
    // 15000 - 18000: Kelantan (Covered, 3 working days)
    // 20000 - 24000: Terengganu (Covered, 3 working days)
    // 25000 - 28000: Pahang (Temerloh/Kuantan area, Covered, 24-48 hours)
    // 30000 - 36000: Perak (Covered, 2-3 working days)
    // 40000 - 48000: Selangor (Klang Valley, Covered, 24-48 hours)
    // 50000 - 60000: Kuala Lumpur (Covered, 24-48 hours)
    // 70000 - 73000: Negeri Sembilan (Covered, 2 working days)
    // 75000 - 78000: Melaka (Covered, 2 working days)
    // 79000 - 86000: Johor (Covered, 2-3 working days)
    // 90000+: Sabah & Sarawak (East Malaysia, Not covered due to fresh frozen air logistics constraints)

    if (!coverage.covered) {
      setResult({
        status: 'not-covered',
        city: codeNum >= 87000 ? 'East Malaysia Region' : 'Outside supported routes',
        state: codeNum >= 87000 ? 'Labuan / Sabah / Sarawak' : 'Unsupported postcode',
      });
    } else if (codeNum >= 50000 && codeNum <= 60000) {
      setResult({
        status: 'covered',
        city: 'Kuala Lumpur Central',
        state: 'Kuala Lumpur (吉隆坡)',
        eta: isZh ? '24 - 48 小时极速送达' : '24 - 48 Hours fast delivery',
        shippingFee: 20,
      });
    } else if (codeNum >= 40000 && codeNum <= 48999) {
      setResult({
        status: 'covered',
        city: 'Klang Valley Area',
        state: 'Selangor (雪兰莪)',
        eta: isZh ? '24 - 48 小时极速送达' : '24 - 48 Hours fast delivery',
        shippingFee: 20,
      });
    } else if (codeNum >= 25000 && codeNum <= 28999) {
      setResult({
        status: 'covered',
        city: 'Temerloh / Mentakab / Kuantan',
        state: 'Pahang (彭亨 - 河鱼大本营)',
        eta: isZh ? '24 - 48 小时直达发货' : '24 - 48 Hours direct delivery',
        shippingFee: 20,
      });
    } else {
      // Other West Malaysian states
      let stateName = 'Peninsular Malaysia';
      if (codeNum >= 79000 && codeNum <= 86999) stateName = 'Johor (柔佛)';
      else if (codeNum >= 10000 && codeNum <= 14999) stateName = 'Penang (槟城)';
      else if (codeNum >= 30000 && codeNum <= 36999) stateName = 'Perak (霹雳)';
      else if (codeNum >= 75000 && codeNum <= 78999) stateName = 'Melaka (马六甲)';
      else if (codeNum >= 70000 && codeNum <= 73999) stateName = 'Negeri Sembilan (森美兰)';

      setResult({
        status: 'covered',
        city: 'Major Outstation Cities',
        state: stateName,
        eta: isZh ? '2 - 3 工作日全程冷藏配送' : '2 - 3 Working Days (Cold Chain Truck)',
        shippingFee: 30,
      });
    }
  };

  return (
    <section id="delivery" className="py-20 rhs-section border-t border-[#c4d5d9]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Card Grid wrapper */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 rhs-panel border p-6 md:p-10 rounded-3xl shadow-sm items-center">
          
          {/* Left info column: 6 cols */}
          <div className="md:col-span-6 space-y-4">
            <div className="inline-flex items-center space-x-2 bg-[#e2f1f4] border border-[#bad2d8] px-3 py-1 rounded-full text-sky-700 text-xs font-semibold uppercase tracking-wider">
              <Truck className="w-3.5 h-3.5 text-sky-500" />
              <span>{isZh ? '西马冷藏车送货服务' : 'Peninsular Cold Chain Delivery'}</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-slate-950">
              {isZh ? '查询您的地址是否支持冷链' : 'Verify Your Cold Chain Coverage'}
            </h3>
            <p className="text-xs md:text-sm text-[#536c74] leading-relaxed font-normal">
              {isZh
                ? '因为新鲜河鱼在运输途中绝不能融化，我们坚持使用【全程专业冷藏温控货车】送货上门。西马 90% 以上主要城镇均可送达。输入您所在的 5 位邮政编码，一键查询！'
                : 'Since premium river fish cannot thaw during transit, we deliver using strictly temperature-controlled logistics trucks. We cover 90% of West Malaysian suburbs. Enter your 5-digit postcode to check!'}
            </p>

            <div className="space-y-2 text-xs text-slate-600 pt-2">
              <div className="flex items-center space-x-2 text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-semibold">{isZh ? '✓ 雪隆、彭亨本地（运费 RM 20，满 RM 250 免运）' : '✓ KL/Selangor/Pahang: RM 20 (Free over RM 250)'}</span>
              </div>
              <div className="flex items-center space-x-2 text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-semibold">{isZh ? '✓ 其他州属主要城市（运费 RM 30，满 RM 250 免运）' : '✓ Other West Malaysian states: RM 30 (Free over RM 250)'}</span>
              </div>
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="font-semibold">{isZh ? '✗ 东马（沙巴沙捞越）由于无法走空运，暂不支持送货' : '✗ East Malaysia (Sabah & Sarawak) currently unsupported'}</span>
              </div>
            </div>
          </div>

          {/* Right Input Checker Form: 6 cols */}
          <div className="md:col-span-6 rhs-panel-soft border p-5 md:p-6 rounded-2xl space-y-4">
            <form onSubmit={checkPostcode} className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                {isZh ? '输入大马5位数邮政编码 (Postcode)' : 'Enter 5-digit Malaysia Postcode'}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="e.g. 47500"
                    maxLength={5}
                    className="w-full bg-[#f8fbfa] border border-[#c4d5d9] focus:border-sky-500 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none text-center font-mono tracking-widest text-base"
                  />
                </div>
                <button
                  type="submit"
                  disabled={postcode.length < 5}
                  className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-bold text-xs md:text-sm rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Search className="w-4 h-4" />
                  <span>{isZh ? '查询' : 'Check'}</span>
                </button>
              </div>
            </form>

            {/* Results Feedback box */}
            {result && (
              <div className="p-4 bg-[#f8fbfa] border border-[#c4d5d9] rounded-xl space-y-3 animate-fade-in text-xs leading-relaxed">
                
                {result.status === 'covered' && (
                  <>
                    <div className="flex items-center text-emerald-600 font-bold space-x-1.5">
                      <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                      <span>{isZh ? '✓ 支持冷链配送！服务已覆盖' : '✓ Service Available in Your Area!'}</span>
                    </div>
                    <div className="space-y-1 text-slate-700">
                      <p>📍 {isZh ? '预计城市/省属' : 'Identified Region'}: <strong className="text-slate-950 font-semibold">{result.city}, {result.state}</strong></p>
                      <p>📅 {isZh ? '派送时效' : 'Estimated Time'}: <strong className="text-sky-600 font-semibold">{result.eta}</strong></p>
                      <p>💵 {isZh ? '保冷装箱配送运费' : 'Shipping Charges'}: <strong className="text-amber-600 font-mono">RM {result.shippingFee}</strong> <span className="text-slate-500">({isZh ? '满 RM 250 免运费' : 'Free for orders over RM 250'})</span></p>
                    </div>
                  </>
                )}

                {result.status === 'not-covered' && (
                  <>
                    <div className="flex items-center text-red-600 font-bold space-x-1.5">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{isZh ? '✗ 抱歉，冷链物流尚未覆盖' : '✗ Sorry, Cold Chain Unsupported'}</span>
                    </div>
                    <div className="space-y-1 text-slate-600">
                      <p>📍 {isZh ? '目标区域' : 'Target region'}: <strong className="text-slate-800 font-semibold">{result.city}, {result.state}</strong></p>
                      <p>{isZh ? '由于东马区域无法保障48小时内绝对冷冻不融化，为了鱼肉品质，我们目前不支持东马空运派送。非常抱歉。' : 'Because East Malaysia requires long flight routes, we cannot guarantee rock-solid freezing. For meat freshness, air logistics is disabled.'}</p>
                    </div>
                  </>
                )}

                {result.status === 'unsupported-format' && (
                  <div className="flex items-center text-amber-600 space-x-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{isZh ? '请输入完整的5位数大马邮编' : 'Please input a complete 5-digit Malaysian postcode'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
