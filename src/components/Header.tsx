import { useState, useEffect } from 'react';
import { Menu, X, ShoppingCart, Globe, PhoneCall } from 'lucide-react';
import { Language } from '../types';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  cartCount: number;
  onCartClick: () => void;
  activeSection: string;
  setActiveSection: (sec: string) => void;
}

export default function Header({
  language,
  setLanguage,
  cartCount,
  onCartClick,
  activeSection,
  setActiveSection,
}: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home', zh: '首页', en: 'Home' },
    { id: 'products', zh: '产品系列', en: 'Products' },
    { id: 'process', zh: '购物流程', en: 'How to Buy' },
    { id: 'delivery', zh: '配送方式', en: 'Delivery' },
    { id: 'reviews', zh: '顾客好评', en: 'Reviews' },
    { id: 'contact', zh: '联络我们', en: 'Contact' },
  ];

  const handleNavClick = (id: string) => {
    setActiveSection(id);
    setIsOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80; // offset for sticky header
      const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <header
      id="app-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm py-3'
          : 'bg-white/40 backdrop-blur-xs py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div
            id="header-logo"
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => handleNavClick('home')}
          >
            <div className="bg-gradient-to-tr from-sky-500 to-blue-600 p-2 rounded-xl shadow-lg border border-sky-400/30">
              <svg
                className="w-6 h-6 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9z" />
                <path d="M12 22s-2-3-2-7 2-7 2-7 2 3 2 7-2 7-2 7z" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-wide text-slate-800 font-sans flex items-center">
                彭亨河鱼
                <span className="text-xs bg-sky-500 text-white font-semibold px-1.5 py-0.5 rounded-md ml-2 uppercase tracking-widest scale-90">
                  直供
                </span>
              </span>
              <span className="text-[10px] font-medium tracking-[0.18em] text-sky-600 font-mono uppercase">
                Pahang River Fish
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav id="desktop-nav" className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeSection === item.id
                    ? 'text-sky-600 bg-sky-50'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                {language === 'zh' ? item.zh : item.en}
              </button>
            ))}
          </nav>

          {/* Secondary Actions (Language, Contact, Cart) */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Toggle */}
            <button
              id="lang-toggle-desktop"
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-950 hover:border-slate-300 transition-colors cursor-pointer text-xs"
            >
              <Globe className="w-3.5 h-3.5 text-sky-500" />
              <span className="font-medium">
                {language === 'zh' ? 'English' : '简体中文'}
              </span>
            </button>

            {/* Support Line */}
            <a
              href="https://wa.me/60187682528"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1 text-xs text-emerald-600 hover:text-emerald-500 transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span className="font-mono">WhatsApp Support</span>
            </a>

            {/* Shopping Cart Button */}
            <button
              id="cart-btn-desktop"
              onClick={onCartClick}
              className="relative p-2 rounded-xl bg-gradient-to-tr from-sky-50 to-blue-50 hover:from-sky-100 hover:to-blue-100 border border-sky-100 hover:border-sky-300 text-sky-600 hover:text-sky-700 transition-all cursor-pointer shadow-xs"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-mono text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Cart and Menu Button */}
          <div className="flex lg:hidden items-center space-x-2">
            {/* Language Toggle Mobile Inside top */}
            <button
              id="lang-toggle-mobile-top"
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="flex items-center justify-center p-2 rounded-lg bg-slate-50 text-slate-700 border border-slate-200"
            >
              <Globe className="w-4 h-4 text-sky-500" />
            </button>

            {/* Cart Mobile */}
            <button
              id="cart-btn-mobile"
              onClick={onCartClick}
              className="relative p-2 rounded-lg bg-slate-50 text-sky-600 border border-slate-200"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white font-mono text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Hamburger */}
            <button
              id="hamburger-btn"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div id="mobile-menu" className="lg:hidden bg-white border-b border-slate-200 shadow-lg py-4 px-4 space-y-3">
          <div className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-base font-medium transition-colors ${
                  activeSection === item.id
                    ? 'text-sky-600 bg-sky-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {language === 'zh' ? item.zh : item.en}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-col space-y-3">
            <button
              id="lang-toggle-mobile-menu"
              onClick={() => {
                setLanguage(language === 'zh' ? 'en' : 'zh');
                setIsOpen(false);
              }}
              className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm"
            >
              <span className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-sky-500" />
                <span>{language === 'zh' ? 'Switch Language' : '切换语言'}</span>
              </span>
              <span className="text-sky-600 font-semibold">
                {language === 'zh' ? 'English' : '简体中文'}
              </span>
            </button>

            <a
              href="https://wa.me/60187682528"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center space-x-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-sm transition-colors shadow-md"
            >
              <PhoneCall className="w-4 h-4" />
              <span>WhatsApp Order Support</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
