import type { Language, Product } from '../types';

export type SeoRoute = 'home' | 'shop' | 'product' | 'about' | 'business-order' | 'login' | 'seller' | 'privacy' | 'terms' | 'refund';

interface SeoInput {
  route: SeoRoute;
  language: Language;
  product?: Product | null;
}

const SITE_URL = 'https://rhsfish.com';
const SITE_NAME = 'Raub Hang Seng Fisheries';
const DEFAULT_IMAGE = `${SITE_URL}/favicon.jpg`;

const routeCopy: Record<Exclude<SeoRoute, 'product'>, Record<Language, { title: string; description: string }>> = {
  home: {
    zh: {
      title: 'Raub Hang Seng Fisheries | 彭亨河鱼冷链配送',
      description: '劳勿恒生水产供应新鲜彭亨河鱼，以专业冷链配送至西马家庭、餐厅与批发客户。',
    },
    en: {
      title: 'Raub Hang Seng Fisheries | Fresh Pahang River Fish',
      description: 'Fresh Pahang river fish delivered across Peninsular Malaysia by cold-chain truck for homes, restaurants, and wholesale buyers.',
    },
  },
  shop: {
    zh: {
      title: '选购彭亨河鱼 | Raub Hang Seng Fisheries',
      description: '选购巴丁鱼、苏丹鱼、忘不了鱼、红尼罗鱼与其他彭亨河鱼，西马冷链配送。',
    },
    en: {
      title: 'Shop Pahang River Fish | Raub Hang Seng Fisheries',
      description: 'Shop Patin, Sultan Fish, Empurau, Red Tilapia, and other Pahang river fish with Peninsular Malaysia cold-chain delivery.',
    },
  },
  about: {
    zh: {
      title: '关于劳勿恒生水产 | 1997 年创立',
      description: '认识创立于 1997 年的 Raub Hang Seng Fish Supplier，扎根彭亨劳勿，服务家庭、餐厅与批发采购。',
    },
    en: {
      title: 'About Raub Hang Seng Fisheries | Since 1997',
      description: 'Meet the Raub, Pahang river-fish supplier serving families, restaurants, and wholesale buyers since 1997.',
    },
  },
  'business-order': {
    zh: {
      title: '餐厅与批发河鱼订购 | Raub Hang Seng Fisheries',
      description: '彭亨河鱼餐厅、酒楼及批发采购服务。联系我们查询现货、规格与冷链配送安排。',
    },
    en: {
      title: 'Restaurant & Wholesale Fish Orders | Raub Hang Seng',
      description: 'Pahang river-fish supply for restaurants, food-service operators, and wholesale buyers. Ask about stock, sizing, and delivery.',
    },
  },
  login: {
    zh: { title: '会员登录 | Raub Hang Seng Fisheries', description: '登录或注册会员账号以查看个人资料与订单。' },
    en: { title: 'Member Login | Raub Hang Seng Fisheries', description: 'Sign in or register to view your profile and orders.' },
  },
  seller: {
    zh: { title: '商家后台 | Raub Hang Seng Fisheries', description: 'Raub Hang Seng Fisheries 商家管理后台。' },
    en: { title: 'Seller Dashboard | Raub Hang Seng Fisheries', description: 'Raub Hang Seng Fisheries seller administration.' },
  },
  privacy: {
    zh: { title: '隐私政策 | Raub Hang Seng Fisheries', description: '了解我们如何收集、使用与保护客户资料。' },
    en: { title: 'Privacy Policy | Raub Hang Seng Fisheries', description: 'Learn how we collect, use, and protect customer information.' },
  },
  terms: {
    zh: { title: '服务条款 | Raub Hang Seng Fisheries', description: '查看使用本商城及提交订单时适用的服务条款。' },
    en: { title: 'Terms of Service | Raub Hang Seng Fisheries', description: 'Review the terms that apply when using this store and placing an order.' },
  },
  refund: {
    zh: { title: '退款与配送政策 | Raub Hang Seng Fisheries', description: '查看冷链河鱼订单的配送、问题申报与退款政策。' },
    en: { title: 'Refund & Delivery Policy | Raub Hang Seng Fisheries', description: 'Review delivery, issue-reporting, and refund terms for cold-chain fish orders.' },
  },
};

const upsertMeta = (attribute: 'name' | 'property', key: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
};

const absoluteMediaUrl = (value: string | undefined) => {
  if (!value || /^(data|blob):/i.test(value)) return DEFAULT_IMAGE;
  try {
    return new URL(value, SITE_URL).href;
  } catch {
    return DEFAULT_IMAGE;
  }
};

const canonicalPath = (route: SeoRoute, product?: Product | null) => {
  if (route === 'home') return '/';
  if (route === 'product') return product ? `/product/${encodeURIComponent(product.id)}` : '/shop';
  if (route === 'seller') return '/seller';
  return `/${route}`;
};

const pageCopy = ({ route, language, product }: SeoInput) => {
  if (route === 'product' && product) {
    const name = language === 'zh' ? product.nameZh : product.nameEn;
    const description = language === 'zh' ? product.descriptionZh : product.descriptionEn;
    return {
      title: `${name} | ${SITE_NAME}`,
      description: description.trim().slice(0, 160),
    };
  }
  return routeCopy[route === 'product' ? 'shop' : route][language];
};

const updateStructuredData = (canonicalUrl: string, title: string, description: string, isPrivate: boolean) => {
  const existing = document.getElementById('rhs-structured-data');
  if (isPrivate) {
    existing?.remove();
    return;
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Store', 'LocalBusiness'],
        '@id': `${SITE_URL}/#store`,
        name: SITE_NAME,
        alternateName: '劳勿恒生水产',
        url: SITE_URL,
        logo: DEFAULT_IMAGE,
        image: DEFAULT_IMAGE,
        telephone: '+60187682528',
        email: 'hangsengraub@gmail.com',
        foundingDate: '1997',
        currenciesAccepted: 'MYR',
        paymentAccepted: 'Bank transfer',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '162, Jln Cheroh - Batu Malim, Kampung Baru Sungai Lui',
          postalCode: '27600',
          addressLocality: 'Raub',
          addressRegion: 'Pahang',
          addressCountry: 'MY',
        },
        areaServed: { '@type': 'AdministrativeArea', name: 'Peninsular Malaysia' },
        sameAs: [
          'https://www.facebook.com/profile.php?id=61573443726512',
          'https://www.tiktok.com/@raubhangseng',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: ['zh-Hans', 'en-MY'],
        publisher: { '@id': `${SITE_URL}/#store` },
      },
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: title,
        description,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': `${SITE_URL}/#store` },
      },
    ],
  };

  const element = existing || document.createElement('script');
  element.id = 'rhs-structured-data';
  element.setAttribute('type', 'application/ld+json');
  element.textContent = JSON.stringify(structuredData);
  if (!existing) document.head.appendChild(element);
};

export const updateDocumentSeo = (input: SeoInput) => {
  const { title, description } = pageCopy(input);
  const canonicalUrl = `${SITE_URL}${canonicalPath(input.route, input.product)}`;
  const imageUrl = input.route === 'product' ? absoluteMediaUrl(input.product?.image) : DEFAULT_IMAGE;
  const isPrivate = input.route === 'seller' || input.route === 'login';
  const robots = isPrivate ? 'noindex,nofollow,noarchive' : 'index,follow,max-image-preview:large';

  document.documentElement.lang = input.language === 'zh' ? 'zh-Hans' : 'en-MY';
  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', robots);
  upsertMeta('property', 'og:type', input.route === 'product' ? 'product' : 'website');
  upsertMeta('property', 'og:locale', input.language === 'zh' ? 'zh_MY' : 'en_MY');
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', canonicalUrl);
  upsertMeta('property', 'og:image', imageUrl);
  upsertMeta('name', 'twitter:card', input.route === 'product' ? 'summary_large_image' : 'summary');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', imageUrl);

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl;
  updateStructuredData(canonicalUrl, title, description, isPrivate);
};
