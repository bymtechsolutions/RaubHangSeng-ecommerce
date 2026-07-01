import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, HelpCircle, ChevronDown, ChevronUp, CheckCircle, MessageSquare } from 'lucide-react';
import { Language } from '../types';
import { FAQS } from '../data/products';

interface ContactUsProps {
  language: Language;
}

export default function ContactUs({ language }: ContactUsProps) {
  const isZh = language === 'zh';
  const [openFaq, setOpenFaq] = useState<string | null>('faq-1');

  // Contact Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !message) return;

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
      setTimeout(() => setSuccess(false), 4000);
    }, 800);
  };

  return (
    <section id="contact" className="py-24 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Contact/FAQ Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-sky-600">
            {isZh ? '常见疑问与咨询' : 'Support & Queries'}
          </h2>
          <p className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {isZh ? '联络我们与常见问题解答' : 'Have Questions? Contact Our Fishmasters'}
          </p>
          <div className="h-1.5 w-16 bg-gradient-to-r from-sky-500 to-blue-600 mx-auto rounded-full" />
        </div>

        {/* Dual Grid Layout: Left FAQs (7 Cols), Right Contact/Location (5 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Block: FAQs (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
              <HelpCircle className="w-5 h-5 mr-2 text-sky-500" />
              {isZh ? '常见热点问题解答' : 'Frequently Asked Questions'}
            </h3>

            <div className="space-y-3">
              {FAQS.map((faq) => {
                const isOpen = openFaq === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200"
                  >
                    <button
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full flex items-center justify-between p-4 text-left font-bold text-sm md:text-base text-slate-800 hover:text-sky-600 transition-colors cursor-pointer"
                    >
                      <span>{isZh ? faq.questionZh : faq.questionEn}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="p-4 pt-0 border-t border-slate-200/50 text-xs md:text-sm text-slate-600 leading-relaxed bg-white/50">
                        {isZh ? faq.answerZh : faq.answerEn}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Block: Message Form and Coordinates (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Contact Details Card */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                {isZh ? '彭亨河鱼旗舰店' : 'Pahang River Fish MainHQ'}
              </h3>

              <div className="space-y-3.5 text-xs text-slate-750">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-slate-700">
                    <strong>{isZh ? '河鱼处理集散中心:' : 'Main Depot:'}</strong><br />
                    162, Jln Cheroh - Batu Malim, Kampung Baru Sungai Lui, 27600 Raub District, Pahang
                  </p>
                </div>

                <div className="flex items-center space-x-3 text-slate-705">
                  <Phone className="w-5 h-5 text-sky-500 flex-shrink-0" />
                  <p className="text-slate-700">
                    <strong>{isZh ? '电话 / WhatsApp 客服:' : 'Call / WhatsApp Helpline:'}</strong><br />
                    +60 18-768 2528
                  </p>
                </div>

                <div className="flex items-center space-x-3 text-slate-705">
                  <Mail className="w-5 h-5 text-sky-500 flex-shrink-0" />
                  <p className="text-slate-700">
                    <strong>{isZh ? '电子邮件:' : 'Email Support:'}</strong><br />
                    hangsengraub@gmail.com
                  </p>
                </div>
              </div>

              {/* Static Map indicator */}
              <div className="relative aspect-[16/6] bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-80" />
                <div className="text-center z-10 p-4">
                  <MapPin className="w-6 h-6 text-red-500 mx-auto animate-bounce mb-1" />
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest font-mono">Raub, Pahang</p>
                  <p className="text-[9px] text-slate-500">{isZh ? '彭亨河鱼之家 • 实体集散仓' : 'Home of Authentic Pahang River Fish'}</p>
                </div>
              </div>
            </div>

            {/* Quick Contact Form */}
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-slate-900">
                {isZh ? '提交在线咨询' : 'Send Us a Quick Message'}
              </h3>
              
              <form onSubmit={handleSendMessage} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isZh ? '您的名字 / Your Name' : 'Your name'}
                    required
                    className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isZh ? '电子邮箱 (选填) / Email (Optional)' : 'Your email address'}
                    className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder={isZh ? '请输入您的问题（如大宗餐饮采购、特定的河鱼种类预约、外州配送咨询等）...' : 'Enter your inquiry details (e.g., restaurant wholesale purchase, specific seasonal fish reservation)...'}
                    required
                    className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {success && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>{isZh ? '消息提交成功！客服会在24小时内联系您。' : 'Message received! We will contact you soon.'}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !name || !message}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 disabled:opacity-40 text-white font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isZh ? '发送信息' : 'Submit Inquiry'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
