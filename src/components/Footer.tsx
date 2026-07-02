import { Facebook, MessageCircle, Video, MapPin, Phone, Mail, Award, Clock } from 'lucide-react';
import { Language } from '../types';

interface FooterProps {
  language: Language;
  onPolicyClick?: (policyType: 'privacy' | 'terms' | 'refund') => void;
}

export default function Footer({ language, onPolicyClick }: FooterProps) {
  const isZh = language === 'zh';

  const links = [
    { label: isZh ? '首页' : 'Home', id: 'home' },
    { label: isZh ? '河鱼产品' : 'Our Fish Catalog', id: 'products' },
    { label: isZh ? '真空锁鲜' : 'Process & Quality', id: 'process' },
    { label: isZh ? '冷链配送' : 'Shipping Methods', id: 'delivery' },
    { label: isZh ? '顾客反馈' : 'Customer Reviews', id: 'reviews' },
    { label: isZh ? '联络我们' : 'Contact Us', id: 'contact' },
  ];

  const handleNavClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-slate-100 border-t border-slate-200 pt-16 pb-8 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
        
        {/* Brand Block: 4 Cols */}
        <div className="md:col-span-4 space-y-4">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-tr from-sky-500 to-blue-600 p-2 rounded-xl border border-sky-400/20 shadow-xs">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9z" />
                <path d="M12 22s-2-3-2-7 2-7 2-7 2 3 2 7-2 7-2 7z" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-wide text-slate-900">彭亨河鱼</span>
              <span className="text-[9px] tracking-[0.18em] text-sky-600 font-mono uppercase">Pahang River Fish</span>
            </div>
          </div>

          <p className="leading-relaxed text-slate-600 pr-4">
            {isZh
              ? '来自彭亨河之乡的顶级河鱼，坚持生态养殖与活体现杀。-40℃超低温真空保鲜锁死美味，冷运直达您的餐桌，给家人一份健康的美味。'
              : 'Taste the ultimate freshwater goodness from the rapid currents of the Pahang River. Processed alive, flash-frozen, and shipped via refrigerated trucks.'}
          </p>

          <div className="flex space-x-3 text-slate-500">
            <a
              href="https://www.facebook.com/profile.php?id=61573443726512"
              target="_blank"
              rel="noreferrer"
              className="p-2 bg-white border border-slate-200 rounded-lg hover:text-slate-900 hover:border-slate-300 transition-colors"
              title="Facebook"
            >
              <Facebook className="w-4 h-4 text-blue-600" />
            </a>
            <a
              href="https://wa.me/60187682528"
              target="_blank"
              rel="noreferrer"
              className="p-2 bg-white border border-slate-200 rounded-lg hover:text-slate-900 hover:border-slate-300 transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
            </a>
            <a
              href="https://www.tiktok.com/@raubhangseng?_r=1&_t=ZS-97fkyEViLix"
              target="_blank"
              rel="noreferrer"
              className="p-2 bg-white border border-slate-200 rounded-lg hover:text-slate-900 hover:border-slate-300 transition-colors"
              title="TikTok"
            >
              <Video className="w-4 h-4 text-slate-800" />
            </a>
          </div>
        </div>

        {/* Links Column: 2 Cols */}
        <div className="md:col-span-2 space-y-4 md:pl-4">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
            {isZh ? '快捷导航' : 'Quick Links'}
          </h4>
          <ul className="space-y-2 font-medium">
            {links.map((link, idx) => (
              <li key={idx}>
                <button
                  onClick={() => handleNavClick(link.id)}
                  className="hover:text-sky-600 hover:translate-x-0.5 transition-all text-slate-600 text-left cursor-pointer"
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Business details Column: 3 Cols */}
        <div className="md:col-span-3 space-y-4">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
            {isZh ? '冷链配送支持' : 'Cold Chain Support'}
          </h4>
          <p className="leading-relaxed text-slate-600">
            {isZh
              ? '西马主要城市（雪隆区、柔佛、槟城、彭亨、怡保等）均支持冷运货车直达，融化全额包赔。'
              : 'Refrigerated trucks deliver frozen fresh to main cities in Peninsular Malaysia. Full melting claim guarantee.'}
          </p>

          <div className="space-y-2 text-slate-500 text-[11px]">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{isZh ? '100% 彭亨河本源水质网养' : '100% Authentic Pahang River'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-sky-600 flex-shrink-0" />
              <span>{isZh ? '在线客服: 每天 9 AM - 10 PM' : 'Inquiries: Daily 9 AM - 10 PM'}</span>
            </div>
          </div>
        </div>

        {/* Contact info Column: 3 Cols */}
        <div className="md:col-span-3 space-y-4">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
            {isZh ? '联络与地址' : 'Address & Contact'}
          </h4>
          <div className="space-y-3 text-slate-600 leading-relaxed">
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px]">
                162, Jln Cheroh - Batu Malim, Kampung Baru Sungai Lui, 27600 Raub District, Pahang
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <Phone className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-mono">
                +60 18-768 2528
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <Mail className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-mono">
                hangsengraub@gmail.com
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Bottom copyright info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-slate-200 text-center space-y-3">
        {onPolicyClick && (
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-medium">
            <button
              onClick={() => onPolicyClick('privacy')}
              className="hover:text-sky-600 cursor-pointer transition-colors"
            >
              {isZh ? '隐私政策' : 'Privacy Policy'}
            </button>
            <span className="text-slate-300 select-none">•</span>
            <button
              onClick={() => onPolicyClick('terms')}
              className="hover:text-sky-600 cursor-pointer transition-colors"
            >
              {isZh ? '服务条款' : 'Terms of Service'}
            </button>
            <span className="text-slate-300 select-none">•</span>
            <button
              onClick={() => onPolicyClick('refund')}
              className="hover:text-sky-600 cursor-pointer transition-colors"
            >
              {isZh ? '退换货与退款政策' : 'Return & Refund Policy'}
            </button>
          </div>
        )}
        <p className="text-[10px] text-slate-400 font-mono">
          © {new Date().getFullYear()} 彭亨河鱼 PAHANG RIVER FISH SELLER (MALAYSIA) CO. LTD. ALL RIGHTS RESERVED.
        </p>
        <p className="text-[9px] text-slate-500 leading-normal">
          {isZh
            ? '声明：本网站产品资料、规格估重及价格仅供大马本地冷链订单下单参考，配送需遵守冷链专车排单路线规定。任何问题请直接联络我们的 WhatsApp 客服。'
            : 'Note: Product images, approximate weights, and prices are listed for domestic orders. Real-time courier dispatch is subject to route availability. For assistance, contact support via WhatsApp.'}
        </p>
      </div>
    </footer>
  );
}
