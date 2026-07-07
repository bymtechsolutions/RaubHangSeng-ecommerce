import { ArrowRight, Fish, Layers3 } from 'lucide-react';
import { CollectionDisplay, Language, Product, ProductCategory } from '../types';
import { resolveMediaUrl } from '../lib/media';

interface CollectionsShowcaseProps {
  language: Language;
  products: Product[];
  collections: CollectionDisplay[];
  onCollectionSelect: (category: ProductCategory) => void;
}

export default function CollectionsShowcase({
  language,
  products,
  collections,
  onCollectionSelect,
}: CollectionsShowcaseProps) {
  const isZh = language === 'zh';

  return (
    <section id="collections" className="py-20 md:py-24 rhs-section-alt border-t border-[#c4d5d9]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[0.78fr_1.22fr] gap-8 lg:gap-12 items-end mb-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#b9d2d8] bg-[#f5fbfa] px-3 py-1.5 text-xs font-bold text-[#0b5874]">
              <Layers3 className="w-3.5 h-3.5" />
              <span>{isZh ? '按系列选购' : 'Shop by collection'}</span>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl font-black leading-tight text-[#0b2638]">
                {isZh ? '先选渔获系列，再挑今天的鲜鱼。' : 'Choose the river-fish family before the catch.'}
              </h2>
              <p className="max-w-xl text-sm md:text-base leading-7 text-[#536c74]">
                {isZh
                  ? '从宴席级野生珍品、日常网箱鲜鱼，到养生汤用品类，每个系列都可在后台配置专属封面图、缩放和裁切位置。'
                  : 'From banquet-grade wild rarities to everyday cage-raised fish and wellness soup cuts, each collection can carry its own tuned storefront image.'}
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-end gap-3 text-sm text-[#536c74]">
            <Fish className="w-5 h-5 text-[#0b5874]" />
            <span>{isZh ? '后台可编辑图片、缩放与裁切焦点' : 'Images, zoom, and crop focus are editable in seller dashboard'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
          {collections.map(collection => {
            const productCount = products.filter(product => product.category === collection.id).length;

            return (
              <button
                type="button"
                key={collection.id}
                onClick={() => onCollectionSelect(collection.id)}
                className="group text-left rounded-2xl overflow-hidden border border-[#bdd5d9] bg-[#f7fbfa] shadow-[0_10px_28px_rgba(10,48,63,0.08)] hover:shadow-[0_18px_42px_rgba(10,48,63,0.14)] transition-all duration-300 hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-[#d9e7e8]"
              >
                <div className="relative aspect-[5/4] overflow-hidden bg-[#0b3447]">
                  <img
                    src={resolveMediaUrl(collection.image)}
                    alt={isZh ? collection.titleZh : collection.titleEn}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500"
                    style={{
                      objectPosition: `${collection.imagePositionX}% ${collection.imagePositionY}%`,
                      transform: `scale(${collection.imageScale})`,
                      transformOrigin: `${collection.imagePositionX}% ${collection.imagePositionY}%`,
                    }}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-[#061f2d]/84 via-[#061f2d]/18 to-transparent" />
                  <div className="absolute left-4 right-4 bottom-4 flex items-end justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-sky-100">
                        {productCount} {isZh ? '款河鱼' : productCount === 1 ? 'fish' : 'fishes'}
                      </span>
                      <h3 className="mt-1 text-xl font-black text-white leading-tight">
                        {isZh ? collection.titleZh : collection.titleEn}
                      </h3>
                    </div>
                    <span className="w-9 h-9 rounded-full bg-white/92 text-[#08344b] flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>

                <div className="p-4 min-h-[126px] flex flex-col justify-between">
                  <p className="text-sm leading-6 text-[#536c74]">
                    {isZh ? collection.descZh : collection.descEn}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#0b5874]">
                    {isZh ? '查看系列' : 'View collection'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
