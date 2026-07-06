import { Compass, Snowflake, Zap, Package, Eye, Heart } from 'lucide-react';
import { Language } from '../types';

interface HowToBuyProps {
  language: Language;
}

export default function HowToBuy({ language }: HowToBuyProps) {
  const isZh = language === 'zh';

  const steps = [
    {
      icon: Compass,
      stepNum: '01',
      zhTitle: '彭亨河源头挑选捕捞',
      enTitle: 'Ethical Catching & Selection',
      zhDesc: '根据您的订单需求，渔民从清澈湍急的彭亨河自然生态流中网箱捕获或上游纯野生捕捞。保证原生态天然口感。',
      enDesc: 'Harvested directly from our pristine river cages or wild-caught in the rapids of the Pahang River basin. Pure local heritage.',
    },
    {
      icon: Zap,
      stepNum: '02',
      zhTitle: '特聘老师傅活杀处理',
      enTitle: 'Instant Live Processing',
      zhDesc: '起捕后活体运送，特聘老手艺师傅即时屠宰。精准剔除鳃、内脏和腥线，完全洗净，免去您繁琐的厨房清洗步骤。',
      enDesc: 'Processed immediately by seasoned fish handlers. We completely scale, gut, and de-gills each fish, eradicating the root sources of odor.',
    },
    {
      icon: Package,
      stepNum: '03',
      zhTitle: '食品级真空无氧包装',
      enTitle: 'High-barrier Vacuum Pack',
      zhDesc: '屠宰清洗完立即置入加厚双面无菌真空包装袋，排出空气并无缝密封。完美隔绝外界细菌，彻底防止冷冻干耗。',
      enDesc: 'Instantly sealed in dense food-grade sterilization bags under perfect vacuum. Completely seals against bacteria and prevents freezer dehydration.',
    },
    {
      icon: Snowflake,
      stepNum: '04',
      zhTitle: '-40℃ 级急速超低超频冷冻',
      enTitle: '-40°C Deep Flash Freeze',
      zhDesc: '数分钟内送入超低温速冻库，让鱼体细胞内水分子瞬间结晶。锁死营养与细胞液，解冻后肉质弹性复原度超 99%。',
      enDesc: 'Subjected to intensive cold deep blast freezers. Water molecules crystallize rapidly, protecting cellular fibers and keeping nutrients intact.',
    },
    {
      icon: Eye,
      stepNum: '05',
      zhTitle: '西马全程温控冷链货车配送',
      enTitle: 'Frozen Cold Chain Transport',
      zhDesc: '保冷纸箱包装，放入高纯冰袋。交由顺丰冷链或保冷货运专车直达西马主要城镇。送到您手中依然坚硬如冰。',
      enDesc: 'Packed inside insulated containers and delivered via cold-chain courier trucks. The fish reaches your kitchen rock-solid.',
    },
    {
      icon: Heart,
      stepNum: '06',
      zhTitle: '化冻清蒸，尊享鲜甜美味',
      enTitle: 'Thaw & Stream To Table',
      zhDesc: '从冷冻取出后，连同真空袋浸入清水泡半小时彻底化冻。清洗表皮后按推荐火候直接清蒸，鱼油芳香，全家大饱口福。',
      enDesc: 'Soak the sealed bag in cold tap water for 30 mins to thaw. Simply steam with premium soy sauce, and enjoy restaurant-level river fish!',
    },
  ];

  return (
    <section id="process" className="py-24 rhs-section border-t border-[#c4d5d9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Title */}
        <div className="text-center space-y-3 max-w-3xl mx-auto mb-16 animate-fade-in">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-sky-600">
            {isZh ? '专业活杀真空锁鲜流程' : 'The Fresh-Lock Journey'}
          </h2>
          <p className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {isZh ? '从彭亨河到您餐桌的六步保鲜' : 'Six Steps from Pahang River to Your Plate'}
          </p>
          <div className="h-1.5 w-16 bg-gradient-to-r from-sky-500 to-blue-600 mx-auto rounded-full" />
          <p className="text-[#536c74] text-sm">
            {isZh
              ? '拒绝普通菜市场的堆积死鱼，我们坚持全链路高标准活杀冷链，确保送到您府上的鱼犹如刚捕捞时一般细嫩肥美。'
              : 'Our systematic cold-chain flow guarantees optimum quality. No chemical preservatives, no melting, only natural river freshness.'}
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="relative rhs-panel border hover:border-sky-300 hover:bg-[#f8fbfa] rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1 group"
              >
                {/* Step numbering top-right */}
                <span className="absolute top-4 right-4 text-4xl font-black font-mono text-[#c7d6d8] group-hover:text-sky-100 transition-colors">
                  {step.stepNum}
                </span>

                {/* Step icon */}
                <div className="p-3 bg-[#f8fbfa] rounded-xl border border-[#c4d5d9] text-sky-500 w-12 h-12 flex items-center justify-center mb-6 group-hover:border-sky-300 group-hover:text-sky-600 transition-all shadow-xs">
                  <Icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-sky-600 transition-colors">
                    {isZh ? step.zhTitle : step.enTitle}
                  </h3>
                  <p className="text-xs text-[#536c74] leading-relaxed font-normal">
                    {isZh ? step.stepNum === '05' && isZh ? '由于是全程保冷配送，鱼送到时一定是坚硬没有解冻的。解冻后口感不输活鱼！' + ' ' + step.zhDesc : step.zhDesc : step.enDesc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Warning Alert box */}
        <div className="mt-12 bg-[#fff2ca] border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-left">
            <div className="p-2 bg-amber-150 text-amber-600 rounded-lg border border-amber-200">
              <Snowflake className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                {isZh ? '⚠️ 冰冻运输承诺及融化赔付保障' : '⚠️ Freeze Guarantee & Melting Claim'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed mt-0.5 max-w-2xl">
                {isZh
                  ? '我们提供专业的冷链运输保障。凡配送过程中出现漏气融化、解冻软化、异味等，拍照反馈，我们无条件在 24 小时内免费为您重发或原路退款！'
                  : 'We warrant a seamless freezing process. If your fish arrives melted or has leakage due to logistic courier transit, write to us on WhatsApp with photos for an immediate replacement.'}
              </p>
            </div>
          </div>
          <a
            href="https://wa.me/60187682528"
            target="_blank"
            rel="noreferrer"
            className="flex-shrink-0 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            {isZh ? 'WhatsApp 售后保障咨询' : 'WhatsApp Delivery Inquiry'}
          </a>
        </div>
      </div>
    </section>
  );
}
