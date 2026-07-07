import { ArrowRight, Building2, Fish, MapPin, ShieldCheck, Waves } from 'lucide-react';
import { Language } from '../types';

interface AboutUsProps {
  language: Language;
  onShopClick: () => void;
  onBusinessOrderClick: () => void;
}

const logoImage = new URL('../../assets/raub-hang-seng-logo.jpg', import.meta.url).href;
const storeImage = new URL('../../assets/about/raub-hang-seng-store.jpg', import.meta.url).href;
const farmImage = new URL('../../assets/about/raub-hang-seng-river-fish-farm.jpg', import.meta.url).href;
const patinImage = new URL('../../assets/about/raub-hang-seng-fresh-catch-patin.jpg', import.meta.url).href;
const tapahImage = new URL('../../assets/about/raub-hang-seng-tapah-fish.jpg', import.meta.url).href;

export default function AboutUs({ language, onShopClick, onBusinessOrderClick }: AboutUsProps) {
  const isZh = language === 'zh';

  const features = [
    {
      icon: Fish,
      zhTitle: '主打彭亨特色河鱼',
      enTitle: 'Pahang Signature River Fish',
      zhDesc: '专营 Patin Tinggi、Patin Lawang 等彭亨特色河鱼，肉质细腻紧实，适合清蒸、焖煮与餐厅菜式。',
      enDesc: 'Specializing in Patin Tinggi, Patin Lawang, and selected Pahang river fish with firm texture and rich natural sweetness.',
    },
    {
      icon: Waves,
      zhTitle: '活水养殖，绝无土味',
      enTitle: 'Live-Water Farming',
      zhDesc: '采用彭亨河天然活水养殖，流动水质让鱼类健康成长，鱼肉清甜鲜美，没有泥土腥味。',
      enDesc: 'Raised in flowing Pahang river water for clean flavor, healthy growth, and no muddy aftertaste.',
    },
    {
      icon: Building2,
      zhTitle: 'B2B 与 B2C 一站式服务',
      enTitle: 'B2B & B2C Supply',
      zhDesc: '服务餐厅酒楼、海鲜零售、批发采购，也服务重视品质的家庭顾客。',
      enDesc: 'Supplying restaurants, retailers, wholesale buyers, and families looking for reliable premium fish.',
    },
  ];

  const standards = [
    isZh ? '成立于 1997 年，扎根劳勿多年' : 'Established in 1997 and rooted in Raub',
    isZh ? '一站式河鱼及海鲜批发与零售' : 'One-stop river fish and seafood wholesale/retail',
    isZh ? '为餐厅酒楼与家庭顾客分开配货' : 'Separate supply flow for food service and home buyers',
    isZh ? '可通过 Facebook 与 WhatsApp 查询最新鱼获' : 'Latest catch updates via Facebook and WhatsApp',
  ];

  return (
    <section id="about-page" className="rhs-section-alt border-t border-[#c4d5d9] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <div className="relative overflow-hidden rounded-2xl border border-[#b7ccd1] bg-[#063655] shadow-sm">
          <img
            src={storeImage}
            alt={isZh ? 'Raub Hang Seng 劳勿门市与鱼池' : 'Raub Hang Seng storefront and fish tanks'}
            className="h-[420px] md:h-[520px] w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#041f33]/82 via-[#041f33]/38 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-8 lg:p-10 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#b7ccd1] bg-[#f4f8f7] px-3 py-1.5 text-xs font-bold text-[#0a5f84]">
              <MapPin className="w-3.5 h-3.5" />
              <span>{isZh ? 'Raub, Pahang since 1997' : 'Raub, Pahang since 1997'}</span>
            </div>

            <div className="mt-5 max-w-3xl min-w-0 text-white">
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black leading-tight tracking-tight break-words">
                {isZh ? (
                  <>
                    <span className="block">欢迎来到</span>
                    <span className="block">Raub Hang Seng</span>
                  </>
                ) : (
                  <>
                    <span className="block">Welcome to</span>
                    <span className="block">Raub Hang Seng</span>
                  </>
                )}
              </h1>
              <p className="mt-4 text-base md:text-lg leading-relaxed text-white/86 break-words [overflow-wrap:anywhere]">
                {isZh
                  ? '扎根彭亨劳勿，自 1997 年起为顾客提供优质天然河鲜。活水养殖，鲜甜无土味，品质承诺，始终如一。'
                  : 'Rooted in Raub, Pahang since 1997, we supply premium natural river fish with clean live-water farming, fresh sweetness, and consistent quality.'}
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onShopClick}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#073c63] px-5 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#082f4e] cursor-pointer"
              >
                <span>{isZh ? '查看河鱼产品' : 'Browse Fish Catalog'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onBusinessOrderClick}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#b7ccd1] bg-[#f4f8f7] px-5 py-3 text-sm font-bold text-[#17323d] transition-colors hover:border-[#7fa8b3] hover:bg-[#edf5f4] cursor-pointer"
              >
                <span>{isZh ? '餐饮/批发订购' : 'Business Ordering'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-5 min-w-0">
            <h2 className="text-2xl md:text-3xl font-black text-slate-950">
              {isZh ? '我们的故事' : 'Our Story'}
            </h2>
            <div className="space-y-4 text-sm md:text-base leading-relaxed text-[#536c74] break-words [overflow-wrap:anywhere]">
              <p>
                {isZh ? (
                  <>
                    成立于 1997 年，<strong className="text-slate-900">Raub Hang Seng Fish Supplier（劳勿恒生水产）</strong>
                    坐落于彭亨州劳勿。多年来，我们深耕水产行业，发展成为专业且备受信赖的一站式河鱼及海鲜批发与零售商。
                  </>
                ) : (
                  <>
                    Established in 1997, <strong className="text-slate-900">Raub Hang Seng Fish Supplier</strong> is based in Raub,
                    Pahang. Over the years, we have grown into a trusted one-stop river fish and seafood supplier for wholesale and retail buyers.
                  </>
                )}
              </p>
              <p>
                {isZh
                  ? '我们致力于为本地及周边地区的餐厅酒楼（B2B）以及家庭消费者（B2C）提供高品质食材。凭借对彭亨河鲜特性的深入了解以及严谨的品质把控，我们确保每一条送到餐桌上的河鱼都保持最原始的鲜甜。'
                  : 'We serve restaurants and food-service buyers (B2B) as well as home customers (B2C). With deep knowledge of Pahang river fish and strict handling standards, we protect the natural sweetness of every fish we deliver.'}
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            <div className="col-span-2 overflow-hidden rounded-2xl border border-[#b7ccd1] bg-[#f4f8f7] shadow-sm">
              <img
                src={farmImage}
                alt={isZh ? '彭亨河活水鱼场' : 'Pahang river fish farm'}
                className="h-[260px] w-full object-cover"
              />
            </div>
            <img
              src={patinImage}
              alt={isZh ? '彭亨巴丁鱼鱼获' : 'Fresh Pahang patin catch'}
              className="h-[220px] w-full rounded-2xl border border-[#b7ccd1] object-cover shadow-sm"
            />
            <img
              src={tapahImage}
              alt={isZh ? '彭亨淡水鱼鱼获' : 'Fresh Pahang river fish catch'}
              className="h-[220px] w-full rounded-2xl border border-[#b7ccd1] object-cover shadow-sm"
            />
          </div>
        </div>

        <div className="mt-12 rhs-panel border border-[#c4d5d9] rounded-2xl p-5 md:p-7 shadow-sm">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Raub Hang Seng" className="w-12 h-12 rounded-full object-cover border border-[#b7ccd1]" />
            <div>
              <p className="text-xs font-bold text-sky-700 uppercase tracking-widest">
                {isZh ? '我们的核心特色' : 'Core Strengths'}
              </p>
              <h2 className="text-2xl md:text-3xl font-black text-slate-950">
                {isZh ? '从鱼场到餐桌，服务家庭与商家' : 'From Farm to Table, for Families and Businesses'}
              </h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {features.map((item) => {
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

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 rhs-panel border border-[#c4d5d9] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-sky-700" />
              <h2 className="text-xl font-black text-slate-950">
                {isZh ? '品质承诺' : 'Quality Promise'}
              </h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#536c74]">
              {isZh
                ? '品质是我们的招牌。我们以彭亨河活水鱼源、长期供应经验与清楚的现货沟通，服务家庭顾客、餐厅酒楼和批发采购。'
                : 'Quality is our calling card. We combine Pahang live-water fish sources, long supply experience, and clear stock communication for home, restaurant, and wholesale buyers.'}
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {standards.map((standard) => (
              <div key={standard} className="flex items-center gap-3 rounded-xl border border-[#c4d5d9] bg-[#f4f8f7] px-4 py-3 text-sm font-semibold text-[#17323d]">
                <span className="w-2 h-2 rounded-full bg-sky-600 shrink-0" />
                <span>{standard}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-2xl bg-[#063655] px-5 py-10 md:px-8 text-center text-white shadow-sm">
          <h2 className="text-2xl md:text-3xl font-black">
            {isZh ? '联系与最新鱼获' : 'Contact and Latest Catch Updates'}
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm md:text-base leading-relaxed text-white/78">
            {isZh
              ? '想要采购最新鲜、无土味的彭亨河鱼？欢迎联系或亲临本店。最新鱼获、营业时间与接单安排可通过 Facebook 查看。'
              : 'Looking for fresh Pahang river fish with clean flavor and no muddy taste? Contact us or visit our store. Latest catch, business hours, and order updates are available on Facebook.'}
          </p>
          <p className="mx-auto mt-4 max-w-3xl text-xs md:text-sm leading-relaxed text-white/72">
            162, Jln Cheroh - Batu Malim, Kampung Baru Sungai Lui, 27600 Raub District, Pahang, Malaysia
          </p>
          <a
            href="https://www.facebook.com/profile.php?id=61573443726512"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#063655] shadow-md transition-colors hover:bg-sky-50"
          >
            <span>{isZh ? '关注我们的 Facebook 主页' : 'Follow Our Facebook Page'}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
