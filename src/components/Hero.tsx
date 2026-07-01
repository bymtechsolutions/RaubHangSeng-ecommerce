import { ArrowRight, ShoppingCart, MessageSquare, ShieldCheck, Zap, Package, Truck, Compass } from 'lucide-react';
import { Language } from '../types';

interface HeroProps {
  language: Language;
  onShopNowClick: () => void;
  onWhatsAppOrderClick: () => void;
}

export default function Hero({ language, onShopNowClick, onWhatsAppOrderClick }: HeroProps) {
  const isZh = language === 'zh';

  const highlights = [
    { icon: Compass, zh: '彭亨河直供', en: 'Pahang Direct' },
    { icon: Zap, zh: '活杀处理', en: 'Freshly Scaled' },
    { icon: Package, zh: '真空包装', en: 'Vacuum Packed' },
    { icon: ShieldCheck, zh: '急速冷冻', en: 'Flash Frozen' },
    { icon: Truck, zh: '全马配送', en: 'Malaysia Wide' },
  ];

  const guarantees = [
    {
      icon: (
        <svg className="w-10 h-10 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 115.414-3.017 5.25 5.25 0 00-10.233-2.33 3 3 0 00-5.317 0c-.093-.013-.188-.02-.284-.02a5.25 5.25 0 00-5.25 5.25v3.31a.75.75 0 00.37.649l1.62.912c.16.09.355.09.515 0l1.62-.912a.75.75 0 00.37-.649V12" />
        </svg>
      ),
      zhTitle: '天然河水养殖',
      enTitle: 'Pristine River Farm',
      zhDesc: '彭亨河流域，水质清澈流速快，鱼儿活力十足，肉质爽滑紧实。',
      enDesc: 'Pristine Pahang water with swift river currents. Fish are active & meat is clean.',
    },
    {
      icon: (
        <svg className="w-10 h-10 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.283 8.283 0 013.137-4.896z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11.25a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      zhTitle: '每日新鲜处理',
      enTitle: 'Fresh Daily Slaughter',
      zhDesc: '活鱼即时屠宰去鳃去内脏，无沙无腥，最大程度保留极鲜口感。',
      enDesc: 'Slaughtered alive instantly, descaled & gutted. Zero mud smell, pure fresh taste.',
    },
    {
      icon: (
        <svg className="w-10 h-10 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5v9l9 5.25m0-14.25v14.25" />
        </svg>
      ),
      zhTitle: '真空包装锁鲜',
      enTitle: 'Vacuum Fresh-Lock',
      zhDesc: '食品级高阻隔真空包装，有效防止鱼肉脱水氧化，锁住第一手鲜甜。',
      enDesc: 'Food-grade vacuum sealing prevents freezer burn and oxidation, preserving nutrients.',
    },
    {
      icon: (
        <svg className="w-10 h-10 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.09-1.423a2.475 2.475 0 00-.518-1.503l-1.3-1.72a2.475 2.475 0 00-1.956-.962H15V7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 00-.75.75v11.25m0 0H7.5" />
        </svg>
      ),
      zhTitle: '冷冻配送到家',
      enTitle: 'Frozen Cold Chain',
      zhDesc: '全程专规冷藏货车保冷直达，全马主要城市安全送货到门。',
      enDesc: 'Transported under controlled freezing temperatures. Safe delivery to your doorstep.',
    },
  ];

  return (
    <section
      id="home"
      className="relative min-h-screen bg-slate-50 flex flex-col justify-between pt-24 overflow-hidden"
    >
      {/* Background Image with Dual Overlay Gradients */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1920&q=80"
          alt="Pahang River background"
          className="w-full h-full object-cover opacity-50 sm:opacity-60 scale-105 filter saturate-105 brightness-105 transition-all duration-1000"
          referrerPolicy="no-referrer"
        />
        {/* Soft morning fog vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-sky-50/40 to-slate-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-transparent to-white/90 opacity-80" />
      </div>

      {/* Hero Content Area */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-grow flex flex-col justify-center items-center text-center py-16">
        {/* Top Tag */}
        <div className="inline-flex items-center space-x-2 bg-sky-100/80 border border-sky-200 px-3.5 py-1.5 rounded-full mb-6 backdrop-blur-md animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
          <span className="text-xs md:text-sm font-semibold tracking-wide text-sky-700 uppercase">
            {isZh ? '彭亨州特马鲁直供首选' : 'Direct from Temerloh, Pahang'}
          </span>
        </div>

        {/* Brand Display Header */}
        <div className="space-y-4 max-w-4xl">
          {isZh ? (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col items-center justify-center space-y-1">
                <h1 className="text-6xl sm:text-8xl md:text-9xl font-normal text-transparent bg-clip-text bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-950 font-brush tracking-wide drop-shadow-xs py-2 select-none">
                  彭亨河鱼
                </h1>
                <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal text-slate-800 font-calligraphy tracking-widest flex items-center justify-center space-x-2 md:space-x-4">
                  <span className="opacity-30">—</span>
                  <span>活杀河鱼 新鲜到家</span>
                  <span className="opacity-30">—</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3 md:space-x-4">
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 drop-shadow-xs font-sans">
                  Pahang River Fish
                </h1>
                <div className="border border-amber-300 bg-amber-50 px-2 py-1.5 md:px-3 md:py-2.5 rounded-lg flex flex-col items-center justify-center backdrop-blur-md shadow-sm rotate-3">
                  <span className="text-[10px] md:text-xs font-bold text-amber-700 tracking-widest uppercase">
                    Direct
                  </span>
                  <span className="text-[8px] md:text-[9px] font-medium text-amber-800 uppercase font-mono tracking-wider">
                    Origin
                  </span>
                </div>
              </div>

              <p className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-700 via-sky-600 to-blue-700 tracking-wide">
                Live Slaughtered • Frozen Fresh To Door
              </p>
            </div>
          )}

          <p className="max-w-2xl mx-auto text-sm md:text-base text-slate-600 leading-relaxed font-normal">
            {isZh
              ? '传承大马河鱼正宗风味，精选彭亨河天然网箱与野生捕捞。不含任何防腐剂与化学添加，活杀后数分钟内急速冷冻，锁住最纯粹的极鲜甜美味。'
              : 'Taste the legendary freshwater treasures of Malaysia. Sourced directly from the rapid streams of Pahang River. Processed alive and blast-frozen at -40°C to secure optimal fresh sweetness.'}
          </p>
        </div>

        {/* Five Core Pills */}
        <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3 mt-8 max-w-3xl">
          {highlights.map((pill, idx) => {
            const Icon = pill.icon;
            return (
              <div
                key={idx}
                className="flex items-center space-x-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-slate-200 bg-white/80 backdrop-blur-md text-slate-700 text-xs md:text-sm font-medium transition-all hover:border-sky-300 hover:bg-sky-50"
              >
                <Icon className="w-3.5 h-3.5 text-sky-500" />
                <span>{isZh ? pill.zh : pill.en}</span>
              </div>
            );
          })}
        </div>

        {/* Dual Call-to-actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 w-full max-w-md">
          {/* Shop Now Button */}
          <button
            onClick={onShopNowClick}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 shadow-md border border-sky-400/20 active:scale-98 transition-all cursor-pointer group text-base"
          >
            <ShoppingCart className="w-5 h-5 text-sky-100 group-hover:scale-110 transition-transform" />
            <span>{isZh ? '立即选购' : 'Shop Fresh Fish'}</span>
            <ArrowRight className="w-4 h-4 text-sky-200 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* WhatsApp Order Button */}
          <button
            onClick={onWhatsAppOrderClick}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 rounded-xl font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-500/40 hover:text-emerald-600 active:scale-98 transition-all cursor-pointer text-base shadow-xs"
          >
            <MessageSquare className="w-5 h-5 text-emerald-500" />
            <span>{isZh ? 'WhatsApp 订购' : 'Order via WhatsApp'}</span>
          </button>
        </div>
      </div>

      {/* Bottom Features Banner bar */}
      <div id="guarantees" className="relative z-10 bg-white/80 border-t border-slate-200/80 backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {guarantees.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-4 p-2 group rounded-xl transition-all hover:bg-slate-100/50"
              >
                <div className="flex-shrink-0 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sky-500 group-hover:border-sky-300 transition-all shadow-xs">
                  {item.icon}
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800 font-sans group-hover:text-sky-600 transition-colors">
                    {isZh ? item.zhTitle : item.enTitle}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {isZh ? item.zhDesc : item.enDesc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
