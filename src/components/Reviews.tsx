import { Star, MessageSquare, Quote, Heart } from 'lucide-react';
import { Language } from '../types';
import { REVIEWS } from '../data/products';

interface ReviewsProps {
  language: Language;
}

export default function Reviews({ language }: ReviewsProps) {
  const isZh = language === 'zh';

  return (
    <section id="reviews" className="py-24 rhs-section-alt border-t border-[#c4d5d9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-sky-600">
            {isZh ? '真实顾客好评反馈' : 'Customer Testimonials'}
          </h2>
          <p className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {isZh ? '看看品尝过彭亨河鲜的顾客怎么说' : 'Hear From Our Happy Dining Families'}
          </p>
          <div className="h-1.5 w-16 bg-gradient-to-r from-sky-500 to-blue-600 mx-auto rounded-full" />
          <p className="text-slate-600 text-sm">
            {isZh
              ? '西马各地数千个家庭和高档餐厅的共同选择，高满意度、100%新鲜承诺是我们前进的动力。'
              : 'Our commitment to quality has earned the trust of thousands of homes and restaurants throughout Peninsular Malaysia.'}
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {REVIEWS.map((review) => (
            <div
              key={review.id}
              className="rhs-panel border hover:border-sky-300 p-6 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all group"
            >
              {/* Star Rating & Quote mark */}
              <div className="flex justify-between items-center">
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <Quote className="w-8 h-8 text-[#d4e2e5] group-hover:text-sky-100 transition-colors" />
              </div>

              {/* Review Text */}
              <p className="text-slate-700 text-xs md:text-sm leading-relaxed italic flex-grow">
                "{isZh ? review.commentZh : review.commentEn}"
              </p>

              {/* Customer Info & Product Purchased */}
              <div className="border-t border-[#d6e3e5] pt-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs md:text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                    {review.userName}
                  </h4>
                  <span className="text-[10px] text-slate-400">{review.date}</span>
                </div>

                <div className="bg-[#edf5f4] border border-[#d6e3e5] px-2.5 py-1 rounded-md">
                  <span className="text-[10px] font-bold text-slate-500">
                    🛍️ {isZh ? review.fishPurchasedZh : review.fishPurchasedEn}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Satisfied Metrics Banner */}
        <div className="mt-16 rhs-panel border rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-center justify-around gap-6 text-center shadow-sm">
          <div className="space-y-1">
            <span className="text-3xl md:text-4xl font-black text-[#0a4267] font-mono">10,000+</span>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{isZh ? '西马配送订单' : 'Orders Shipped'}</p>
          </div>
          <div className="h-px w-12 bg-[#d6e3e5] sm:h-12 sm:w-px" />
          <div className="space-y-1">
            <span className="text-3xl md:text-4xl font-black text-[#0a4267] font-mono">99.8%</span>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{isZh ? '好评满意度' : 'Five-Star Reviews'}</p>
          </div>
          <div className="h-px w-12 bg-[#d6e3e5] sm:h-12 sm:w-px" />
          <div className="space-y-1">
            <span className="text-3xl md:text-4xl font-black text-[#0a4267] font-mono">100%</span>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{isZh ? '无沙无泥味保证' : 'No-Mud Taste Promise'}</p>
          </div>
        </div>

      </div>
    </section>
  );
}
