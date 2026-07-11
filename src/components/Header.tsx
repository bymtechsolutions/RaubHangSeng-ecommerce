import { useState } from 'react';
import { ChevronDown, Languages, LogOut, Menu, ShoppingBag, UserCircle, X } from 'lucide-react';
import { CollectionDisplay, Language, User } from '../types';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  cartCount: number;
  onCartClick: () => void;
  activeSection: string;
  setActiveSection: (sec: string) => void;
  currentUser: User | null;
  collections?: CollectionDisplay[];
  onAuthClick: () => void;
  onLogout: () => void;
  onSellerClick?: () => void;
}

const logoImage = new URL('../../assets/raub-hang-seng-logo-mark.jpg', import.meta.url).href;

export default function Header({
  language,
  setLanguage,
  cartCount,
  onCartClick,
  activeSection,
  setActiveSection,
  currentUser,
  collections = [],
  onAuthClick,
  onLogout,
  onSellerClick,
}: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
  const isZh = language === 'zh';

  const navItems = [
    { id: 'home', zh: '首页', en: 'Home' },
    { id: 'about', zh: '关于我们', en: 'About' },
    { id: 'collections', zh: '产品系列', en: 'Products' },
    { id: 'business-order', zh: '商务订购', en: 'Business Order' },
    { id: 'process', zh: '购物流程', en: 'How to Buy' },
    { id: 'delivery', zh: '配送方式', en: 'Delivery' },
    { id: 'contact', zh: '联系我们', en: 'Contact' },
  ];

  const productMenuItems = [
    { id: 'products', zh: '全部河鱼', en: 'Shop All' },
    ...collections.map(collection => ({
      id: `shop:${collection.id}`,
      zh: collection.titleZh,
      en: collection.titleEn,
    })),
  ];

  const handleNavClick = (id: string) => {
    setActiveSection(id);
    setIsOpen(false);
    setIsProductMenuOpen(false);
  };

  return (
    <header
      id="app-header"
      className="fixed top-0 left-0 right-0 z-50 h-[var(--rhs-topbar-height)] bg-[#063655] text-white border-b border-white/10 shadow-[0_7px_18px_rgba(2,21,35,0.22)]"
    >
      <div className="max-w-[1400px] h-full mx-auto px-4 md:px-6">
        <div className="h-full flex items-center justify-between gap-4">
          <button
            id="header-logo"
            onClick={() => handleNavClick('home')}
        className="flex items-center gap-3 text-left cursor-pointer shrink-0"
            aria-label={isZh ? '返回首页' : 'Back to home'}
          >
        <span className="relative h-12 w-12 md:h-14 md:w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-white/80 shadow-md">
          <img
            src={logoImage}
            alt="Raub Hang Seng fish logo"
            className="absolute inset-0 h-full w-full object-cover scale-[1.45]"
            style={{ transformOrigin: '50% 60%' }}
          />
        </span>
            <span className="flex flex-col leading-none">
              <span className="text-[18px] md:text-[24px] font-semibold tracking-[0.02em]">
                RaubHangSeng
              </span>
              <span className="mt-1.5 text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90">
                Fish Supplier
              </span>
            </span>
          </button>

          <nav id="desktop-nav" className="hidden lg:flex flex-1 items-center justify-center gap-4 xl:gap-6 text-[13px] xl:text-[15px] font-semibold">
            {navItems.map((item) => {
              const isProductItem = item.id === 'collections';
              const isActive = activeSection === item.id || (isProductItem && activeSection === 'products');

              if (isProductItem) {
                return (
                  <div
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => setIsProductMenuOpen(true)}
                    onMouseLeave={() => setIsProductMenuOpen(false)}
                  >
                    <button
                      onClick={() => handleNavClick(item.id)}
                      onFocus={() => setIsProductMenuOpen(true)}
                      className={`inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isActive ? 'text-white' : 'text-white/90 hover:text-white'
                      }`}
                    >
                      <span>{isZh ? item.zh : item.en}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${isProductMenuOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isProductMenuOpen && (
                      <div className="absolute left-1/2 top-full z-[70] w-52 -translate-x-1/2 pt-4">
                        <div className="overflow-hidden rounded-xl border border-[#b9d2d8] bg-[#f8fbfa] py-2 text-[#17323d] shadow-[0_18px_36px_rgba(3,30,49,0.22)]">
                          {productMenuItems.map((menuItem) => (
                            <button
                              key={menuItem.id}
                              onClick={() => handleNavClick(menuItem.id)}
                              className="block w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-[#e4f0f1] hover:text-[#073c63] transition-colors cursor-pointer"
                            >
                              {isZh ? menuItem.zh : menuItem.en}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`transition-colors cursor-pointer ${
                    isActive
                      ? 'text-white'
                      : 'text-white/90 hover:text-white'
                  }`}
                >
                  {isZh ? item.zh : item.en}
                </button>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <button
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/90 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
              aria-label={isZh ? 'Switch to English' : '切换中文'}
            >
              <Languages className="w-4 h-4" />
            </button>
            <button
              onClick={onCartClick}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-bold text-white/90 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{isZh ? '购物车' : 'Cart'}</span>
              <span className="font-mono">{cartCount}</span>
            </button>
            <button
              onClick={onAuthClick}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-sky-500 px-3 text-xs font-bold text-white hover:bg-sky-400 transition-colors cursor-pointer"
            >
              <UserCircle className="w-4 h-4" />
              <span>{currentUser ? (isZh ? '个人资料' : 'Profile') : (isZh ? '登录 / 注册' : 'Login / Sign up')}</span>
            </button>
            {currentUser && (
              <button
                onClick={onLogout}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/90 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                aria-label={isZh ? '登出' : 'Logout'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <button
        id="hamburger-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="mobile-menu-button fixed right-4 top-3 z-[60] w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#063655] shadow-md cursor-pointer"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div id="mobile-menu" className="lg:hidden bg-[#063655] border-t border-white/10 px-5 py-4 shadow-xl">
          <div className="grid gap-1">
            {navItems.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => handleNavClick(item.id)}
                  className="w-full text-left px-3 py-3 rounded-lg text-white/90 hover:bg-white/10 hover:text-white text-base font-semibold"
                >
                  {isZh ? item.zh : item.en}
                </button>
                {item.id === 'collections' && (
                  <div className="grid grid-cols-2 gap-2 px-3 pb-2">
                    {productMenuItems.map((menuItem) => (
                      <button
                        key={menuItem.id}
                        onClick={() => handleNavClick(menuItem.id)}
                        className="rounded-lg bg-white/10 px-3 py-2 text-left text-xs font-semibold text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                      >
                        {isZh ? menuItem.zh : menuItem.en}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 grid gap-3">
            <div className={`grid gap-2 ${currentUser ? 'grid-cols-2' : 'grid-cols-3'}`}>
              <button
                onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
                className="py-2.5 rounded-lg bg-white/10 text-white text-sm font-semibold"
              >
                {isZh ? 'English' : '中文'}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCartClick();
                }}
                className="py-2.5 rounded-lg bg-white/10 text-white text-sm font-semibold"
              >
                {isZh ? `购物车 ${cartCount}` : `Cart ${cartCount}`}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onAuthClick();
                }}
                className="py-2.5 rounded-lg bg-white/10 text-white text-sm font-semibold"
              >
                {currentUser ? (isZh ? '个人资料' : 'Profile') : isZh ? '登录 / 注册' : 'Login / Sign up'}
              </button>
              {currentUser && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="py-2.5 rounded-lg bg-white/10 text-white text-sm font-semibold"
                >
                  {isZh ? '登出' : 'Logout'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
