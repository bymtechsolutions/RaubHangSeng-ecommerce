import { Fish, MessageCircle, Package, ShoppingCart, Snowflake, Sparkles, Truck } from 'lucide-react';
import { Language } from '../types';

interface HeroProps {
  language: Language;
  onShopNowClick: () => void;
  onWhatsAppOrderClick: () => void;
  orderingPaused?: boolean;
}

const heroImage = new URL('../../assets/hero-river-fish-title.png', import.meta.url).href;

export default function Hero({ language, onShopNowClick, onWhatsAppOrderClick, orderingPaused = false }: HeroProps) {
  const isZh = language === 'zh';

  const highlights = [
    { icon: Fish, zh: '彭亨河直供', en: 'Pahang Direct' },
    { icon: Sparkles, zh: '活杀处理', en: 'Fresh Processed' },
    { icon: Package, zh: '真空包装', en: 'Vacuum Packed' },
    { icon: Snowflake, zh: '急速冷冻', en: 'Flash Frozen' },
    { icon: Truck, zh: '全马配送', en: 'Malaysia Delivery' },
  ];

  const guarantees = [
    {
      icon: Fish,
      zhTitle: '天然河水养殖',
      enTitle: 'Natural River Farming',
      zhDesc: '彭亨河流域，水质清澈',
      enDesc: 'Clean Pahang river source',
    },
    {
      icon: Fish,
      zhTitle: '每日新鲜处理',
      enTitle: 'Fresh Daily Handling',
      zhDesc: '活鱼现杀，保证新鲜',
      enDesc: 'Processed daily for freshness',
    },
    {
      icon: Package,
      zhTitle: '真空包装锁鲜',
      enTitle: 'Vacuum Fresh Lock',
      zhDesc: '卫生包装，保留原味',
      enDesc: 'Clean packed, original taste',
    },
    {
      icon: Truck,
      zhTitle: '冷冻配送到家',
      enTitle: 'Frozen Delivery',
      zhDesc: '全马配送，安全送达',
      enDesc: 'Safe chilled delivery',
    },
  ];

  return (
    <section
      id="home"
      className="relative pt-[var(--rhs-topbar-height)] overflow-visible bg-[#cfe5ed] text-[#092942]"
    >
      <img
        src={heroImage}
        alt="Fresh Pahang river fish on ice beside a tropical river"
        width={1584}
        height={672}
        className="block w-full h-auto"
      />
      <div className="absolute inset-x-0 top-[var(--rhs-topbar-height)] bottom-0 bg-linear-to-b from-white/6 via-white/2 to-black/8" />
      <div className="absolute inset-x-0 top-[var(--rhs-topbar-height)] h-56 bg-linear-to-b from-white/24 to-transparent" />

      <div className="relative z-10 -mt-2 flex flex-col items-center px-4 pb-8 sm:px-6 md:absolute md:inset-x-0 md:top-[var(--rhs-topbar-height)] md:bottom-0 md:mt-0 md:pb-0 lg:px-8">
        <div className="w-full max-w-[980px] mx-auto pt-0 text-center md:pt-[clamp(150px,20vw,380px)]">
          <h1 className="sr-only">{isZh ? '彭亨河鱼' : 'Pahang River Fish'}</h1>
          <p className="sr-only">{isZh ? '活杀河鱼 新鲜到家' : 'Fresh River Fish To Your Door'}</p>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2 md:gap-2.5 w-full max-w-[300px] sm:max-w-none mx-auto">
            {highlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.zh}
                  className="inline-flex items-center justify-center gap-1.5 min-h-8 md:min-h-9 px-2.5 sm:px-3 md:px-4 rounded-md bg-white/78 backdrop-blur-md border border-white/75 shadow-[0_3px_10px_rgba(12,42,61,0.12)] text-[#203c42] text-[12px] sm:text-[13px] md:text-[16px] font-semibold"
                >
                  <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#244b50]" />
                  <span>{isZh ? item.zh : item.en}</span>
                  {index < highlights.length - 1 && (
                    <span className="hidden md:block ml-1.5 h-4 w-px bg-[#203c42]/22" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3.5 md:mt-4 flex flex-col sm:flex-row items-center justify-center gap-2.5 md:gap-4">
            <button
              onClick={onShopNowClick}
              className="w-full max-w-[220px] sm:w-[190px] md:w-[210px] h-11 md:h-12 rounded-lg bg-[#073c63] hover:bg-[#082f4e] border border-[#073c63] text-white inline-flex items-center justify-center gap-2.5 text-[15px] md:text-[17px] font-semibold shadow-[0_6px_16px_rgba(2,31,54,0.28)] transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-5 h-5 md:w-[22px] md:h-[22px] stroke-[1.8]" />
              <span>{isZh ? '立即选购' : 'Shop Now'}</span>
            </button>
            <button
              onClick={onWhatsAppOrderClick}
              disabled={orderingPaused}
              className={`w-full max-w-[220px] sm:w-[190px] md:w-[210px] h-11 md:h-12 rounded-lg border inline-flex items-center justify-center gap-2.5 text-[15px] md:text-[17px] font-semibold shadow-[0_5px_14px_rgba(255,255,255,0.18)] backdrop-blur-xs transition-colors ${
                orderingPaused
                  ? 'bg-slate-100/70 border-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-white/50 hover:bg-white/68 border-[#0a4267] text-[#0b3756] cursor-pointer'
              }`}
            >
              <MessageCircle className="w-5 h-5 md:w-[22px] md:h-[22px] stroke-[1.8]" />
              <span>{orderingPaused ? (isZh ? '暂不接单' : 'Ordering Paused') : (isZh ? 'Whatsapp订购' : 'WhatsApp Order')}</span>
            </button>
          </div>
        </div>

        <div id="guarantees" className="relative z-20 w-full max-w-[1320px] mt-6 mb-0 translate-y-0 md:mt-auto md:translate-y-1/2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-lg overflow-hidden bg-[#073b5e] shadow-[0_12px_30px_rgba(3,30,49,0.38)] border border-white/10">
            {guarantees.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.zhTitle}
                  className={`min-h-[88px] flex items-center gap-4 px-5 md:px-8 py-4 text-white ${
                    index < guarantees.length - 1 ? 'lg:border-r lg:border-white/30' : ''
                  }`}
                >
                  <Icon className="w-10 h-10 md:w-11 md:h-11 text-white stroke-[1.65] shrink-0" />
                  <div>
                    <h3 className="text-[18px] md:text-[20px] leading-none font-semibold">
                      {isZh ? item.zhTitle : item.enTitle}
                    </h3>
                    <p className="mt-2 text-[12px] md:text-[13px] leading-none text-white/88">
                      {isZh ? item.zhDesc : item.enDesc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
