import React, { useEffect } from 'react';
import { ArrowLeft, Shield, FileText, RotateCcw, CheckCircle2, AlertCircle, Mail, Phone } from 'lucide-react';
import { Language } from '../types';

interface PolicyViewProps {
  initialPolicyType: 'privacy' | 'terms' | 'refund';
  language: Language;
  onClose: () => void;
}

export default function PolicyView({ initialPolicyType, language, onClose }: PolicyViewProps) {
  const [activeTab, setActiveTab] = React.useState<'privacy' | 'terms' | 'refund'>(initialPolicyType);
  const isZh = language === 'zh';

  // Automatically scroll to top when page opens or tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50/60 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Back Button and Header Navigation */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <button
            onClick={onClose}
            className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-sky-600 transition-colors group cursor-pointer w-fit"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>{isZh ? '返回商城首页' : 'Back to Shop'}</span>
          </button>

          {/* Inline Tab Navigation */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-white text-sky-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isZh ? '隐私政策' : 'Privacy'}</span>
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'terms'
                  ? 'bg-white text-sky-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isZh ? '服务条款' : 'Terms'}</span>
            </button>
            <button
              onClick={() => setActiveTab('refund')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'refund'
                  ? 'bg-white text-sky-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isZh ? '退换货政策' : 'Refund & Return'}</span>
            </button>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden p-6 sm:p-10 md:p-12">
          
          {/* TAB 1: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-slate-100 pb-6">
                <div className="inline-flex items-center space-x-2 text-sky-600 bg-sky-50 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider mb-3">
                  <Shield className="w-4 h-4" />
                  <span>Privacy Protection</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  Privacy Policy
                </h1>
                <p className="text-lg font-bold text-slate-500 mt-1 font-sans">
                  隐私政策
                </p>
              </div>

              {/* Intro */}
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700 leading-relaxed font-medium">
                  <strong>Raub Hang Seng</strong> respects your privacy and is committed to protecting your personal data in compliance with the Personal Data Protection Act (PDPA) of Malaysia. This Privacy Policy explains how we collect, use, and share your personal information.
                </p>
                <span className="block text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-3 leading-relaxed">
                  <strong>劳勿恒生水产 (Raub Hang Seng)</strong> 尊重您的隐私，并承诺遵守马来西亚《个人数据保护法》(PDPA) 来保护您的个人数据。本隐私政策解释了我们如何收集、使用和共享您的个人信息。
                </span>
              </div>

              {/* Section 1 */}
              <div className="space-y-3 pt-4">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-xs font-bold font-mono">1</span>
                  <span>Information We Collect / 我们收集的信息</span>
                </h2>
                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    When you make a purchase or register on our website, we collect personal information such as your:
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4 list-disc text-sm text-slate-600 font-medium">
                    <li>Name and Contact Number (姓名及联系电话)</li>
                    <li>Delivery and Billing Address (送货与账单地址)</li>
                    <li>Email Address (电子邮件地址)</li>
                  </ul>
                  <span className="block text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-200/60">
                    当您在我们的网站上购物或注册时，我们会收集您的个人信息，例如您的姓名、联系电话、送货/账单地址以及电邮地址。
                  </span>
                </div>
              </div>

              {/* Section 2 */}
              <div className="space-y-3 pt-2">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-xs font-bold font-mono">2</span>
                  <span>How We Use Your Information / 我们如何使用您的信息</span>
                </h2>
                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    We use the collected information primarily to:
                  </p>
                  <ul className="space-y-2.5 pl-4 list-disc text-sm text-slate-600 font-medium">
                    <li>Process and fulfill your orders (including arranging cold-chain or live-water transport). <span className="text-slate-400 font-normal">/ 处理和履行您的订单（包括安排冷链或活水运输）。</span></li>
                    <li>Communicate with you regarding order updates or customer service inquiries. <span className="text-slate-400 font-normal">/ 与您沟通订单状态或售后服务。</span></li>
                    <li>Process payments securely through our designated payment gateways. <span className="text-slate-400 font-normal">/ 通过指定的支付网关安全地处理付款。</span></li>
                  </ul>
                </div>
              </div>

              {/* Section 3 */}
              <div className="space-y-3 pt-2">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-xs font-bold font-mono">3</span>
                  <span>Data Sharing & Third Parties / 数据共享与第三方</span>
                </h2>
                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    We <strong>do not sell, rent, or trade</strong> your personal information to third parties. We only share necessary details (like your name, address, and phone number) with trusted third-party service providers, such as courier/logistics partners, solely for the purpose of delivering your order.
                  </p>
                  <span className="block text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-200/60">
                    我们<strong>绝不会出售、出租或交易</strong>您的个人信息给第三方。我们仅会将必要的详细信息（如姓名、地址和电话）分享给受信任的第三方服务提供商（如物流/快递合作伙伴），其唯一目的是为了将您的订单送达。
                  </span>
                </div>
              </div>

              {/* Section 4 */}
              <div className="space-y-3 pt-2">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-xs font-bold font-mono">4</span>
                  <span>Payment Security / 支付安全</span>
                </h2>
                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    Your payment details (such as credit card numbers or online banking credentials) are processed securely by our authorized payment gateway partners. Our website does not capture or store your full credit card or banking information.
                  </p>
                  <span className="block text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-200/60">
                    您的支付信息（例如信用卡号或网银凭证）将由我们授权的支付网关合作伙伴安全处理。我们的网站不会捕获或存储您的完整信用卡或银行信息。
                  </span>
                </div>
              </div>

              {/* Contact Block */}
              <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 -mx-6 sm:-mx-10 md:-mx-12 p-6 sm:p-8 mt-10">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{isZh ? '如有任何关于隐私政策的疑问，请联系我们：' : 'Any questions? Get in touch with our support team:'}</h4>
                  <p className="text-xs text-slate-500 mt-1">{isZh ? '我们将竭诚为您解答个人数据相关的使用疑问' : 'We will respond to your queries regarding personal data usage.'}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href="https://wa.me/60187682528" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm">
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  <a href="mailto:hangsengraub@gmail.com" className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors shadow-sm">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Support</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-slate-100 pb-6">
                <div className="inline-flex items-center space-x-2 text-sky-600 bg-sky-50 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider mb-3">
                  <FileText className="w-4 h-4" />
                  <span>Agreement of Service</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  Terms of Service
                </h1>
                <p className="text-lg font-bold text-slate-500 mt-1 font-sans">
                  服务条款
                </p>
              </div>

              {/* Intro */}
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700 leading-relaxed font-medium">
                  Welcome to <strong>Raub Hang Seng</strong>. By accessing or using our website, you agree to be bound by these Terms of Service. Please read them carefully before placing an order.
                </p>
                <span className="block text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-3 leading-relaxed">
                  欢迎访问 <strong>劳勿恒生水产 (Raub Hang Seng)</strong>。通过访问或使用我们的网站，即表示您同意接受本服务条款 (Terms of Service) 的约束。在下订单前，请仔细阅读。
                </span>
              </div>

              {/* Section 1 */}
              <div className="space-y-3 pt-4">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-xs font-bold font-mono">1</span>
                  <span>General Conditions / 一般条款</span>
                </h2>
                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    We reserve the right to refuse service to anyone for any reason at any time. You agree not to reproduce, duplicate, copy, sell, or exploit any portion of the Service without express written permission by us.
                  </p>
                  <span className="block text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-200/60">
                    我们保留随时以任何理由拒绝提供服务的权利。未经我们明确书面许可，您同意不复制、出售或利用本服务的任何部分。
                  </span>
                </div>
              </div>

              {/* Section 2 */}
              <div className="space-y-3 pt-2">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-xs font-bold font-mono">2</span>
                  <span>Products & Pricing / 产品与价格</span>
                </h2>
                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    All prices are subject to change without notice. For fresh/frozen fish, the listed weight is the <strong>gross weight before cleaning and scaling</strong>. After processing (removing scales and innards), the actual weight received will be naturally lighter. This is a standard industry practice and shall not be a valid reason for a refund.
                  </p>
                  <span className="block text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-200/60">
                    所有价格如有更改，恕不另行通知。对于生鲜/冷冻鱼类，标示的重量均为<strong>清理去鳞前的毛重</strong>。经过处理（去鳞、去内脏）后，实际收到的重量会自然减轻。这是水产业标准做法，不构成退款或少秤索赔的有效理由。
                  </span>
                </div>
              </div>

              {/* Section 3 */}
              <div className="space-y-3 pt-2">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-xs font-bold font-mono">3</span>
                  <span>Payment / 支付条款</span>
                </h2>
                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    We provide secure checkout via our authorized payment gateways and methods. All orders must be fully paid before we dispatch the goods. We do not store your credit card details on our servers.
                  </p>
                  <span className="block text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-200/60">
                    我们通过授权的支付网关及支付方式提供安全的结账服务。所有订单必须在发货前全额付款。我们的服务器不会存储您的信用卡详细信息。
                  </span>
                </div>
              </div>

              {/* Section 4 */}
              <div className="space-y-3 pt-2">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-xs font-bold font-mono">4</span>
                  <span>Delivery & Receiving Goods / 送货与收货</span>
                </h2>
                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    Due to the perishable nature of our products, the customer must ensure someone is available at the delivery address to receive the order. If the delivery fails because the customer is uncontactable, we will not be held liable for any product spoilage, and no refund will be issued.
                  </p>
                  <span className="block text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-200/60">
                    由于生鲜产品的易腐烂特性，顾客必须确保送货地址有人接收订单。如果因顾客无法联系或不接电话导致配送失败并造成产品变质，我们将不承担任何责任，且不予办理退款或免费补发。
                  </span>
                </div>
              </div>

              {/* Section 5 */}
              <div className="space-y-3 pt-2">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-xs font-bold font-mono">5</span>
                  <span>Changes to Terms of Service / 条款修改</span>
                </h2>
                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    We reserve the right to update, change or replace any part of these Terms of Service by posting updates to our website. It is your responsibility to check our website periodically for changes.
                  </p>
                  <span className="block text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-200/60">
                    我们保留通过在网站上发布更新来修改或替换本服务条款任何部分的权利。您有责任定期检查我们网站的更改。
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RETURN & REFUND POLICY */}
          {activeTab === 'refund' && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-slate-100 pb-6">
                <div className="inline-flex items-center space-x-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider mb-3">
                  <RotateCcw className="w-4 h-4" />
                  <span>Refund Protection</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  Return & Refund Policy
                </h1>
                <p className="text-lg font-bold text-slate-500 mt-1 font-sans">
                  退换货与退款政策
                </p>
              </div>

              {/* Intro */}
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700 leading-relaxed font-medium">
                  At <strong>Raub Hang Seng</strong>, we take pride in delivering high-quality and fresh seafood/freshwater fish to our customers. Due to the perishable nature of our products, we do not accept general returns. However, your satisfaction is our priority, and we have a strict policy in place for damaged or spoiled items.
                </p>
                <span className="block text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-3 leading-relaxed">
                  在劳勿恒生水产，我们致力于为您提供高品质和新鲜的水产。由于生鲜食品的易腐特性，我们不支持无理由退款或退货。但您的满意是我们的首要任务，针对货物受损或质量问题，我们制定了以下保障政策。
                </span>
              </div>

              {/* Section 1 */}
              <div className="space-y-3 pt-4">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-xs font-bold font-mono">1</span>
                  <span>Quality Issues & Claims / 品质问题与索赔</span>
                </h2>
                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    If you receive a product that is spoiled, severely damaged, or of unacceptable quality upon delivery, you are entitled to claim a refund or a replacement.
                  </p>
                  <span className="block text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-200/60">
                    如果您在收到货物时，发现鱼类变质、严重损坏或品质出现问题，您有权申请退款或补发。
                  </span>
                </div>
              </div>

              {/* Section 2 */}
              <div className="space-y-3 pt-2">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-xs font-bold font-mono">2</span>
                  <span>Proof and Time Limit / 索赔凭证与时效</span>
                </h2>
                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed font-semibold text-amber-700 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1.5 flex-shrink-0" />
                    <span>Claims must be submitted within 24 hours / 必须在收到包裹24小时内提出</span>
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    To process your claim, you <strong>must notify us within 24 hours</strong> of receiving the package. Please provide the following to our Customer Service:
                  </p>
                  <ul className="space-y-2 pl-4 list-disc text-sm text-slate-600 font-medium">
                    <li>Clear photos or videos of the affected fish. <span className="text-slate-400 font-normal">/ 受影响鱼类的清晰照片或视频。</span></li>
                    <li>Photos of the packaging and airway bill/receipt. <span className="text-slate-400 font-normal">/ 外包装及快递单/收据的照片。</span></li>
                    <li>Order Number. <span className="text-slate-400 font-normal">/ 您的订单号。</span></li>
                  </ul>
                </div>
              </div>

              {/* Section 3 - Highlight Box */}
              <div className="space-y-3 pt-2">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-xs font-bold font-mono">3</span>
                  <span>Resolution Options / 解决方案选项</span>
                </h2>
                <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-6 space-y-4">
                  <p className="text-sm text-slate-800 leading-relaxed font-bold">
                    Once our team verifies and approves the claim based on the photos provided, you may choose ONE of the following options:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-2xs space-y-2">
                      <div className="flex items-center space-x-2 text-emerald-600 font-extrabold text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Option A: Refund</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        We will process a refund for the exact amount of the affected item.
                      </p>
                      <span className="block text-[11px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                        选项 A (退款)：我们将全额退还受影响鱼类的款项。
                      </span>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-2xs space-y-2">
                      <div className="flex items-center space-x-2 text-amber-600 font-extrabold text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>Option B: Replacement</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        We will send you a new replacement fish. <strong>*A flat shipping and handling fee of RM 20 applies.</strong>
                      </p>
                      <span className="block text-[11px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                        选项 B (补发)：我们将安排补送一条鱼。<strong>*请注意：买家需额外支付 RM 20 运费用于运输。</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4 */}
              <div className="space-y-3 pt-2">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-xs font-bold font-mono">4</span>
                  <span>Non-Refundable Conditions / 不符合退款的情况</span>
                </h2>
                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    Claims will <strong>not</strong> be accepted under the following circumstances:
                  </p>
                  <ul className="space-y-2 pl-4 list-disc text-sm text-slate-600 font-medium">
                    <li>Change of mind after the order has been shipped. <span className="text-slate-400 font-normal">/ 订单发货后改变主意。</span></li>
                    <li>The delivery failed or was delayed because the customer provided an incorrect address or was uncontactable during delivery. <span className="text-slate-400 font-normal">/ 因顾客提供错误地址或配送时联系不上收件人，导致的配送延误与产品变质。</span></li>
                    <li>The product spoiled due to the customer's failure to store it in a freezer/refrigerator immediately upon receiving it. <span className="text-slate-400 font-normal">/ 顾客签收后未及时放入冷冻/冷藏库妥善保存而导致的变质。</span></li>
                    <li>Claims made after 24 hours from the time of delivery. <span className="text-slate-400 font-normal">/ 签收超过 24小时 后才提出的索赔。</span></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Return to shop button at the very bottom */}
          <div className="mt-12 pt-8 border-t border-slate-100 text-center">
            <button
              onClick={onClose}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isZh ? '完成阅读，返回选购' : 'Return to Store'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
